import { API_URL, authFetch } from "../utils/api.js";

export async function fetchUserOrders(userId) {
  const response = await authFetch(`${API_URL}/orders/${userId}`);
  if (!response.ok) throw new Error(`Server error ${response.status}`);
  const data = await response.json();
  return data.orders || [];
}

export async function createOrder(userId, orderData) {
  const response = await authFetch(`${API_URL}/orders/${userId}`, {
    method: "POST",
    body: JSON.stringify(orderData),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = Array.isArray(data.errors)
      ? data.errors.join(", ")
      : data.message || "Failed to place order";
    throw new Error(errorMessage);
  }

  return data;
}
