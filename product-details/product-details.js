import {
  fetchProductById,
  createProductReview,
} from "../components/productService.js";
import { initCart } from "../components/cartManager.js";
import { initAuthNav } from "../components/authNav.js";
import { showAlert } from "../utils/toast.js";
import { isTokenExpired } from "../utils/tokenExpiration.js";

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

if (!productId) {
  window.location.href = "../index.html";
}

let currentProduct = null;

initAuthNav(document.querySelector("#authNav"));

const cart = initCart({
  badgeEl: document.querySelector("#cartBadge"),
  listEl: document.querySelector("#cartItemsList"),
  totalPriceEl: document.querySelector("#cartTotalPrice"),
  openCartBtn: document.querySelector("#openCart"),
  checkoutBtn: document.querySelector("#checkoutBtn"),
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadProduct(productId);
  setupEventListeners();
});

async function loadProduct(id) {
  try {
    currentProduct = await fetchProductById(id);
    renderProductDetails(currentProduct);
  } catch (error) {
    showAlert(error.message || "Failed to load product details", "danger");
    setTimeout(() => {
      window.location.href = "../index.html";
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
  document.querySelector("#productRatingValue").textContent =
    ratingVal.toFixed(1);
  const reviewsCountStr =
    reviewsCount > 0 ? `${reviewsCount} reviews` : "0 reviews";
  document.querySelector("#productReviewsCount").textContent =
    `(${reviewsCountStr})`;
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

function setupEventListeners() {
  document.querySelector("#addToCartBtn").addEventListener("click", () => {
    if (!currentProduct) return;
    const qty =
      Number(document.querySelector("#productQuantityInput").value) || 1;
    cart.addItem(currentProduct._id, currentProduct.stock, qty);
  });

  const reviewForm = document.querySelector("#reviewForm");
  reviewForm?.addEventListener("submit", async (e) => {
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
      await createProductReview(productId, payload);
      showAlert("Thank you! Your review has been added.", "success");
      reviewForm.reset();
      await loadProduct(productId);
    } catch (error) {
      showAlert(error.message, "danger");
    }
  });
}
