import initApp from "./app.js";

function setYearFooter() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

window.addEventListener("DOMContentLoaded", () => {
  setYearFooter();
  initApp();
});