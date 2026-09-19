import { API_URL } from "./constants.js";
import { authFetch, handleForceLogout } from "./api.js";
import { showAlert } from "./toast.js";
import { isTokenExpired } from "./tokenExpiration.js";

const profileForm = document.forms.profileForm;
const passwordForm = document.forms.passwordForm;

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("accessToken");

  if (!token || isTokenExpired(token) || !user) {
    showAlert("Access denied! Please log in.", "danger");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);
    return;
  }
});

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const isValid = validateForm(profileForm.elements);

  if (!isValid) {
    return;
  }

  const formData = new FormData(profileForm);
  await updateUser(Object.fromEntries(formData));
});

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const isValid = validatePasswordForm(passwordForm.elements);

  if (!isValid) {
    return;
  }

  const formData = new FormData(passwordForm);
  await updateUserPassword(Object.fromEntries(formData));
});

async function updateUser({ firstname, lastname }) {
  try {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const url = `${API_URL}/users/${user._id}`;

    if (firstname === user.firstname && lastname === user.lastname) {
      showAlert(
        "First name and last name the same, nothing to update",
        "danger",
      );
      return;
    }

    firstname ??= user.firstname;
    lastname ??= user.lastname;

    const response = await authFetch(url, {
      method: "PATCH",
      body: JSON.stringify({ firstname, lastname }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const { message } = await response.json();

    if (!message) {
      throw new Error("Something went wrong");
    }

    showAlert(message);
    setTimeout(() => (window.location.href = "login.html"), 2000);
    handleForceLogout();
  } catch (err) {
    console.error("Fetch error:", err);
    showAlert(err.message, "danger");
    return;
  }
}

async function updateUserPassword({ password, newPassword, confirmPassword }) {
  try {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const url = `${API_URL}/users/${user._id}/password`;

    if (newPassword !== confirmPassword) {
      showToast("New password not the same as confirm password", "danger");
      return;
    }

    const response = await authFetch(url, {
      method: "PATCH",
      body: JSON.stringify({ password, newPassword }),
    });

    if (!response.ok) {
      showAlert("Something wrong with password", "error");
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const { message } = await response.json();

    if (!message) {
      throw new Error("Something went wrong");
    }

    showAlert(message);
    setTimeout(() => (window.location.href = "login.html"), 2000);
    handleForceLogout();
  } catch (err) {
    showAlert(err.message, "danger");
    console.error("Fetch error:", err);
    return;
  }
}

function validateForm(formElements) {
  let isValid = true;

  for (const formElement of formElements) {
    switch (formElement.name) {
      case "firstname":
        if (formElement.value.length < 3 || formElement.value.length > 40) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;
      case "lastname":
        if (formElement.value.length < 3 || formElement.value.length > 40) {
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

function validatePasswordForm(formElements) {
  let isValid = true;

  for (const formElement of formElements) {
    if (formElement.type === "password") {
      if (formElement.value.length < 3 || formElement.value.length > 256) {
        formElement.classList.add("is-invalid");
        formElement.classList.remove("is-valid");
        isValid = false;
      } else {
        formElement.classList.remove("is-invalid");
        formElement.classList.add("is-valid");
      }
    }
  }
  return isValid;
}

function fillProfileForm() {
  const user = JSON.parse(localStorage.getItem("user")) || {};

  if (!user) {
    return;
  }

  profileForm.elements.firstname.value = user.firstname;
  profileForm.elements.lastname.value = user.lastname;
  profileForm.elements.profileEmail.value = user.email;
}

fillProfileForm();
