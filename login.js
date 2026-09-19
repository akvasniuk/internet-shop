import { API_URL } from "./constants.js";
import { showAlert } from "./toast.js";

const loginForm = document.forms[0];

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const isFormValid = validateForm(e.target.elements);

  if (!isFormValid) {
    return;
  }

  const formData = new FormData(loginForm);
  await login(Object.fromEntries(formData));
});

async function login(user) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const { message } = await response.json();
      showAlert(message, "danger");
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const { user: u, accessToken, refreshToken } = await response.json();

    if (u) {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(u));

      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

function validateForm(formElements) {
  let isValid = true;

  for (const formElement of formElements) {
    switch (formElement.name) {
      case "email":
        if (
          !/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$/.test(
            formElement.value,
          )
        ) {
          formElement.classList.add("is-invalid");
          formElement.classList.remove("is-valid");
          isValid = false;
        } else {
          formElement.classList.remove("is-invalid");
          formElement.classList.add("is-valid");
        }
        break;

      case "password":
        if (formElement.value.length < 8 || formElement.value.length > 256) {
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
