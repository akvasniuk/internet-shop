import { loginUser } from "./authService.js";
import { showAlert } from "../utils/toast.js";

const loginForm = document.forms[0];

const VALIDATION_RULES = {
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

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm(e.target.elements)) return;

  const formData = new FormData(loginForm);
  const credentials = Object.fromEntries(formData);

  try {
    const { user, accessToken, refreshToken } = await loginUser(credentials);

    if (user) {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      setTimeout(() => {
        window.location.href = "../index.html";
      }, 500);
    }
  } catch (err) {
    showAlert(err.message, "danger");
    console.error("Login error:", err);
  }
});
