import { requireAuth } from "../utils/authGuard.js";
import { updateProfile, changePassword } from "./userService.js";
import { showAlert } from "../utils/toast.js";
import { handleForceLogout } from "../utils/api.js";

const profileForm = document.forms.profileForm;
const passwordForm = document.forms.passwordForm;
let currentUser = null;

function validateFormElements(elements, rules) {
  let isValid = true;

  for (const el of elements) {
    const validator = rules[el.name];
    if (!validator) continue;

    const fieldValid = validator(el.value);
    el.classList.toggle("is-valid", fieldValid);
    el.classList.toggle("is-invalid", !fieldValid);

    if (!fieldValid) {
      isValid = false;
    }
  }

  return isValid;
}

function fillProfileForm() {
  if (!profileForm || !currentUser) return;
  profileForm.elements.firstname.value = currentUser.firstname || "";
  profileForm.elements.lastname.value = currentUser.lastname || "";
  profileForm.elements.profileEmail.value = currentUser.email || "";
}

function setupEventListeners() {
  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const profileRules = {
      firstname: (val) => val.trim().length >= 3 && val.trim().length <= 40,
      lastname: (val) => val.trim().length >= 3 && val.trim().length <= 40,
    };

    if (!validateFormElements(profileForm.elements, profileRules)) return;

    const formData = new FormData(profileForm);
    const firstname = formData.get("firstname")?.trim();
    const lastname = formData.get("lastname")?.trim();

    if (
      firstname === currentUser.firstname &&
      lastname === currentUser.lastname
    ) {
      showAlert(
        "First name and last name are the same, nothing to update",
        "warning",
      );
      return;
    }

    try {
      const data = await updateProfile(currentUser._id, { firstname, lastname });
      showAlert(data.message || "Profile updated successfully!", "success");

      currentUser.firstname = firstname;
      currentUser.lastname = lastname;
      localStorage.setItem("user", JSON.stringify(currentUser));
    } catch (err) {
      console.error(err);
      showAlert("Failed to update profile", "danger");
    }
  });

  passwordForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const passwordRules = {
      password: (val) => val.length >= 8,
      newPassword: (val) => val.length >= 8,
      confirmPassword: (val) => val.length >= 8,
    };

    if (!validateFormElements(passwordForm.elements, passwordRules)) return;

    const formData = new FormData(passwordForm);
    const password = formData.get("password");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (newPassword !== confirmPassword) {
      showAlert("New password does not match confirmation", "danger");
      passwordForm.elements.confirmPassword?.classList.add("is-invalid");
      passwordForm.elements.confirmPassword?.classList.remove("is-valid");
      return;
    }

    try {
      const data = await changePassword(currentUser._id, {
        password,
        newPassword,
      });
      showAlert(
        data.message || "Password changed. Please log in again.",
        "success",
      );
      setTimeout(() => {
        handleForceLogout();
      }, 1500);
    } catch (err) {
      console.error(err);
      showAlert(
        "Failed to change password. Check your current password.",
        "danger",
      );
    }
  });
}

function init() {
  const auth = requireAuth();
  if (!auth) {
    return;
  }

  currentUser = auth.user;
  fillProfileForm();
  setupEventListeners();
}

init();