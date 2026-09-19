import { API_URL, authFetch, handleForceLogout } from "../utils/api.js";
import { isTokenExpired } from "../utils/tokenExpiration.js";
import { showAlert } from "../utils/toast.js";

export function initAuthNav(authNavElement) {
  if (!authNavElement) return;

  const token = localStorage.getItem("accessToken");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (token && user) {
    if (isTokenExpired(token)) {
      showAlert("Access denied! Please log in.", "danger");
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");

      setTimeout(() => {
        window.location.href = "login/login.html";
      }, 1500);
      return;
    }

    const userName = user.firstname || user.email || "User";

    authNavElement.innerHTML = `
      <div class="dropdown">
        <button
          class="btn btn-outline-light dropdown-toggle d-flex align-items-center gap-2"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <i class="bi bi-person-circle"></i>
          <span>${userName}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-sm">
          <li>
            <a class="dropdown-item d-flex align-items-center gap-2" href="profile/profile.html">
              <i class="bi bi-pencil-square text-primary"></i> Edit Profile
            </a>
          </li>
          <li>
            <a class="dropdown-item d-flex align-items-center gap-2" href="orders/orders.html">
              <i class="bi bi-box-seam text-info"></i> My Orders
            </a>
          </li>
          <li>
            <a class="dropdown-item d-flex align-items-center gap-2" href="chat/chat.html">
              <i class="bi bi-chat-dots text-secondary"></i> Support Chat
            </a>
          </li>
          <li>
            <a class="dropdown-item d-flex align-items-center gap-2" href="chatAI/chatAI.html">
              <i class="bi bi-robot text-primary"></i> AI Assistant
            </a>
          </li>
          <li>
            <a class="dropdown-item d-flex align-items-center gap-2" href="checkout/checkout.html">
              <i class="bi bi-credit-card text-success"></i> Checkout
            </a>
          </li>
          ${
            user.role === "ADMIN"
              ? `
              <li id="adminProductLink">
                <a class="dropdown-item d-flex align-items-center gap-2" href="admin-products/admin-products.html">
                  <i class="bi bi-sliders text-warning"></i> Manage Products
                </a>
              </li>`
              : ""
          }
          <li><hr class="dropdown-divider"></li>
          <li>
            <button class="dropdown-item text-danger d-flex align-items-center gap-2" id="logoutBtn">
              <i class="bi bi-box-arrow-right"></i> Log Out
            </button>
          </li>
        </ul>
      </div>
    `;

    const logoutBtn = authNavElement.querySelector("#logoutBtn");
    logoutBtn?.addEventListener("click", async () => {
      try {
        const url = `${API_URL}/auth/logout/${user._id}`;
        const response = await authFetch(url, { method: "POST" });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.message) {
          throw new Error("Something went wrong");
        }
      } catch (err) {
        showAlert(err.message, "danger");
        console.error("Logout error:", err);
      } finally {
        handleForceLogout();
      }
    });
    return;
  }

  authNavElement.innerHTML = `
    <a href="login/login.html" class="btn btn-outline-light d-flex align-items-center gap-1">
      <i class="bi bi-box-arrow-in-right"></i>
      <span>Sign In</span>
    </a>
    <a href="register/register.html" class="btn btn-primary d-flex align-items-center gap-1">
      <i class="bi bi-person-plus"></i>
      <span>Register</span>
    </a>
  `;
}
