import { io } from "https://cdn.socket.io/4.8.3/socket.io.esm.min.js";

import { API_URL } from "./constants.js";
import { showAlert } from "./toast.js";
import { authFetch } from "./api.js";
import { isTokenExpired } from "./tokenExpiration.js";

const token = localStorage.getItem("accessToken");
const currentUser = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !currentUser || isTokenExpired(token)) {
  showAlert("Please log in to access the support chat.", "warning");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1500);
}

const isAdmin = currentUser.role === "ADMIN";

let activeConversationId = null;

const onlineAdminsContainer = document.querySelector("#onlineAdminsList");
const conversationsContainer = document.querySelector(
  "#conversationsListContainer",
);
const conversationCountBadge = document.querySelector("#conversationCount");
const noChatSelectedScreen = document.querySelector("#noChatSelectedScreen");
const activeChatScreen = document.querySelector("#activeChatScreen");
const chatMessagesList = document.querySelector("#chatMessagesList");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const currentChatAvatar = document.querySelector("#currentChatAvatar");
const currentChatUserName = document.querySelector("#currentChatUserName");

const socket = io(API_URL, {
  auth: {
    token: token,
  },
});

socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});

socket.on("online_admins_updated", (admins) => {
  renderOnlineAdmins(admins);
});

socket.on("receive_message", (message) => {
  if (message.conversationId === activeConversationId) {
    renderMessage(message);
  }

  loadUserConversations();
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadUserConversations();
  setupFormListener();
});

async function loadUserConversations() {
  try {
    const res = await authFetch(`${API_URL}/chat/conversations`);

    if (!res.ok) throw new Error("Failed to load conversations");

    const { conversations } = await res.json();
    renderConversationsList(conversations);
  } catch (error) {
    showAlert(error.message, "danger");
    console.error("Error loading conversations:", error);
  }
}

async function openChatWithUser(
  targetUserId,
  targetUserName = "Administrator",
) {
  try {
    const res = await authFetch(`${API_URL}/chat/conversation`, {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    });

    if (!res.ok) throw new Error("Could not initialize chat");

    const { conversation } = await res.json();
    await selectConversation(conversation._id, targetUserName);
    await loadUserConversations();
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

async function selectConversation(conversationId, interlocutorName) {
  if (activeConversationId) {
    socket.emit("leave_conversation", activeConversationId);
  }

  activeConversationId = conversationId;
  socket.emit("join_conversation", activeConversationId);

  noChatSelectedScreen.classList.add("d-none");
  activeChatScreen.classList.remove("d-none");

  currentChatUserName.textContent = interlocutorName;
  currentChatAvatar.textContent = (interlocutorName[0] || "A").toUpperCase();

  document.querySelectorAll(".conversation-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === conversationId);
  });

  await loadMessagesHistory(conversationId);
}

async function loadMessagesHistory(conversationId) {
  try {
    const res = await authFetch(`${API_URL}/chat/messages/${conversationId}`);

    if (!res.ok) throw new Error("Failed to fetch messages");

    const { messages } = await res.json();
    chatMessagesList.innerHTML = "";

    if (messages.length === 0) {
      chatMessagesList.innerHTML = `
        <div class="text-center text-muted my-auto py-4">
          <i class="bi bi-chat-dots fs-2 d-block mb-1"></i>
          <span class="small">No messages here yet. Say hello!</span>
        </div>
      `;
    } else {
      messages.forEach(renderMessage);
    }
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

function setupFormListener() {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();

    if (!text || !activeConversationId) return;

    socket.emit("send_message", {
      conversationId: activeConversationId,
      text,
    });

    chatInput.value = "";
    chatInput.focus();
  });
}

function renderMessage(msg) {
  const emptyPlaceholder = chatMessagesList.querySelector(".text-center");
  if (emptyPlaceholder) emptyPlaceholder.remove();

  const isMine =
    msg.sender?._id === currentUser._id || msg.sender === currentUser._id;
  const senderName = isMine ? "You" : msg.sender?.firstname || "Support";
  const time = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const msgHtml = `
    <div class="d-flex mb-2 ${isMine ? "justify-content-end" : "justify-content-start"}">
      <div class="p-2 px-3 rounded-3 shadow-sm ${isMine ? "bg-primary text-white" : "bg-white text-dark border"}" style="max-width: 75%;">
        <div class="d-flex justify-content-between align-items-center gap-3 mb-1">
          <small class="fw-bold ${isMine ? "text-white-50" : "text-muted"}" style="font-size: 0.7rem;">${senderName}</small>
          <small class="${isMine ? "text-white-50" : "text-muted"}" style="font-size: 0.65rem;">${time}</small>
        </div>
        <div style="font-size: 0.9rem; word-break: break-word;">${msg.text}</div>
      </div>
    </div>
  `;

  chatMessagesList.insertAdjacentHTML("beforeend", msgHtml);
  chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
}

function renderOnlineAdmins(admins) {
  if (!admins || admins.length === 0) {
    onlineAdminsContainer.innerHTML = `<small class="text-muted fst-italic py-1">No admins currently online</small>`;
    return;
  }

  onlineAdminsContainer.innerHTML = admins
    .filter((admin) => admin._id !== currentUser._id)
    .map(
      (admin) => `
      <button 
        class="btn btn-outline-light border text-dark d-flex align-items-center gap-2 py-1 px-2 rounded-pill flex-shrink-0 admin-pill-btn" 
        data-admin-id="${admin._id}"
        data-admin-name="${admin.firstname} ${admin.lastname || ""}"
      >
        <div class="position-relative">
          <span class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold small" style="width: 26px; height: 26px; font-size: 0.75rem;">
            ${(admin.firstname[0] || "A").toUpperCase()}
          </span>
          <span class="position-absolute admin-status-dot"></span>
        </div>
        <span class="small fw-semibold text-truncate" style="max-width: 90px;">${admin.firstname}</span>
      </button>
    `,
    )
    .join("");

  onlineAdminsContainer.querySelectorAll(".admin-pill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openChatWithUser(btn.dataset.adminId, btn.dataset.adminName);
    });
  });
}

