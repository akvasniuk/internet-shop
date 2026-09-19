import { fetchProducts } from "./components/productService.js";
import { renderProductCard } from "./components/productCard.js";
import { createPagination } from "./components/pagination.js";
import { initAuthNav } from "./components/authNav.js";
import { initCart } from "./components/cartManager.js";
import { showAlert } from "./utils/toast.js";

const productsGrid = document.querySelector("#productsGrid");
const productCount = document.querySelector("#productCount");
const searchInput = document.querySelector("#searchInput");
const searchBtn = document.querySelector("#searchBtn");
const sortSelect = document.querySelector("#sortSelect");
const paginationEl = document.querySelector("#pagination");

let currentPage = 1;
const limit = 8;
let currentSearch = searchInput?.value || "";
let currentSort = sortSelect?.value || "price-asc";

initAuthNav(document.querySelector("#authNav"));

const cart = initCart({
  badgeEl: document.querySelector("#cartBadge"),
  listEl: document.querySelector("#cartItemsList"),
  totalPriceEl: document.querySelector("#cartTotalPrice"),
  openCartBtn: document.querySelector("#openCart"),
  checkoutBtn: document.querySelector("#checkoutBtn"),
});

const renderPagination = createPagination(paginationEl, (newPage) => {
  loadProducts(newPage);
});

async function loadProducts(page = 1) {
  try {
    const { data: products, total } = await fetchProducts({
      page,
      limit,
      search: currentSearch,
      sort: currentSort,
    });

    currentPage = page;

    if (!total) {
      productCount.textContent = 0;
      productCount.classList.replace("bg-primary", "bg-secondary");
      productsGrid.innerHTML = `
        <div class="col-12 w-100 text-center py-5 text-muted d-flex flex-column align-items-center justify-content-center">
          <i class="bi bi-search fs-1 d-block mb-2"></i>
          <h5>No products found for "${currentSearch}"</h5>
          <p class="small">Try checking your spelling or use more general terms</p>
        </div>
      `;
      renderPagination(0, limit, 1);
      return;
    }

    productCount.textContent = total;
    productCount.classList.replace("bg-secondary", "bg-primary");

    productsGrid.innerHTML = products.map(renderProductCard).join("");

    renderPagination(total, limit, currentPage);
  } catch (err) {
    showAlert(err.message, "danger");
    console.error("Fetch products error:", err);
  }
}

function handleSearch() {
  currentSearch = searchInput.value.trim();
  loadProducts(1);
}

searchBtn?.addEventListener("click", handleSearch);

searchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

sortSelect?.addEventListener("change", (e) => {
  currentSort = e.target.value;
  loadProducts(1);
});

productsGrid?.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-add-cart");
  if (!btn || btn.disabled) return;

  const productId = btn.dataset.id;
  const stock = Number(btn.dataset.stock);

  cart.addItem(productId, stock);
});

loadProducts(1);
