import { API_URL } from "../utils/api.js";
import { showAlert } from "../utils/toast.js";

const registerForm = document.forms[0];

const VALIDATION_RULES = {
  firstname: (val) => val.length >= 3 && val.length <= 40,
  lastname: (val) => val.length >= 3 && val.length <= 40,
  email: (val) => /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(val),
  password: (val) => val.length >= 8 && val.length <= 256,
};

function validateForm(elements) {
  let isValid = true;

  for (const el of elements) {
    const validator = VALIDATION_RULES[el.name];
    if (!validator) continue;

    const fieldValid = validator(el.value.trim());
    el.classList.toggle("is-valid", fieldValid);
    el.classList.toggle("is-invalid", !fieldValid);

    if (!fieldValid) isValid = false;
  }

  return isValid;
}

async function createUser(userData) {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert(data.message || "Registration failed", "danger");
      return;
    }

    showAlert("Successful register", "success");
    setTimeout(() => {
      window.location.href = "../login/login.html";
    }, 1500);
  } catch (err) {
    console.error("Fetch error:", err);
    showAlert("Network error. Please try again later.", "danger");
  }
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm(e.target.elements)) return;

  const formData = new FormData(registerForm);
  await createUser(Object.fromEntries(formData));
});
