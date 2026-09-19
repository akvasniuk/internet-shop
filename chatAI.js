import { authFetch } from "./api.js";
import { API_URL } from "./constants.js";
import { showAlert } from "./toast.js";
import { isTokenExpired } from "./tokenExpiration.js";

const token = localStorage.getItem("accessToken");
const currentUser = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !currentUser || isTokenExpired(token)) {
  showAlert("Please log in to chat with the AI assistant.", "warning");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1200);
}

let activeConversationId = null;

const btnNewChat = document.querySelector("#btnNewChat");
const btnStartPrompt = document.querySelector("#btnStartPrompt");
const aiConversationsContainer = document.querySelector(
  "#aiConversationsContainer",
);
const chatCountBadge = document.querySelector("#chatCountBadge");
const noChatSelectedView = document.querySelector("#noChatSelectedView");
const activeChatView = document.querySelector("#activeChatView");
const activeChatHeaderTitle = document.querySelector("#activeChatHeaderTitle");
const aiMessagesList = document.querySelector("#aiMessagesList");
const aiChatForm = document.querySelector("#aiChatForm");
const aiChatInput = document.querySelector("#aiChatInput");
const btnSubmit = document.querySelector("#btnSubmit");

document.addEventListener("DOMContentLoaded", async () => {
  await loadConversationsList();

  btnNewChat.addEventListener("click", handleCreateNewChat);
  btnStartPrompt.addEventListener("click", handleCreateNewChat);
  aiChatForm.addEventListener("submit", handleSendMessage);
});

async function loadConversationsList() {
  try {
    const res = await authFetch(`${API_URL}/chat/ai/conversations`);

    if (!res.ok) throw new Error("Failed to load conversations");

    const { conversations } = await res.json();
    renderConversationsSidebar(conversations);
  } catch (error) {
    console.error("loadConversationsList Error:", error);
    showAlert(error.message, "danger");
  }
}

