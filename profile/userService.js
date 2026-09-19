import { API_URL, authFetch } from "../utils/api.js";

export async function updateProfile(userId, { firstname, lastname }) {
  const response = await authFetch(`${API_URL}/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ firstname, lastname }),
  });
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  return response.json();
}

export async function changePassword(userId, { password, newPassword }) {
  const response = await authFetch(`${API_URL}/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password, newPassword }),
  });
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  return response.json();
}
