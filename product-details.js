import { authFetch } from "./api.js";
import { API_URL } from "./constants.js";
import { showAlert } from "./toast.js";
import { isTokenExpired } from "./tokenExpiration.js";

let currentProduct = null;
const cartMap = new Map();
let cart = [];

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

if (!productId) {
  window.location.href = "index.html";
}

const cartBadgeElement = document.querySelector("#cartBadge");
const openCartBtn = document.querySelector("#openCart");
const cartItemsListElement = document.querySelector("#cartItemsList");
const cartTotalPriceElement = document.querySelector("#cartTotalPrice");
const checkoutBtn = document.querySelector("#checkoutBtn");

document.addEventListener("DOMContentLoaded", async () => {
  initCart();
  setupCartListeners();
  await loadProductDetails(productId);
  setupProductEventListeners();
});

async function loadProductDetails(id) {
  try {
    const res = await fetch(`${API_URL}/products/${id}`);
    if (!res.ok) throw new Error("Product not found");

    const result = await res.json();
    currentProduct = result.product || result.data || result;

    renderProductDetails(currentProduct);
  } catch (error) {
    showAlert(error.message || "Failed to load product details", "danger");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  }
}

function renderProductDetails(prod) {
  document.title = `${prod.title} | ElectroShop`;

  document.querySelector("#productBreadcrumbCategory").textContent =
    prod.category || "General";
  document.querySelector("#productBreadcrumbTitle").textContent = prod.title;

  document.querySelector("#productMainImage").src = prod.image;
  document.querySelector("#productMainImage").alt = prod.title;
  document.querySelector("#productCategoryBadge").textContent =
    prod.category || "Category";
  document.querySelector("#productTitle").textContent = prod.title;
  document.querySelector("#productBrand").textContent = prod.brand;
  document.querySelector("#productPrice").textContent =
    `$${Number(prod.price).toFixed(2)}`;
  document.querySelector("#productStock").textContent = prod.stock ?? 0;
  document.querySelector("#productFullDescription").textContent =
    prod.description || "No description provided.";

  const statusBadge = document.querySelector("#productStatusBadge");
  statusBadge.textContent = prod.availabilityStatus || "In Stock";
  statusBadge.className = `badge ${
    prod.availabilityStatus === "In Stock"
      ? "bg-success"
      : prod.availabilityStatus === "Low Stock"
        ? "bg-warning text-dark"
        : "bg-danger"
  }`;

  const addToCartBtn = document.querySelector("#addToCartBtn");
  const qtyInput = document.querySelector("#productQuantityInput");
  const maxStock = Number(prod.stock) || 0;

  if (prod.availabilityStatus === "Out of Stock" || maxStock === 0) {
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = "Out of Stock";
    qtyInput.disabled = true;
    qtyInput.value = 0;
  } else {
    qtyInput.max = maxStock;
  }

  renderRating(prod.rating ?? 5, prod.reviews?.length || 0);
  renderReviews(prod.reviews || []);
}

function renderRating(rating, reviewsCount) {
  const ratingVal = Number(rating) || 0;
  document.querySelector("#productRatingValue").textContent = ratingVal.toFixed(1);
  const reviewsCountStr = reviewsCount > 0 ? `${reviewsCount} reviews` : "offline review";
  document.querySelector("#productReviewsCount").textContent = `(${reviewsCountStr})`;
  document.querySelector("#reviewsTabCount").textContent = reviewsCount;

  const starsContainer = document.querySelector("#productRatingStars");
  let starsHtml = "";

  for (let i = 1; i <= 5; i++) {
    if (ratingVal >= i) {
      starsHtml += `<i class="bi bi-star-fill text-warning"></i>`;
    } else if (ratingVal >= i - 0.5) {
      starsHtml += `<i class="bi bi-star-half text-warning"></i>`;
    } else {
      starsHtml += `<i class="bi bi-star text-warning"></i>`;
    }
  }

  starsContainer.innerHTML = starsHtml;
}

