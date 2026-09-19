import { API_URL } from "../utils/api.js";
import { showAlert } from "../utils/toast.js";
import { isTokenExpired } from "../utils/tokenExpiration.js";
import { fetchProductsByIds } from "./productService.js";

export function initCart(elements) {
  const { badgeEl, listEl, totalPriceEl, openCartBtn, checkoutBtn } = elements;

  const cartMap = new Map();
  let cartProducts = [];

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem("cart");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const [id, count] of parsed) {
          cartMap.set(id, count);
        }
      }
    } catch (e) {
      console.error("Failed to parse cart from storage:", e);
    }
    updateBadge();
  }

  function saveToStorage() {
    const entries = [...cartMap.entries()];
    localStorage.setItem("cart", JSON.stringify(entries));
    updateBadge();
  }

  function updateBadge() {
    if (!badgeEl) return;
    const totalCount = [...cartMap.values()].reduce((acc, qty) => acc + qty, 0);
    badgeEl.textContent = totalCount;
  }

  function renderEmptyCart() {
    if (listEl) {
      listEl.innerHTML = `
        <div class="text-center text-muted py-5" id="emptyCartMessage">
          <i class="bi bi-cart-x fs-1 d-block mb-2"></i>
          <p>Your cart is currently empty.</p>
        </div>
      `;
    }
    if (totalPriceEl) totalPriceEl.textContent = "$0.00";
    if (checkoutBtn) checkoutBtn.disabled = true;
    updateBadge();
  }

  function renderCartList() {
    if (!cartProducts.length) {
      renderEmptyCart();
      return;
    }

    if (listEl) {
      listEl.innerHTML = cartProducts
        .map(
          (item) => `
        <div class="card border-0 shadow-sm mb-2 rounded-3">
          <div class="card-body p-2 d-flex align-items-center gap-2">
            <img
              src="${item.image}"
              alt="${item.title}"
              class="rounded-2 object-fit-contain flex-shrink-0"
              style="width: 48px; height: 48px;"
            />
            <div class="flex-grow-1 overflow-hidden" style="min-width: 0;">
              <h6 class="mb-0 text-truncate small fw-semibold" title="${item.title}">
                ${item.title}
              </h6>
              <span class="text-primary fw-bold small">$${item.price}</span>
            </div>
            <div class="d-flex align-items-center bg-light border rounded-pill px-1 flex-shrink-0">
              <button
                class="btn minus btn-sm p-0 px-1 border-0 text-muted"
                data-id="${item._id}"
                data-stock="${item.stock}"
                data-delta="-1"
              >
                <i class="bi bi-dash"></i>
              </button>
              <span class="px-1 small fw-bold text-dark" style="min-width: 14px; text-align: center;">
                ${item.quantity}
              </span>
              <button
                class="btn plus btn-sm p-0 px-1 border-0 text-muted"
                data-id="${item._id}"
                data-stock="${item.stock}"
                data-delta="1"
              >
                <i class="bi bi-plus"></i>
              </button>
            </div>
            <button
              class="btn remove btn-sm text-danger border-0 p-1 flex-shrink-0"
              data-id="${item._id}"
              title="Remove"
            >
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      `,
        )
        .join("");
    }

    const total = cartProducts.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    if (totalPriceEl) {
      totalPriceEl.textContent = `$${total.toFixed(2)}`;
    }
    if (checkoutBtn) checkoutBtn.disabled = false;
  }

  function addItem(productId, stock) {
    const currentQty = cartMap.get(productId) || 0;

    if (currentQty + 1 > stock) {
      showAlert(`You reached the maximum limit (${stock} in stock)`, "warning");
      return;
    }

    cartMap.set(productId, currentQty + 1);
    saveToStorage();
    showAlert("Added 1 item(s) to cart!", "success", 1000);
  }

  function updateQuantity(productId, delta, stock) {
    const currentQty = cartMap.get(productId) || 0;
    const newQty = currentQty + delta;

    if (newQty > stock) {
      showAlert(`You reached the maximum limit (${stock} in stock)`, "warning");
      return;
    }

    if (newQty < 1) {
      removeItem(productId);
      return;
    }

    cartMap.set(productId, newQty);
    saveToStorage();

    cartProducts = cartProducts.map((p) =>
      p._id === productId ? { ...p, quantity: newQty } : p,
    );
    renderCartList();
  }

  function removeItem(productId) {
    cartMap.delete(productId);
    saveToStorage();

    cartProducts = cartProducts.filter((p) => p._id !== productId);

    if (!cartMap.size) {
      renderEmptyCart();
      return;
    }

    renderCartList();
  }

  async function handleOpenCart() {
    const ids = [...cartMap.keys()];

    if (!ids.length) {
      renderEmptyCart();
      return;
    }

    const fetchedItems = await fetchProductsByIds(ids);

    cartProducts = fetchedItems.map((prod) => ({
      ...prod,
      quantity: cartMap.get(prod._id) || 1,
    }));

    renderCartList();
  }

  openCartBtn?.addEventListener("click", handleOpenCart);

  listEl?.addEventListener("click", (e) => {
    const plusBtn = e.target.closest(".btn.plus");
    if (plusBtn) {
      updateQuantity(
        plusBtn.dataset.id,
        parseInt(plusBtn.dataset.delta, 10),
        Number(plusBtn.dataset.stock),
      );
      return;
    }

    const minusBtn = e.target.closest(".btn.minus");
    if (minusBtn) {
      updateQuantity(
        minusBtn.dataset.id,
        parseInt(minusBtn.dataset.delta, 10),
        Number(minusBtn.dataset.stock),
      );
      return;
    }

    const removeBtn = e.target.closest(".btn.remove");
    if (removeBtn) {
      removeItem(removeBtn.dataset.id);
    }
  });

  checkoutBtn?.addEventListener("click", () => {
    const token = localStorage.getItem("accessToken");
    if (!token || isTokenExpired(token)) {
      const shouldLogin = confirm(
        "You need to log in to place an order. Go to the login page?",
      );
      if (shouldLogin) {
        window.location.href = "login/login.html";
      }
      return;
    }
    window.location.href = "checkout/checkout.html";
  });

  loadFromStorage();

  return {
    addItem,
    updateQuantity,
    removeItem,
    getCartMap: () => cartMap,
  };
}