async function handleCreateNewChat() {
  try {
    const res = await authFetch(`${API_URL}/chat/ai/conversations`, {
      method: "POST",
      body: JSON.stringify({ title: "New Chat" }),
    });

    if (!res.ok) throw new Error("Failed to create chat");

    const { newChat } = await res.json();
    await loadConversationsList();
    await selectChat(newChat._id, newChat.title);
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

async function selectChat(conversationId, title) {
  activeConversationId = conversationId;

  noChatSelectedView.classList.add("d-none");
  activeChatView.classList.remove("d-none");
  activeChatHeaderTitle.textContent = title || "ElectroBot Chat";

  document.querySelectorAll(".conversation-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === conversationId);
  });

  try {
    const res = await authFetch(
      `${API_URL}/chat/ai/conversations/${conversationId}`,
    );

    if (!res.ok) throw new Error("Failed to load chat history");

    const { conversation } = await res.json();
    aiMessagesList.innerHTML = "";

    if (!conversation.messages || conversation.messages.length === 0) {
      aiMessagesList.innerHTML = `
        <div class="d-flex mb-2 justify-content-start">
          <div class="p-3 rounded-3 bg-white text-dark border shadow-sm" style="max-width: 75%;">
            <small class="d-block fw-bold text-primary mb-1">ElectroBot (AI)</small>
            <span>Hello! 👋 I am ElectroBot. How can I help you with our electronics, delivery, or warranty today?</span>
          </div>
        </div>
      `;
    } else {
      conversation.messages.forEach(renderSingleMessage);
    }
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

async function handleSendMessage(e) {
  e.preventDefault();
  const text = aiChatInput.value.trim();
  if (!text) return;

  aiChatInput.value = "";
  aiChatInput.disabled = true;
  btnSubmit.disabled = true;

  if (
    aiMessagesList.children.length === 1 &&
    aiMessagesList.textContent.includes("Hello! 👋")
  ) {
    aiMessagesList.innerHTML = "";
  }

  renderSingleMessage({
    role: "user",
    text: text,
    createdAt: new Date(),
  });

  const typingIndicator = document.createElement("div");
  typingIndicator.id = "aiTypingIndicator";
  typingIndicator.className =
    "small text-muted fst-italic ps-2 mb-2 d-flex align-items-center gap-2";
  typingIndicator.innerHTML = `
    <span class="spinner-border spinner-border-sm text-primary"></span>
    ElectroBot is thinking...
  `;
  aiMessagesList.appendChild(typingIndicator);
  aiMessagesList.scrollTop = aiMessagesList.scrollHeight;

  try {
    const res = await authFetch(`${API_URL}/chat/ai/message`, {
      method: "POST",
      body: JSON.stringify({
        conversationId: activeConversationId,
        prompt: text,
      }),
    });

    const data = await res.json();
    document.querySelector("#aiTypingIndicator")?.remove();

    if (!res.ok) throw new Error(data.message || "AI response failed");

    if (data.conversationTitle) {
      activeChatHeaderTitle.textContent = data.conversationTitle;
    }

    renderSingleMessage({
      role: "model",
      text: data.reply,
      createdAt: new Date(),
    });

    await loadConversationsList();
  } catch (err) {
    document.querySelector("#aiTypingIndicator").remove();
    renderSingleMessage({
      role: "model",
      text: "⚠️ Sorry, I could not process your request. Please try again.",
      createdAt: new Date(),
    });
  } finally {
    aiChatInput.disabled = false;
    btnSubmit.disabled = false;
    aiChatInput.focus();
  }
}

async function handleDeleteChat(conversationId) {
  if (!confirm("Are you sure you want to delete this chat?")) return;

  try {
    const res = await authFetch(
      `${API_URL}/chat/ai/conversations/${conversationId}`,
      {
        method: "DELETE",
      },
    );

    if (!res.ok) throw new Error("Failed to delete chat");

    if (activeConversationId === conversationId) {
      activeConversationId = null;
      activeChatView.classList.add("d-none");
      noChatSelectedView.classList.remove("d-none");
    }

    await loadConversationsList();
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

function renderConversationsSidebar(chats) {
  chatCountBadge.textContent = chats.length || 0;

  if (!chats || chats.length === 0) {
    aiConversationsContainer.innerHTML = `
      <div class="text-center text-muted py-5 small" id="noChatsPlaceholder">
        <i class="bi bi-chat-square-dots fs-3 d-block mb-2 text-secondary"></i>
        No chats yet. Click <strong>"New AI Chat"</strong> to start!
      </div>
    `;
    return;
  }
  aiConversationsContainer.innerHTML = chats
    .map((chat) => {
      const isActive = chat._id === activeConversationId ? "active" : "";
      return `
        <div class="conversation-item p-3 border-bottom d-flex align-items-center justify-content-between gap-2 ${isActive}" 
             data-id="${chat._id}" 
             data-title="${chat.title}">
          <div class="d-flex align-items-center gap-2 overflow-hidden flex-grow-1">
            <i class="bi bi-chat-text text-primary flex-shrink-0"></i>
            <span class="small fw-semibold text-truncate text-dark">${chat.title}</span>
          </div>
          <button class="btn btn-link text-danger p-0 delete-chat-btn" data-delete-id="${chat._id}" title="Delete Chat">
            <i class="bi bi-trash small"></i>
          </button>
        </div>
      `;
    })
    .join("");

  aiConversationsContainer
    .querySelectorAll(".conversation-item")
    .forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".delete-chat-btn")) return;
        selectChat(el.dataset.id, el.dataset.title);
      });
    });

  aiConversationsContainer
    .querySelectorAll(".delete-chat-btn")
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleDeleteChat(btn.dataset.deleteId);
      });
    });
}

function renderSingleMessage(msg) {
  const isUser = msg.role === "user";
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const html = `
    <div class="d-flex mb-2 ${isUser ? "justify-content-end" : "justify-content-start"}">
      <div class="p-3 rounded-3 shadow-sm ${isUser ? "bg-primary text-white" : "bg-white text-dark border"}" style="max-width: 75%;">
        <div class="d-flex justify-content-between align-items-center gap-3 mb-1">
          <small class="fw-bold ${isUser ? "text-white-50" : "text-primary"}" style="font-size: 0.75rem;">
            ${isUser ? "You" : "ElectroBot (AI)"}
          </small>
          <small class="${isUser ? "text-white-50" : "text-muted"}" style="font-size: 0.65rem;">${time}</small>
        </div>
        <div style="font-size: 0.9rem; word-break: break-word; white-space: pre-wrap;">${msg.text}</div>
      </div>
    </div>
  `;

  aiMessagesList.insertAdjacentHTML("beforeend", html);
  aiMessagesList.scrollTop = aiMessagesList.scrollHeight;
}
