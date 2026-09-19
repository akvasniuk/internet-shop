import { requireAuth } from "../utils/authGuard.js";
import { fetchProductsByIds } from "../components/productService.js";
import { createOrder } from "../orders/orderService.js";
import { initAuthNav } from "../components/authNav.js";
import { showAlert } from "../utils/toast.js";

const checkoutForm = document.querySelector("#checkoutForm");
const submitBtn = document.querySelector("#submitOrderBtn");
let currentUser = null;

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

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

  document.querySelector("#summaryItemsCount").textContent = `${totalCount} pcs`;
  document.querySelector("#checkoutSubtotal").textContent = `$${total.toFixed(2)}`;
  document.querySelector("#checkoutTotalAmount").textContent = `$${total.toFixed(2)}`;
}

function validateCheckoutForm(elements) {
  let isValid = true;

  const setStatus = (el, valid) => {
    el.classList.toggle("is-valid", valid);
    el.classList.toggle("is-invalid", !valid);
    if (!valid) isValid = false;
  };

  const fields = {
    firstname: (val) => val.length >= 2 && val.length <= 50,
    lastname: (val) => val.length >= 2 && val.length <= 50,
    phone: (val) => /^\+?[0-9]{10,15}$/.test(val),
    email: (val) => /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(val),
    city: (val) => val.length >= 2 && val.length <= 100,
    deliveryService: (val) => ["mail", "courier"].includes(val),
    address: (val) => val.length >= 3 && val.length <= 255,
  };

  for (const [name, validator] of Object.entries(fields)) {
    const input = elements[name];
    if (input) setStatus(input, validator(input.value.trim()));
  }

  const paymentValid = Boolean(elements.paymentMethod?.value);
  const paymentContainer = document.querySelector("#paymentMethodGroup");
  if (paymentContainer) {
    paymentContainer.classList.toggle("border-danger", !paymentValid);
  }
  if (!paymentValid) isValid = false;

  return isValid;
}

function setupFormListener() {
  checkoutForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cart = getCart();
    if (!cart.length) {
      showAlert("The cart is empty", "danger");
      setTimeout(() => (window.location.href = "../index.html"), 1500);
      return;
    }

    if (!validateCheckoutForm(checkoutForm.elements)) return;

    const orderData = {
      firstname: document.querySelector("#orderFirstName").value.trim(),
      lastname: document.querySelector("#orderLastName").value.trim(),
      phone: document.querySelector("#orderPhone").value.trim(),
      email: document.querySelector("#orderEmail").value.trim(),
      city: document.querySelector("#orderCity").value.trim(),
      deliveryService: document.querySelector("#deliveryService").value,
      address: document.querySelector("#orderAddress").value.trim(),
      paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value,
      items: Object.fromEntries(cart),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Placing your order...";

    try {
      await createOrder(currentUser._id, orderData);

      localStorage.removeItem("cart");
      showAlert(
        "Order placed successfully! The manager will contact you soon.",
        "success",
      );
      setTimeout(() => (window.location.href = "../index.html"), 1500);
    } catch (error) {
      showAlert(error.message, "danger");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm order";
    }
  });
}

async function init() {
  const auth = requireAuth();
  if (!auth) {
    return;
  }

  currentUser = auth.user;
  initAuthNav(document.querySelector("#authNav"));

  const cart = getCart();
  if (!cart.length) {
    showAlert("The cart is empty", "danger");
    setTimeout(() => (window.location.href = "../index.html"), 1500);
    return;
  }

  document.querySelector("#orderFirstName").value = currentUser.firstname || "";
  document.querySelector("#orderLastName").value = currentUser.lastname || "";
  document.querySelector("#orderEmail").value = currentUser.email || "";

  try {
    const ids = cart.map(([id]) => id);
    const productsData = await fetchProductsByIds(ids);

    const products = productsData.map((prod) => {
      const cartEntry = cart.find(([id]) => id === prod._id);
      return { ...prod, quantity: cartEntry ? cartEntry[1] : 1 };
    });

    renderCheckoutSummary(products);
  } catch (error) {
    showAlert(error.message, "danger");
    console.error("Checkout data error:", error);
  }

  setupFormListener();
}

init();