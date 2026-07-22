import initApp from "./app.js";

export function setYearFooter(doc = document, year = new Date().getFullYear()) {
  const el = doc?.getElementById?.("year");
  if (el) el.textContent = String(year);
}

export function populateTreeSizeOptions(doc = document, {
  minTips = 2,
  maxTips = 40,
  defaultTips = 3,
} = {}) {
  const select = doc?.getElementById?.("numTipsSelect");
  if (!select || select.options.length > 0) return;

  for (let i = minTips; i <= maxTips; i += 1) {
    const option = doc.createElement("option");
    option.value = String(i);
    option.textContent = String(i);
    option.selected = i === defaultTips;
    select.appendChild(option);
  }
}

export function bootApp({ doc = document, init = initApp } = {}) {
  setYearFooter(doc);
  populateTreeSizeOptions(doc);
  init();
}

export function installAppBootListener({
  windowObject = window,
  doc = document,
  init = initApp,
} = {}) {
  const handleBoot = () => bootApp({ doc, init });

  if (doc?.readyState && doc.readyState !== "loading") {
    handleBoot();
    return { dispose() {} };
  }

  windowObject?.addEventListener?.("DOMContentLoaded", handleBoot);
  return {
    dispose() {
      windowObject?.removeEventListener?.("DOMContentLoaded", handleBoot);
    },
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  installAppBootListener();
}
