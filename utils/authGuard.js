import { isTokenExpired } from "./tokenExpiration.js";
import { showAlert } from "./toast.js";

export function requireAuth() {
  const token = localStorage.getItem("accessToken");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || isTokenExpired(token) || !user) {
    showAlert("Access denied! Please log in.", "danger");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    setTimeout(() => {
      window.location.href = "../login/login.html";
    }, 1500);
    return null;
  }

  return { token, user };
}
