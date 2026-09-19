import { authFetch } from "./api.js";
import { API_URL } from "./constants.js";
import { showAlert } from "./toast.js";
import { isTokenExpired } from "./tokenExpiration.js";

let productModalInstance = null;
let allProducts = [];

let currentPage = 1;
const limit = 10;
let totalProducts = 0;

let searchQuery = "";
let searchTimeout = null;

const searchInput = document.querySelector("#searchProductInput");
const clearBtn = document.querySelector("#clearSearchBtn");

searchInput.addEventListener("input", (e) => {
  const value = e.target.value.trim();
  searchQuery = value;

  if (value.length > 0) {
    clearBtn.classList.remove("d-none");
  } else {
    clearBtn.classList.add("d-none");
  }

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadAdminProducts(1);
  }, 400);
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchQuery = "";
  clearBtn.classList.add("d-none");
  loadAdminProducts(1);
});

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("accessToken") || "null";

  if (user.role !== "ADMIN") {
    showAlert("Access denied! Administrators only.", "danger");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
    return;
  }

  if (!token || isTokenExpired(token)) {
    showAlert("Access denied! Please log in.", "danger");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
    return;
  }

  productModalInstance = new bootstrap.Modal(
    document.querySelector("#productModal"),
  );

  await loadAdminProducts();
  setupEventListeners();
});

async function loadAdminProducts(page = 1) {
  currentPage = page;
  const skip = (page - 1) * limit;

  try {
    const searchParam = searchQuery
      ? `&search=${encodeURIComponent(searchQuery)}`
      : "";
    const res = await fetch(
      `${API_URL}/products?limit=${limit}&skip=${skip}${searchParam}`,
    );
    const result = await res.json();

    allProducts = result.data || [];
    totalProducts = result.total || 0;

    const productStatsRes = await authFetch(`${API_URL}/products/stats`);
    const productStats = (await productStatsRes.json()) || {};

    renderProductsTable(allProducts);
    renderPagination(totalProducts, limit, currentPage);

    renderStats(productStats);
  } catch (error) {
    showAlert(error.message, "danger");
    console.error("Error loading products:", error);
  }
}

function renderStats(stats) {
  const { general, categories } = stats;

  document.querySelector("#statTotalValue").textContent =
    `$${(general.totalValue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  document.querySelector("#statTotalItems").textContent =
    general.totalItems || 0;
  document.querySelector("#statAvgPrice").innerHTML = `
    $${(general.avgPrice || 0).toFixed(2)} 
    <span class="fs-6 text-warning ms-1"><i class="bi bi-star-fill"></i> ${(general.avgRating || 0).toFixed(1)}</span>
  `;
  document.querySelector("#statStockAlerts").textContent =
    general.outOfStockCount || 0;

  const categoryBody = document.querySelector("#categoryStatsBody");
  if (!categories || categories.length === 0) {
    categoryBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Немає даних</td></tr>`;
    return;
  }

  categoryBody.innerHTML = categories
    .map(
      (cat) => `
    <tr>
      <td class="fw-semibold text-capitalize">
        <span class="badge text-bg-light border me-1">${cat._id || "Без категорії"}</span>
      </td>
      <td>${cat.count} pcs.</td>
      <td>$${cat.avgPrice.toFixed(2)}</td>
      <td class="fw-bold text-primary">$${cat.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
    </tr>
  `,
    )
    .join("");
}

function renderProductsTable(products) {
  const tbody = document.querySelector("#productsTableBody");

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Товари відсутні</td></tr>`;
    return;
  }

  tbody.innerHTML = products
    .map(
      (prod) => `
    <tr>
      <td>
        <img 
          src="${prod.image}" 
          class="rounded object-fit-contain border" 
          style="width: 44px; height: 44px;" 
        />
      </td>
      <td class="fw-semibold text-dark">${prod.title}</td>
      <td><span class="badge text-bg-light border">${prod.category}</span></td>
      <td class="fw-bold text-primary">$${Number(prod.price).toFixed(2)}</td>
      <td class="text-end">
        <button class="btn btn-outline-primary btn-sm me-1 btn-edit" data-id="${prod._id}" title="Edit">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm btn-delete" data-id="${prod._id}" title="Delete">
          <i class="bi bi-trash3"></i>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function renderPagination(total, limit, current) {
  const totalPages = Math.ceil(total / limit);
  const container = document.querySelector("#paginationContainer");
  const info = document.querySelector("#paginationInfo");

  if (!container) return;

  const start = total === 0 ? 0 : (current - 1) * limit + 1;
  const end = Math.min(current * limit, total);
  if (info) info.textContent = `Showing ${start}–${end} of ${total}`;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";

  html += `
    <li class="page-item ${current === 1 ? "disabled" : ""}">
      <button class="page-link" data-page="${current - 1}">«</button>
    </li>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <li class="page-item ${i === current ? "active" : ""}">
        <button class="page-link" data-page="${i}">${i}</button>
      </li>
    `;
  }

  html += `
    <li class="page-item ${current === totalPages ? "disabled" : ""}">
      <button class="page-link" data-page="${current + 1}">»</button>
    </li>
  `;

  container.innerHTML = html;
}

const fileInput = document.querySelector("#productImageFile");
const imagePreview = document.querySelector("#imagePreview");

