export function renderProductCard(item) {
  let badgeClass = "bg-success";
  if (item.availabilityStatus === "Low Stock")
    badgeClass = "bg-warning text-dark";
  else if (item.availabilityStatus === "Out of Stock")
    badgeClass = "bg-secondary";

  return `
    <div class="col">
      <div class="card h-100 product-card shadow-sm border-0 bg-white">
        <a href="product-details/product-details.html?id=${item._id}" class="text-decoration-none d-block">
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
            <a href="product-details/product-details.html?id=${item._id}" class="text-decoration-none text-dark hover-primary">
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
            <button class="btn btn-outline-primary w-100 btn-add-cart" data-stock="${item.stock}" data-id="${item._id}" ${item.availabilityStatus === "Out of Stock" ? "disabled" : ""}>
              <i class="bi bi-cart-plus me-1"></i>Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
