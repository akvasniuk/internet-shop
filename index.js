import { API_URL } from "./constants.js";
import { authFetch, handleForceLogout } from "./api.js";
import { isTokenExpired } from "./tokenExpiration.js";
import { showAlert } from "./toast.js";

const productsElement = document.querySelector("#productsGrid");
const productCountElement = document.querySelector("#productCount");
const cartBadgeElement = document.querySelector("#cartBadge");
const paginationElement = document.querySelector("#pagination");
const searchBtnElement = document.querySelector("#searchBtn");
const searchInputElement = document.querySelector("#searchInput");
const sortSelectElement = document.querySelector("#sortSelect");
const authNavElement = document.querySelector("#authNav");
const checkoutBtn = document.querySelector("#checkoutBtn");
const openCartBtn = document.querySelector("#openCart");
const cartItemsListElement = document.querySelector("#cartItemsList");
const cartTotalPriceElement = document.querySelector("#cartTotalPrice");

let currentPage = 1;
const limit = 8;
let currentSearch = searchInputElement.value || "";
let currentSort = sortSelectElement.value || "price-asc";

const getProducts = async (page = 1) => {
  try {
    const skip = (page - 1) * limit;

    const queryParamas = new URLSearchParams({
      limit,
      skip,
      search: currentSearch.trim(),
      sort: currentSort,
    });
    const url = `${API_URL}/products?${queryParamas.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const { data: products, total } = await response.json();
    currentPage = page;

    if (!total) {
      productCountElement.classList.replace("bg-primary", "bg-secondary");
      productsElement.innerHTML = `
        <div class="col-12 w-100 text-center py-5 text-muted d-flex flex-column align-items-center justify-content-center">
          <i class="bi bi-search fs-1 d-block mb-2"></i>
          <h5>No products found for "${currentSearch}"</h5>
          <p class="small">Try checking your spelling or use more general terms</p>
        </div>
      `;
      productCountElement.textContent = total;
      renderPagination(0, limit, 1);
      return;
    }

    productCountElement.textContent = total;
    productCountElement.classList.replace("bg-secondary", "bg-primary");

    productsElement.innerHTML = products
      .map((item) => renderProduct(item))
      .join("");

    renderPagination(total, limit, currentPage);
  } catch (err) {
    showAlert(err.message, "danger");
    console.error("Fetch error:", err);
  }
};

const renderPagination = (totalItems, itemsPerPage, activePage) => {
  if (!paginationElement) return;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) {
    paginationElement.innerHTML = "";
    return;
  }

  let paginationHtml = "";

  paginationHtml += `
    <li class="page-item ${activePage === 1 ? "disabled" : ""}">
      <button class="page-link" data-page="${activePage - 1}" aria-label="Previous">
        &laquo;
      </button>
    </li>
  `;

  for (let i = 1; i <= totalPages; i++) {
    paginationHtml += `
      <li class="page-item ${i === activePage ? "active" : ""}">
        <button class="page-link" data-page="${i}">${i}</button>
      </li>
    `;
  }

  paginationHtml += `
    <li class="page-item ${activePage === totalPages ? "disabled" : ""}">
      <button class="page-link" data-page="${activePage + 1}" aria-label="Next">
        &raquo;
      </button>
    </li>
  `;

  paginationElement.innerHTML = paginationHtml;
};

paginationElement.addEventListener("click", (e) => {
  const btn = e.target.closest(".page-link");
  if (!btn) return;

  const selectedPage = parseInt(btn.dataset.page, 10);
  if (selectedPage && selectedPage !== currentPage) {
    getProducts(selectedPage);
  }
});

getProducts(1);

function handleSearch() {
  currentSearch = searchInput.value;
  getProducts(1);
}

searchBtnElement.addEventListener("click", handleSearch);
searchInputElement.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

sortSelectElement.addEventListener("change", (e) => {
  currentSort = e.target.value;
  getProducts(1);
});

const cartMap = new Map();

function getItemsFromLocalStorage() {
  const cart = JSON.parse(localStorage.getItem("cart")) || "";

  if (cart) {
    for (const [itemKey, count] of cart) {
      cartMap.set(itemKey, count);
    }

    const itemsInCartCount = cart.reduce((acc, [key, value]) => {
      return (acc += value);
    }, 0);

    cartBadgeElement.textContent = itemsInCartCount;
  }
}

getItemsFromLocalStorage();

function addItemToCart(item, stock) {
  if (cartMap.get(item) + 1 > stock) {
    showAlert(`You reached the maximum limit (${stock} in stock)`, "warning");
    return;
  }

  cartMap.set(item, cartMap.has(item) ? cartMap.get(item) + 1 : 1);
  const itemsInCart = [...cartMap];
  const itemsInCartCount = itemsInCart.reduce((acc, [key, value]) => {
    return (acc += value);
  }, 0);

  showAlert(`Added 1 item(s) to cart!`, "success", 1000);

  cartBadgeElement.textContent = itemsInCartCount;

  localStorage.setItem("cart", JSON.stringify(itemsInCart));
}

let cart;

openCartBtn.addEventListener("click", async (e) => {
  const itemsInCart = [...cartMap];

  if (!itemsInCart.length) {
    renderEmptyCart();
    return;
  }

  const productInCarts = await getCartItems(itemsInCart);

  cart = productInCarts.map((product) => {
    if (cartMap.get(product._id)) {
      return { ...product, quantity: cartMap.get(product._id) };
    }
    return product;
  });

  const totalInCart = cart.reduce(
    (acc, item) => (acc + item.price) * item.quantity,
    0,
  );

  cartTotalPriceElement.textContent = `$${totalInCart.toFixed(2).toLocaleString()}`;
  renderCartItems(cart);
});

function renderEmptyCart() {
  cartItemsListElement.innerHTML = `<div class="text-center text-muted py-5" id="emptyCartMessage">
            <i class="bi bi-cart-x fs-1 d-block mb-2"></i>
            <p>Your cart is currently empty.</p>
          </div>`;
  cartTotalPriceElement.textContent = "$0.00";
  checkoutBtn.disabled = true;
  cartBadgeElement.textContent = 0;
}

async function getCartItems(itemsInCart) {
  try {
    const itemsPromises = itemsInCart.map(([itemId]) =>
      fetch(`${API_URL}/products/${itemId}`),
    );

    const responses = await Promise.all(itemsPromises);

    for (const res of responses) {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
    }

    const productsInCart = await Promise.all(
      responses.map((res) => res.json()),
    );
    return productsInCart.map(({ product }) => product);
  } catch (err) {
    showAlert(err.message, "danger");
    console.error("Fetch error:", err);
    return;
  }
}

function updateQuantity(itemId, quantity, stock) {
  const currentQty = cartMap.get(itemId) || 0;
  const newQty = currentQty + quantity;

  if (newQty > stock) {
    showAlert(`You reached the maximum limit (${stock} in stock)`, "warning");
    return;
  }

  if (newQty < 1) {
    cartMap.delete(itemId);
  } else {
    cartMap.set(itemId, newQty);
  }

  if (cartMap.size === 0) {
    renderEmptyCart();
    cart = [];
    cartBadgeElement.textContent = "0";
    cartTotalPriceElement.textContent = "$0.00";
    localStorage.removeItem("cart");
    return;
  }

  if (newQty < 1) {
    cart = cart.filter((item) => item._id !== itemId);
  } else {
    cart = cart.map((item) => {
      if (item._id === itemId) {
        return { ...item, quantity: newQty };
      }
      return item;
    });
  }

  const cartArray = [...cartMap];
  const itemsInCartCount = cartArray.reduce((acc, [, qty]) => acc + qty, 0);
  cartBadgeElement.textContent = itemsInCartCount;

  renderCartItems(cart);

  const totalInCart = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  cartTotalPriceElement.textContent = `$${totalInCart.toFixed(2)}`;
  localStorage.setItem("cart", JSON.stringify([...cartArray]));
}

function removeItem(itemId) {
  cartMap.delete(itemId);

  const cartArray = [...cartMap];

  if (!cartArray.length) {
    renderEmptyCart();
    localStorage.setItem("cart", JSON.stringify([]));
    return;
  }

  const itemsInCartCount = cartArray.reduce((acc, [key, value]) => {
    return (acc += value);
  }, 0);

  cartBadgeElement.textContent = itemsInCartCount;

  cart = cart.filter((item) => item._id !== itemId);

  renderCartItems(cart);

  const totalInCart = cart.reduce(
    (acc, item) => (acc + item.price) * item.quantity,
    0,
  );

  cartTotalPriceElement.textContent = `$${totalInCart.toFixed(2).toLocaleString()}`;

  localStorage.setItem("cart", JSON.stringify([...cartArray]));
}

cartItemsListElement.addEventListener("click", (e) => {
  const plusBtn = e.target.closest(".btn.plus");
  if (plusBtn) {
    const productId = plusBtn.dataset.id;
    const inStock = plusBtn.dataset.stock;
    const delta = parseInt(plusBtn.dataset.delta, 10);
    updateQuantity(productId, delta, inStock);
    return;
  }

  const minusBtn = e.target.closest(".btn.minus");
  if (minusBtn) {
    const productId = minusBtn.dataset.id;
    const inStock = minusBtn.dataset.stock;
    const delta = parseInt(minusBtn.dataset.delta, 10);
    updateQuantity(productId, delta, inStock);
    return;
  }

  const removeBtn = e.target.closest(".btn.remove");
  if (removeBtn) {
    const productId = removeBtn.dataset.id;
    removeItem(productId);
  }
});

function renderCartItems(itemsInCart) {
  cartItemsListElement.innerHTML = itemsInCart
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

  checkoutBtn.disabled = false;
}

const renderProduct = (item) => {
  let badgeClass = "bg-success";

  if (item.availabilityStatus === "Low Stock") {
    badgeClass = "bg-warning text-dark";
  } else if (item.availabilityStatus === "Out of Stock") {
    badgeClass = "bg-secondary";
  }

  return `
  <div class="col">
    <div class="card h-100 product-card shadow-sm border-0 bg-white">
   
     <a href="product-details.html?id=${item._id}" class="text-decoration-none d-block">
      <div class="product-img-wrapper border-bottom">
        <span class="badge ${badgeClass} product-badge-overlay">${item.availabilityStatus}</span>
        <img src="${item.image}" class="product-img" alt="${item.title}" loading="lazy">
      </div>
    </a>
      
    
      <div class="card-body d-flex flex-column p-3">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <small class="text-uppercase text-muted fw-bold">${item.brand}</small>
          <span class="badge bg-light text-secondary border">${item.category}</span>
        </div>

        <h6 class="card-title product-title mb-1" title="${item.title}">
        <a href="product-details.html?id=${item._id}" class="text-decoration-none text-dark hover-primary">
          ${item.title}
        </a>
      </h6>
        <p class="card-text product-desc mb-2">${item.description}</p>
        
        <div class="d-flex align-items-center gap-2 mb-3">
          <span class="badge bg-warning text-dark"><i class="bi bi-star-fill me-1"></i>${item.rating}</span>
          <small class="text-muted">Stock: <strong>${item.stock}</strong></small>
        </div>

        
        <div class="mt-auto pt-2 border-top">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="product-price">$${item.price.toLocaleString()}</span>
          </div>
          <button class="btn btn-outline-primary w-100 btn-add-cart" data-stock=${item.stock} data-id="${item._id}" ${item.availabilityStatus === "Out of Stock" ? "disabled" : ""}>
            <i class="bi bi-cart-plus me-1"></i>Add to Cart
          </button>
        </div>
      </div>
    </div>
  </div>
`;
};

productsElement.addEventListener("click", (event) => {
  const btn = event.target.closest(".btn-add-cart");
  if (!btn || btn.classList.contains("disabled")) return;

  const productId = btn.dataset.id;
  const inStock = btn.dataset.stock;
  addItemToCart(productId, inStock);
});

const renderAuthNav = () => {
  if (!authNavElement) return;

  const token = localStorage.getItem("accessToken");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (token && user) {
    if (isTokenExpired(token)) {
      showAlert("Access denied! Please log in.", "danger");
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");

      setTimeout(() => {
        window.location.href = "login.html";
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
    <a class="dropdown-item d-flex align-items-center gap-2" href="profile.html">
      <i class="bi bi-pencil-square text-primary"></i> Edit Profile
    </a>
  </li>
  <li>
    <a class="dropdown-item d-flex align-items-center gap-2" href="orders.html">
      <i class="bi bi-box-seam text-info"></i> My Orders
    </a>
  </li>
  <li>
        <a class="dropdown-item d-flex align-items-center gap-2" href="chat.html">
          <i class="bi bi-chat-dots text-secondary"></i> Support Chat
        </a>
      </li>
  <li>
  <li>
  <a class="dropdown-item d-flex align-items-center gap-2" href="chatAI.html">
    <i class="bi bi-robot text-primary"></i> AI Assistant
  </a>
</li>
    <a class="dropdown-item d-flex align-items-center gap-2" href="checkout.html">
      <i class="bi bi-credit-card text-success"></i> Checkout
    </a>
  </li>
  ${
    user.role === "ADMIN"
      ? `<li id="adminProductLink">
    <a class="dropdown-item d-flex align-items-center gap-2" href="admin-products.html">
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

    document.querySelector("#logoutBtn").addEventListener("click", async () => {
      try {
        const url = `${API_URL}/auth/logout/${user._id}`;

        const response = await authFetch(url, { method: "POST" });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const { message } = await response.json();

        if (!message) {
          throw new Error("Something went wrong");
        }
      } catch (err) {
        showAlert(err.message, "danger");
        console.error("Fetch error:", err);
        return;
      } finally {
        handleForceLogout();
      }
    });
  } else {
    authNavElement.innerHTML = `
      <a href="login.html" class="btn btn-outline-light d-flex align-items-center gap-1">
        <i class="bi bi-box-arrow-in-right"></i>
        <span>Sign In</span>
      </a>
      <a href="register.html" class="btn btn-primary d-flex align-items-center gap-1">
        <i class="bi bi-person-plus"></i>
        <span>Register</span>
      </a>
    `;
  }
};

renderAuthNav();

checkoutBtn.addEventListener("click", () => {
  const token = localStorage.getItem("accessToken");

  if (!token || isTokenExpired(token)) {
    const shouldLogin = confirm(
      "You need to log in to place an order. Go to the login page?",
    );

    if (shouldLogin) {
      window.location.href = "login.html";
    }
    return;
  }

  window.location.href = "checkout.html";
});