function renderConversationsList(conversations) {
  conversationCountBadge.textContent = conversations.length || 0;

  if (!conversations || conversations.length === 0) {
    conversationsContainer.innerHTML = `
      <div class="text-center text-muted py-5 small" id="noConversationsText">
        <i class="bi ${isAdmin ? "bi-inbox" : "bi-chat-square-dots"} fs-3 d-block mb-2 text-secondary"></i>
        ${
          isAdmin
            ? "No incoming client inquiries yet."
            : "No previous conversations yet. Select an admin above to start chatting!"
        }
      </div>
    `;
    return;
  }

  if (isAdmin) {
    document.querySelector("#supportAdmins").textContent = "Online Colleagues";
    document.querySelector("#chooseAdmin").textContent =
      "Select a client inquiry from the left panel to start assisting them.";
  }

  conversationsContainer.innerHTML = conversations
    .map((conv) => {
      const interlocutor =
        currentUser.role === "ADMIN" ? conv.client : conv.admin;
      const interlocutorName = interlocutor
        ? `${interlocutor.firstname || "User"} ${interlocutor.lastname || ""}`.trim()
        : "Administrator";

      const isActive = conv._id === activeConversationId ? "active" : "";

      return `
      <div class="conversation-item p-3 border-bottom d-flex align-items-center gap-3 ${isActive}" data-id="${conv._id}" data-name="${interlocutorName}">
        <div class="bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center fw-bold text-secondary flex-shrink-0" style="width: 40px; height: 40px;">
          ${(interlocutorName[0] || "U").toUpperCase()}
        </div>
        <div class="flex-grow-1 overflow-hidden">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <h6 class="mb-0 text-truncate small fw-bold text-dark">${interlocutorName}</h6>
          </div>
          <p class="mb-0 text-truncate text-secondary small" style="font-size: 0.8rem;">
            ${conv.lastMessage || "No messages yet"}
          </p>
        </div>
      </div>
    `;
    })
    .join("");

  conversationsContainer
    .querySelectorAll(".conversation-item")
    .forEach((item) => {
      item.addEventListener("click", () => {
        selectConversation(item.dataset.id, item.dataset.name);
      });
    });
}
