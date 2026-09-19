import { API_URL, authFetch } from "../utils/api.js";

export async function fetchUserConversations() {
  const res = await authFetch(`${API_URL}/chat/conversations`);
  if (!res.ok) throw new Error("Failed to load conversations");
  const data = await res.json();
  return data.conversations || [];
}

export async function initConversationWithUser(targetUserId) {
  const res = await authFetch(`${API_URL}/chat/conversation`, {
    method: "POST",
    body: JSON.stringify({ targetUserId }),
  });
  if (!res.ok) throw new Error("Could not initialize chat");
  const data = await res.json();
  return data.conversation;
}

export async function fetchConversationMessages(conversationId) {
  const res = await authFetch(`${API_URL}/chat/messages/${conversationId}`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  const data = await res.json();
  return data.messages || [];
}