function renderReviews(reviews) {
  const container = document.querySelector("#reviewsListContainer");

  if (!reviews || reviews.length === 0) {
    container.innerHTML = `<p class="text-muted small">No reviews yet. Be the first to leave one!</p>`;
    return;
  }

  container.innerHTML = reviews
    .map((rev) => {
      const date = rev.createdAt
        ? new Date(rev.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "Recent";

      let stars = "";
      for (let i = 1; i <= 5; i++) {
        stars += `<i class="bi ${i <= rev.rating ? "bi-star-fill text-warning" : "bi-star text-muted"} small"></i>`;
      }

      return `
      <div class="border-bottom pb-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="fw-semibold small text-dark">${rev.username || "Customer"}</span>
          <span class="text-muted small">${date}</span>
        </div>
        <div class="mb-2">${stars}</div>
        <p class="mb-0 text-secondary small">${rev.comment}</p>
      </div>
    `;
    })
    .join("");
}

function setupProductEventListeners() {
  document.querySelector("#addToCartBtn").addEventListener("click", () => {
    if (!currentProduct) return;
    const qty = Number(document.querySelector("#productQuantityInput").value) || 1;
    addItemToCart(currentProduct._id, currentProduct.stock, qty);
  });

  const reviewForm = document.querySelector("#reviewForm");
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("accessToken");

    if (!user || !token || isTokenExpired(token)) {
      showAlert("Please log in to leave a review.", "warning");
      return;
    }

    const commentInput = document.querySelector("#reviewComment");
    const comment = commentInput.value.trim();
    const rating = Number(document.querySelector("#reviewRating").value);

    if (comment.length < 5) {
      commentInput.classList.add("is-invalid");
      return;
    }
    commentInput.classList.remove("is-invalid");

    const payload = {
      rating,
      comment,
      username: `${user.firstname || "User"} ${user.lastname || ""}`.trim(),
    };

    try {
      const res = await authFetch(`${API_URL}/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit review");
      }

      showAlert("Thank you! Your review has been added.", "success");
      reviewForm.reset();
      await loadProductDetails(productId);
    } catch (error) {
      showAlert(error.message, "danger");
    }
  });
}

function initCart() {
  const stored = JSON.parse(localStorage.getItem("cart")) || [];
  cartMap.clear();
  for (const [id, count] of stored) {
    cartMap.set(id, count);
  }
  updateBadge();
}

function updateBadge() {
  if (!cartBadgeElement) return;
  const count = [...cartMap.values()].reduce((sum, qty) => sum + qty, 0);
  cartBadgeElement.textContent = count;
}

function addItemToCart(prodId, stock = Infinity, quantityToAdd = 1) {
  const currentQty = cartMap.get(prodId) || 0;
  const maxStock = Number(stock);

  if (currentQty + quantityToAdd > maxStock) {
    showAlert(`You reached the maximum limit (${maxStock} in stock)`, "warning");
    return;
  }

  cartMap.set(prodId, currentQty + quantityToAdd);
  localStorage.setItem("cart", JSON.stringify([...cartMap]));
  updateBadge();
  showAlert(`Added ${quantityToAdd} item(s) to cart!`, "success");
}

async function fetchCartItems() {
  const entries = [...cartMap];
  if (!entries.length) return [];

  const promises = entries.map(([id]) => fetch(`${API_URL}/products/${id}`));
  const responses = await Promise.all(promises);
  const data = await Promise.all(responses.map((r) => r.json()));
  return data.map((res) => res.product || res.data || res);
}

function renderEmptyCart() {
  if (!cartItemsListElement) return;
  cartItemsListElement.innerHTML = `
    <div class="text-center text-muted py-5">
      <i class="bi bi-cart-x fs-1 d-block mb-2"></i>
      <p class="mb-0">Your cart is currently empty.</p>
    </div>`;
  if (cartTotalPriceElement) cartTotalPriceElement.textContent = "$0.00";
  if (checkoutBtn) checkoutBtn.disabled = true;
}

function renderCartItems(items) {
  if (!cartItemsListElement) return;
  cartItemsListElement.innerHTML = items
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
          <span class="text-primary fw-bold small">$${Number(item.price).toFixed(2)}</span>
        </div>

        <div class="d-flex align-items-center bg-light border rounded-pill px-1 flex-shrink-0">
          <button class="btn minus btn-sm p-0 px-1 border-0 text-muted" data-id="${item._id}" data-stock="${item.stock}" data-delta="-1">
            <i class="bi bi-dash"></i>
          </button>
          <span class="px-1 small fw-bold text-dark" style="min-width: 14px; text-align: center;">
            ${item.quantity}
          </span>
          <button class="btn plus btn-sm p-0 px-1 border-0 text-muted" data-id="${item._id}" data-stock="${item.stock}" data-delta="1">
            <i class="bi bi-plus"></i>
          </button>
        </div>

        <button class="btn remove btn-sm text-danger border-0 p-1 flex-shrink-0" data-id="${item._id}" title="Remove">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    </div>
  `
    )
    .join("");

  if (checkoutBtn) checkoutBtn.disabled = false;
}

function updateQuantity(itemId, delta, stock) {
  const currentQty = cartMap.get(itemId) || 0;
  const newQty = currentQty + delta;
  const maxStock = Number(stock);

  if (delta > 0 && newQty > maxStock) {
    showAlert(`You reached the maximum limit (${maxStock} in stock)`, "warning");
    return;
  }

  if (newQty < 1) {
    cartMap.delete(itemId);
  } else {
    cartMap.set(itemId, newQty);
  }

  if (cartMap.size === 0) {
    cart = [];
    renderEmptyCart();
    updateBadge();
    localStorage.removeItem("cart");
    return;
  }

  if (newQty < 1) {
    cart = cart.filter((i) => i._id !== itemId);
  } else {
    cart = cart.map((i) => (i._id === itemId ? { ...i, quantity: newQty } : i));
  }

  updateBadge();
  renderCartItems(cart);

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (cartTotalPriceElement) cartTotalPriceElement.textContent = `$${total.toFixed(2)}`;
  localStorage.setItem("cart", JSON.stringify([...cartMap]));
}

function removeItem(itemId) {
  cartMap.delete(itemId);
  if (cartMap.size === 0) {
    cart = [];
    renderEmptyCart();
    updateBadge();
    localStorage.removeItem("cart");
    return;
  }

  cart = cart.filter((i) => i._id !== itemId);
  updateBadge();
  renderCartItems(cart);

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (cartTotalPriceElement) cartTotalPriceElement.textContent = `$${total.toFixed(2)}`;
  localStorage.setItem("cart", JSON.stringify([...cartMap]));
}

function setupCartListeners() {
  openCartBtn.addEventListener("click", async () => {
    if (cartMap.size === 0) {
      renderEmptyCart();
      return;
    }

    const products = await fetchCartItems();
    cart = products.map((prod) => ({
      ...prod,
      quantity: cartMap.get(prod._id) || 1,
    }));

    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (cartTotalPriceElement) cartTotalPriceElement.textContent = `$${total.toFixed(2)}`;
    renderCartItems(cart);
  });

  cartItemsListElement.addEventListener("click", (e) => {
    const plusBtn = e.target.closest(".btn.plus");
    if (plusBtn) {
      updateQuantity(plusBtn.dataset.id, 1, plusBtn.dataset.stock);
      return;
    }

    const minusBtn = e.target.closest(".btn.minus");
    if (minusBtn) {
      updateQuantity(minusBtn.dataset.id, -1, minusBtn.dataset.stock);
      return;
    }

    const removeBtn = e.target.closest(".btn.remove");
    if (removeBtn) {
      removeItem(removeBtn.dataset.id);
    }
  });

  checkoutBtn.addEventListener("click", () => {
    const token = localStorage.getItem("accessToken");
    if (!token || isTokenExpired(token)) {
      if (confirm("You need to log in to place an order. Go to the login page?")) {
        window.location.href = "login.html";
      }
      return;
    }
    window.location.href = "checkout.html";
  });
}