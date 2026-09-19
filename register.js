import { API_URL } from "./constants.js";
import { showAlert } from "./toast.js";

const registerForm = document.forms[0];

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const isFormValid = validateForm(e.target.elements);

  if (!isFormValid) {
    return;
  }

  const formData = new FormData(registerForm);
  createUser(Object.fromEntries(formData));
});

async function createUser(user) {
  try {
    const response = await fetch(`${API_URL}/users`, {
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

    const { user: u } = await response.json();

    if (u) {
      showAlert("Successful register", "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    }
  } catch (err) {
    console.error("Fetch error:", err);
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
