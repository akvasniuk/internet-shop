import { requireAuth } from "../utils/authGuard.js";
import { showAlert } from "../utils/toast.js";
import { initAuthNav } from "../components/authNav.js";
import { createPagination } from "../components/pagination.js";
import {
  fetchProducts,
  fetchProductStats,
  saveProduct,
  deleteProductById,
} from "../components/productService.js";

let productModalInstance = null;
let allProducts = [];
let currentPage = 1;
const limit = 10;
let searchQuery = "";
let searchTimeout = null;
let currentOriginalImage = "";

const searchInput = document.querySelector("#searchProductInput");
const clearBtn = document.querySelector("#clearSearchBtn");
const fileInput = document.querySelector("#productImageFile");
const imagePreview = document.querySelector("#imagePreview");
const paginationInfo = document.querySelector("#paginationInfo");
const paginationContainer = document.querySelector("#paginationContainer");
const productForm = document.querySelector("#productForm");

const renderPagination = createPagination(paginationContainer, (page) => {
  loadAdminProducts(page);
});

async function loadAdminProducts(page = 1) {
  currentPage = page;
  try {
    const [productsResult, statsResult] = await Promise.all([
      fetchProducts({ page, limit, search: searchQuery }),
      fetchProductStats(),
    ]);

    allProducts = productsResult.data || [];
    const total = productsResult.total || 0;

    renderProductsTable(allProducts);
    renderPagination(total, limit, currentPage);

    if (paginationInfo) {
      const start = total === 0 ? 0 : (currentPage - 1) * limit + 1;
      const end = Math.min(currentPage * limit, total);
      paginationInfo.textContent = `Showing ${start}–${end} of ${total}`;
    }

    renderStats(statsResult || {});
  } catch (error) {
    showAlert(error.message, "danger");
    console.error("Error loading admin products:", error);
  }
}

