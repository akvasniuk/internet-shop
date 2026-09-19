import { API_URL, authFetch } from "../utils/api.js";

export async function fetchAiConversations() {
  const res = await authFetch(`${API_URL}/chat/ai/conversations`);
  if (!res.ok) throw new Error("Failed to load conversations");
  const data = await res.json();
  return data.conversations || [];
}

export async function createAiConversation(title = "New Chat") {
  const res = await authFetch(`${API_URL}/chat/ai/conversations`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to create chat");
  const data = await res.json();
  return data.newChat;
}

export async function fetchAiConversationById(conversationId) {
  const res = await authFetch(
    `${API_URL}/chat/ai/conversations/${conversationId}`,
  );
  if (!res.ok) throw new Error("Failed to load chat history");
  const data = await res.json();
  return data.conversation;
}

export async function sendAiChatMessage(conversationId, prompt) {
  const res = await authFetch(`${API_URL}/chat/ai/message`, {
    method: "POST",
    body: JSON.stringify({ conversationId, prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "AI response failed");
  return data;
}

export async function deleteAiConversation(conversationId) {
  const res = await authFetch(
    `${API_URL}/chat/ai/conversations/${conversationId}`,
    {
      method: "DELETE",
    },
  );
  if (!res.ok) throw new Error("Failed to delete chat");
  return res.json();
}
