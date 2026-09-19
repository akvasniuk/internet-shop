export function showAlert(message, type = "info", delay = 4000) {
  const container = document.querySelector(".toast-container");
  if (!container) {
    console.error("Toast container not found in HTML!");
    return;
  }

  const icons = {
    success: "bi-check-circle-fill",
    danger: "bi-exclamation-triangle-fill",
    warning: "bi-exclamation-circle-fill",
    info: "bi-info-circle-fill",
  };

  const iconClass = icons[type] || icons.info;

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-bg-${type} border-0 shadow`;
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${iconClass} fs-5"></i>
        <div>${message}</div>
      </div>
      <button 
        type="button" 
        class="btn-close btn-close-white me-2 m-auto" 
        data-bs-dismiss="toast" 
        aria-label="Close">
      </button>
    </div>
  `;

  container.appendChild(toastEl);

  const bsToast = new bootstrap.Toast(toastEl, {
    autohide: true,
    delay: delay,
  });

  toastEl.addEventListener("hidden.bs.toast", () => {
    toastEl.remove();
  });

  bsToast.show();
}