function renderStats(stats) {
  const { general = {}, categories = [] } = stats;

  const totalVal = (general.totalValue || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });
  document.querySelector("#statTotalValue").textContent = `$${totalVal}`;
  document.querySelector("#statTotalItems").textContent =
    general.totalItems || 0;
  document.querySelector("#statAvgPrice").innerHTML = `
    $${(general.avgPrice || 0).toFixed(2)} 
    <span class="fs-6 text-warning ms-1"><i class="bi bi-star-fill"></i> ${(general.avgRating || 0).toFixed(1)}</span>
  `;
  document.querySelector("#statStockAlerts").textContent =
    general.outOfStockCount || 0;

  const categoryBody = document.querySelector("#categoryStatsBody");
  if (!categoryBody) return;

  if (!categories.length) {
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
  if (!tbody) return;

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Товари відсутні</td></tr>`;
    return;
  }

  tbody.innerHTML = products
    .map(
      (prod) => `
    <tr>
      <td>
        <img src="${prod.image}" class="rounded object-fit-contain border" style="width: 44px; height: 44px;" />
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

function openEditModal(id) {
  const prod = allProducts.find((p) => p._id === id);
  if (!prod) return;

  resetFormValidation(productForm);

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
  currentOriginalImage = prod.image;
  if (imagePreview) imagePreview.src = prod.image;

  document.querySelector("#productModalTitle").textContent = "Edit product";
  productModalInstance?.show();
}

async function handleSubmitProduct(e) {
  e.preventDefault();

  const productId = document.querySelector("#productId").value;
  const isEdit = Boolean(productId);

  if (!validateProductForm(productForm.elements, isEdit)) {
    showAlert("Please fix the highlighted errors before submitting", "warning");
    return;
  }

  const file = fileInput.files[0];
  if (!file && !isEdit) {
    showAlert("Please provide an image for the product", "danger");
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

  if (file) {
    formData.append("image", file);
  } else if (isEdit && currentOriginalImage) {
    formData.append("image", currentOriginalImage);
  }

  try {
    await saveProduct(formData, isEdit, productId);
    productModalInstance?.hide();
    showAlert(
      `Product successfully ${isEdit ? "updated" : "created"}!`,
      "success",
    );
    await loadAdminProducts(isEdit ? currentPage : 1);
  } catch (error) {
    console.error(error);
    showAlert(error.message, "danger");
  }
}

async function handleDelete(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    await deleteProductById(id);
    showAlert("Product deleted successfully", "success");
    await loadAdminProducts(currentPage);
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

function validateProductForm(elements, isEdit = false) {
  let isValid = true;
  const setStatus = (el, valid) => {
    el.classList.toggle("is-valid", valid);
    el.classList.toggle("is-invalid", !valid);
    if (!valid) isValid = false;
  };

  const titleEl = elements.productTitle;
  if (titleEl)
    setStatus(
      titleEl,
      titleEl.value.trim().length >= 3 && titleEl.value.trim().length <= 150,
    );

  const priceEl = elements.productPrice;
  if (priceEl)
    setStatus(priceEl, Boolean(priceEl.value) && Number(priceEl.value) > 0);

  const catEl = elements.productCategory;
  if (catEl)
    setStatus(
      catEl,
      catEl.value.trim().length >= 2 && catEl.value.trim().length <= 50,
    );

  const brandEl = elements.productBrand;
  if (brandEl)
    setStatus(
      brandEl,
      brandEl.value.trim().length >= 2 && brandEl.value.trim().length <= 50,
    );

  const ratingEl = elements.productRating;
  if (ratingEl) {
    const num = Number(ratingEl.value);
    setStatus(
      ratingEl,
      ratingEl.value !== "" && !isNaN(num) && num >= 0 && num <= 5,
    );
  }

  const stockEl = elements.productStock;
  if (stockEl) {
    const num = Number(stockEl.value);
    setStatus(stockEl, stockEl.value !== "" && !isNaN(num) && num >= 0);
  }

  const statusEl = elements.productAvailabilityStatus;
  if (statusEl)
    setStatus(
      statusEl,
      ["In Stock", "Low Stock", "Out of Stock"].includes(statusEl.value),
    );

  const fileEl = elements.productImageFile;
  if (fileEl && !isEdit) setStatus(fileEl, Boolean(fileEl.files[0]));

  const descEl = elements.productDescription;
  if (descEl)
    setStatus(
      descEl,
      descEl.value.trim().length >= 30 && descEl.value.trim().length <= 2000,
    );

  return isValid;
}

function resetFormValidation(form) {
  form?.querySelectorAll(".form-control, .form-select").forEach((el) => {
    el.classList.remove("is-invalid", "is-valid");
  });
}

function setupEventListeners() {
  searchInput?.addEventListener("input", (e) => {
    const value = e.target.value.trim();
    searchQuery = value;
    clearBtn?.classList.toggle("d-none", value.length === 0);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadAdminProducts(1), 400);
  });

  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    searchQuery = "";
    clearBtn.classList.add("d-none");
    loadAdminProducts(1);
  });

  document.querySelector("#addNewProductBtn")?.addEventListener("click", () => {
    productForm?.reset();
    resetFormValidation(productForm);
    document.querySelector("#productId").value = "";
    document.querySelector("#productModalTitle").textContent =
      "Add a new product";
    currentOriginalImage = "";
    if (imagePreview) imagePreview.src = "";
    productModalInstance?.show();
  });

  document
    .querySelector("#productsTableBody")
    ?.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".btn-edit");
      if (editBtn) {
        openEditModal(editBtn.dataset.id);
        return;
      }

      const deleteBtn = e.target.closest(".btn-delete");
      if (deleteBtn) {
        handleDelete(deleteBtn.dataset.id);
      }
    });

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file && imagePreview) {
      imagePreview.src = URL.createObjectURL(file);
    }
  });

  productForm?.addEventListener("submit", handleSubmitProduct);
}

async function init() {
  const auth = requireAuth();
  if (!auth || auth.user.role !== "ADMIN") {
    showAlert("Access denied! Administrators only.", "danger");
    setTimeout(() => (window.location.href = "../index.html"), 1200);
    return;
  }

  initAuthNav(document.querySelector("#authNav"));

  const modalEl = document.querySelector("#productModal");
  if (modalEl) productModalInstance = new bootstrap.Modal(modalEl);

  setupEventListeners();
  await loadAdminProducts(1);
}

init();