function setupEventListeners() {
  const form = document.querySelector("#productForm");

  document
    .querySelector("#paginationContainer")
    .addEventListener("click", (e) => {
      const btn = e.target.closest(".page-link");
      if (
        !btn ||
        btn.parentElement.classList.contains("disabled") ||
        btn.parentElement.classList.contains("active")
      )
        return;

      const targetPage = Number(btn.dataset.page);
      loadAdminProducts(targetPage);
    });

  document.querySelector("#addNewProductBtn").addEventListener("click", () => {
    form.reset();
    resetFormValidation(form);
    document.querySelector("#productId").value = "";
    document.querySelector("#productModalTitle").textContent =
      "Add a new product";
    productModalInstance.show();
  });

  document
    .querySelector("#productsTableBody")
    .addEventListener("click", async (e) => {
      const editBtn = e.target.closest(".btn-edit");
      if (editBtn) {
        const id = editBtn.dataset.id;
        openEditModal(id);
        return;
      }

      const deleteBtn = e.target.closest(".btn-delete");
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        await handleDeleteProduct(id);
      }
    });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      imagePreview.src = URL.createObjectURL(file);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const productId = document.querySelector("#productId").value;
    const isEdit = Boolean(productId);

    const isValid = validateProductForm(form.elements, isEdit);
    if (!isValid) {
      showAlert(
        "Please fix the highlighted errors before submitting",
        "warning",
      );
      return;
    }

    const formData = new FormData();
    formData.append(
      "title",
      document.querySelector("#productTitle").value.trim(),
    );
    formData.append("price", document.querySelector("#productPrice").value);
    formData.append(
      "category",
      document.querySelector("#productCategory").value.trim(),
    );
    formData.append(
      "brand",
      document.querySelector("#productBrand").value.trim(),
    );
    formData.append("rating", document.querySelector("#productRating").value);
    formData.append(
      "stock",
      document.querySelector("#productStock").value.trim(),
    );
    formData.append(
      "availabilityStatus",
      document.querySelector("#productAvailabilityStatus").value,
    );
    formData.append(
      "description",
      document.querySelector("#productDescription").value.trim(),
    );

    const file = fileInput.files[0];

    if (!file && !isEdit) {
      showAlert("Please provide image for product", "danger");
      productModalInstance.hide();
    }

    if (file) {
      formData.append("image", file);
    } else {
      formData.append("image", imagePreview.src);
    }

    const url = isEdit
      ? `${API_URL}/products/${productId}`
      : `${API_URL}/products`;
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await authFetch(
        url,
        {
          method,
          body: formData,
        },
        false,
      );

      if (!res.ok) throw new Error("Error saving data");

      productModalInstance.hide();
      await loadAdminProducts(isEdit ? currentPage : 1);
    } catch (error) {
      console.log(error);
      showAlert(error.message, "danger");
    }
  });
}

function openEditModal(id) {
  const prod = allProducts.find((p) => p._id === id);
  if (!prod) return;

  resetFormValidation(document.querySelector("#productForm"));

  document.querySelector("#productId").value = prod._id;
  document.querySelector("#productTitle").value = prod.title;
  document.querySelector("#productPrice").value = prod.price;
  document.querySelector("#productCategory").value = prod.category || "";
  document.querySelector("#productBrand").value = prod.brand || "";
  document.querySelector("#productRating").value = prod.rating ?? 5;
  document.querySelector("#productStock").value = prod.stock ?? "";
  document.querySelector("#productAvailabilityStatus").value =
    prod.availabilityStatus || "In Stock";
  document.querySelector("#productDescription").value = prod.description || "";

  fileInput.value = "";
  imagePreview.src = prod.image;

  document.querySelector("#productModalTitle").textContent = "Edit product";
  productModalInstance.show();
}

async function handleDeleteProduct(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    const res = await authFetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete the product");

    await loadAdminProducts();
  } catch (error) {
    console.log(error);
    showAlert(error.message, "danger");
  }
}

function validateProductForm(formElements, isEdit = false) {
  let isValid = true;

  for (const formElement of formElements) {
    const value = formElement.value.trim();

    switch (formElement.id) {
      case "productTitle":
        if (value.length < 3 || value.length > 150) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;

      case "productPrice":
        const priceNum = Number(value);
        if (!value || isNaN(priceNum) || priceNum <= 0) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;

      case "productCategory":
        if (value.length < 2 || value.length > 50) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;

      case "productBrand":
        if (value.length < 2 || value.length > 50) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;

      case "productRating":
        const ratingNum = Number(value);
        if (
          value === "" ||
          isNaN(ratingNum) ||
          ratingNum < 0 ||
          ratingNum > 5
        ) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;

      case "productStock":
        const stockNum = Number(value);
        if (value === "" || isNaN(stockNum) || stockNum < 0) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;

      case "productAvailabilityStatus":
        const validStatuses = ["In Stock", "Low Stock", "Out of Stock"];
        if (!validStatuses.includes(value)) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;

      case "productImageFile":
        const file = formElement.files[0];
        if (!isEdit && !file) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;

      case "productDescription":
        if (value.length < 30 || value.length > 2000) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;
    }
  }

  return isValid;
}

function resetFormValidation(form) {
  const inputs = form.querySelectorAll(".form-control, .form-select");
  inputs.forEach((input) => {
    input.classList.remove("is-invalid", "is-valid");
  });
}
