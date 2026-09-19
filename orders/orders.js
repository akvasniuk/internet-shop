import { requireAuth } from "../utils/authGuard.js";
import { fetchUserOrders } from "./orderService.js";
import { initAuthNav } from "../components/authNav.js";
import { showAlert } from "../utils/toast.js";

const container = document.querySelector("#ordersContainer");
const countBadge = document.querySelector("#ordersCountBadge");

function renderOrders(orders) {
  if (!container) return;

  container.innerHTML = orders
    .map((order) => {
      const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const itemsHtml = order.items
        .map(
          ({ product, quantity }) => `
          <div class="d-flex align-items-center gap-3 py-2 border-bottom">
            <img 
              src="${product.image}" 
              class="rounded border object-fit-contain flex-shrink-0" 
              style="width: 48px; height: 48px;" 
            />
            <div class="flex-grow-1 min-w-0">
              <h6 class="mb-0 text-truncate small fw-semibold">${product.title}</h6>
              <span class="text-muted small">${quantity} pcs. × $${product.price}</span>
            </div>
            <span class="fw-bold small">$${(quantity * product.price).toFixed(2)}</span>
          </div>
        `,
        )
        .join("");

      return `
        <div class="card border-0 shadow-sm rounded-3 mb-3">
          <div class="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <span class="fw-bold me-2">№ ${order._id.slice(-6).toUpperCase()}</span>
              <small class="text-muted">${orderDate}</small>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="fs-5 fw-bold text-dark ms-2">$${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-7 border-end-md">
                <h6 class="text-muted small text-uppercase fw-semibold mb-2">Goods</h6>
                ${itemsHtml}
              </div>

              <div class="col-md-5">
                <h6 class="text-muted small text-uppercase fw-semibold mb-2">Recipient and delivery</h6>
                <p class="small mb-1">
                  <strong>${order.shippingAddress.firstname} ${order.shippingAddress.lastname}</strong>
                </p>
                <p class="small text-muted mb-1">
                  <i class="bi bi-telephone me-1"></i>${order.shippingAddress.phone}
                </p>
                <p class="small text-muted mb-1">
                  <i class="bi bi-geo-alt me-1"></i>${order.shippingAddress.city}, ${order.shippingAddress.address}
                </p>
                <p class="small text-muted mb-0">
                  <i class="bi bi-credit-card me-1"></i>Payment: ${
                    order.paymentMethod === "card" ? "Card" : "Upon receipt"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadOrders(userId) {
  try {
    const orders = await fetchUserOrders(userId);

    if (!orders || orders.length === 0) {
      if (container) {
        container.innerHTML = `
          <div class="card border-0 shadow-sm rounded-3 text-center py-5">
            <i class="bi bi-bag-x display-3 text-muted mb-3"></i>
            <h5>You don't have any orders yet</h5>
            <p class="text-muted small">Browse the catalog and choose something for yourself.</p>
            <div>
              <a href="../index.html" class="btn btn-primary btn-sm px-4">Start shopping</a>
            </div>
          </div>
        `;
      }
      if (countBadge) countBadge.textContent = "0 orders";
      return;
    }

    if (countBadge) countBadge.textContent = `${orders.length} orders`;
    renderOrders(orders);
  } catch (error) {
    console.error(error);
    showAlert("Error loading the order list", "danger");
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger" role="alert">
          Error loading the order list: ${error.message}
        </div>
      `;
    }
  }
}

async function init() {
  const auth = requireAuth();
  if (!auth) {
    return;
  }

  initAuthNav(document.querySelector("#authNav"));
  await loadOrders(auth.user._id);
}

init();