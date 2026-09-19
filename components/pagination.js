export function createPagination(containerElement, onPageChange) {
  if (!containerElement) return () => {};

  containerElement.addEventListener("click", (e) => {
    const btn = e.target.closest(".page-link");
    if (!btn) return;
    const page = parseInt(btn.dataset.page, 10);
    if (page) onPageChange(page);
  });

  return function render(totalItems, itemsPerPage, activePage) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
      containerElement.innerHTML = "";
      return;
    }

    let html = `
      <li class="page-item ${activePage === 1 ? "disabled" : ""}">
        <button class="page-link" data-page="${activePage - 1}" aria-label="Previous">&laquo;</button>
      </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <li class="page-item ${i === activePage ? "active" : ""}">
          <button class="page-link" data-page="${i}">${i}</button>
        </li>
      `;
    }

    html += `
      <li class="page-item ${activePage === totalPages ? "disabled" : ""}">
        <button class="page-link" data-page="${activePage + 1}" aria-label="Next">&raquo;</button>
      </li>
    `;

    containerElement.innerHTML = html;
  };
}
