import { API_URL, authFetch } from "../utils/api.js";

export async function fetchProducts({
  page = 1,
  limit = 8,
  search = "",
  sort = "price-asc",
}) {
  const skip = (page - 1) * limit;
  const params = new URLSearchParams({
    limit,
    skip,
    search: search.trim(),
    sort,
  });
  const response = await fetch(`${API_URL}/products?${params.toString()}`);
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  return response.json();
}

export async function fetchProductsByIds(ids) {
  const promises = ids.map((id) => fetch(`${API_URL}/products/${id}`));
  const responses = await Promise.all(promises);
  for (const res of responses) {
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
  }
  const data = await Promise.all(responses.map((r) => r.json()));
  return data.map((item) => item.product);
}

export async function fetchProductById(id) {
  const res = await fetch(`${API_URL}/products/${id}`);
  if (!res.ok) throw new Error("Product not found");
  const result = await res.json();
  return result.product || result.data || result;
}

export async function createProductReview(productId, reviewData) {
  const res = await authFetch(`${API_URL}/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(reviewData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to submit review");
  }
  return res.json();
}

export async function fetchProductStats() {
  const res = await authFetch(`${API_URL}/products/stats`);
  if (!res.ok) throw new Error("Failed to fetch statistics");
  return res.json();
}

export async function saveProduct(formData, isEdit, productId) {
  const url = isEdit
    ? `${API_URL}/products/${productId}`
    : `${API_URL}/products`;
  const method = isEdit ? "PATCH" : "POST";

  const res = await authFetch(url, { method, body: formData }, false);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Error saving product");
  }
  return res.json();
}

export async function deleteProductById(id) {
  const res = await authFetch(`${API_URL}/products/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete the product");
  return res.json();
}
