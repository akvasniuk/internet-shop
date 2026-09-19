import { authFetch } from "./api.js";
import { API_URL } from "./constants.js";
import { showAlert } from "./toast.js";
import { isTokenExpired } from "./tokenExpiration.js";

document.addEventListener("DOMContentLoaded", async () => {
  const cart = JSON.parse(localStorage.getItem("cart") || "null");
  const token = localStorage.getItem("accessToken") || "null";

  if (!cart || cart.length === 0) {
    showAlert("The cart is empty", "danger");

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

  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  if (storedUser) {
    document.querySelector("#orderFirstName").value =
      storedUser.firstname || "";
    document.querySelector("#orderLastName").value = storedUser.lastname || "";
    document.querySelector("#orderEmail").value = storedUser.email || "";
  }

  try {
    const products = await Promise.all(
      cart.map(async ([id, qty]) => {
        const res = await fetch(`${API_URL}/products/${id}`);

        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }

        const { product } = await res.json();
        return { ...product, quantity: qty };
      }),
    );

    renderCheckoutSummary(products);
  } catch (error) {
    showAlert(error.message, "danger");
    console.error("Server error:", error);
  }
});

function renderCheckoutSummary(items) {
  const container = document.querySelector("#checkoutItemsList");
  let total = 0;
  let totalCount = 0;

  container.innerHTML = items
    .map((item) => {
      const itemSum = item.price * item.quantity;
      total += itemSum;
      totalCount += item.quantity;

      return `
      <div class="d-flex align-items-center gap-3 py-2 border-bottom">
        <img 
          src="${item.image}" 
          class="rounded object-fit-contain border" 
          style="width: 48px; height: 48px;" 
        />
        <div class="flex-grow-1 overflow-hidden" style="min-width: 0;">
          <h6 class="mb-0 text-truncate small fw-semibold">${item.title}</h6>
          <span class="text-muted small">${item.quantity} pcs. × $${item.price}</span>
        </div>
        <span class="fw-bold small flex-shrink-0">$${itemSum.toFixed(2)}</span>
      </div>
    `;
    })
    .join("");

  document.querySelector("#summaryItemsCount").textContent =
    `${totalCount} pcs`;
  document.querySelector("#checkoutSubtotal").textContent =
    `$${total.toFixed(2)}`;
  document.querySelector("#checkoutTotalAmount").textContent =
    `$${total.toFixed(2)}`;
}

const checkoutForm = document.querySelector("#checkoutForm");

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cart = JSON.parse(localStorage.getItem("cart") || "{}");

  if (cart.length === 0) {
    showAlert("The cart is empty", "danger");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
    return;
  }

  const isValid = validateCheckoutForm(checkoutForm.elements);

  if (!isValid) {
    return;
  }

  const orderData = {
    firstname: document.querySelector("#orderFirstName").value.trim(),
    lastname: document.querySelector("#orderLastName").value.trim(),
    phone: document.querySelector("#orderPhone").value.trim(),
    email: document.querySelector("#orderEmail").value.trim(),
    city: document.querySelector("#orderCity").value.trim(),
    deliveryService: document.querySelector("#deliveryService").value,
    address: document.querySelector("#orderAddress").value.trim(),
    paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')
      ?.value,
    items: cart.reduce((acc, [itemKey, count]) => {
      return { ...acc, ...{ [itemKey]: count } };
    }, {}),
  };

  const submitBtn = document.querySelector("#submitOrderBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Placing your order...";

  const storedUser = JSON.parse(localStorage.getItem("user") || "null");

  try {
    const response = await authFetch(`${API_URL}/orders/${storedUser._id}`, {
      method: "POST",
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(data.errors)
        ? data.errors.join(", ")
        : data.message || "Error";

      throw new Error(errorMessage);
    }

    localStorage.removeItem("cart");

    showAlert("Successful place order. The manager will call you!", "success");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    showAlert(error.message, "danger");
    console.error(`HTTP error: ${error}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm order";
  }
});

function validateCheckoutForm(formElements) {
  let isValid = true;

  const setFieldStatus = (el, valid) => {
    if (valid) {
      el.classList.remove("is-invalid");
      el.classList.add("is-valid");
    } else {
      el.classList.remove("is-valid");
      el.classList.add("is-invalid");
      isValid = false;
    }
  };

  for (const el of formElements) {
    const val = el.value ? el.value.trim() : "";

    switch (el.name) {
      case "firstname":
      case "lastname":
        setFieldStatus(el, val.length >= 2 && val.length <= 50);
        break;

      case "phone":
        setFieldStatus(el, /^\+?[0-9]{10,15}$/.test(val));
        break;

      case "email":
        setFieldStatus(
          el,
          /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$/.test(val),
        );
        break;

      case "city":
        setFieldStatus(el, val.length >= 2 && val.length <= 100);
        break;

      case "deliveryService":
        setFieldStatus(el, ["mail", "courier"].includes(val));
        break;

      case "address":
        setFieldStatus(el, val.length >= 3 && val.length <= 255);
        break;

      case "paymentMethod":
        if (el.type === "radio") {
          const isChecked =
            formElements.some?.(
              (input) => input.name === "paymentMethod" && input.checked,
            ) ?? true;
          setFieldStatus(el, isChecked);
        }
        break;
    }
  }

  return isValid;
}
