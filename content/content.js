const SVG_NS = "http://www.w3.org/2000/svg";
const FILTER_ID = "__cva_cvd_filter__";
const SVG_CONTAINER_ID = "__cva_svg_container__";

const MATRICES = {
  simulate: {
    protanopia:     "0.56667 0.43333 0 0 0 0.55833 0.44167 0 0 0 0 0.24167 0.75833 0 0 0 0 0 1 0",
    deuteranopia:   "0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0",
    tritanopia:     "0.95 0.05 0 0 0 0 0.43333 0.56667 0 0 0 0.475 0.525 0 0 0 0 0 1 0",
    protanomaly:    "0.81667 0.18333 0 0 0 0.33333 0.66667 0 0 0 0 0.125 0.875 0 0 0 0 0 1 0",
    deuteranomaly:  "0.8 0.2 0 0 0 0.25833 0.74167 0 0 0 0 0.14167 0.85833 0 0 0 0 0 1 0",
    tritanomaly:    "0.96667 0.03333 0 0 0 0 0.73333 0.26667 0 0 0 0.18333 0.81667 0 0 0 0 0 1 0",
    achromatopsia:  "0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0",
    achromatomaly:  "0.618 0.32 0.062 0 0 0.163 0.775 0.062 0 0 0.163 0.32 0.516 0 0 0 0 0 1 0"
  },
  accommodate: {
    protanopia:     "1 0 0 0 0 0.30333 0.69667 0 0 0 0.30333 -0.30333 1 0 0 0 0 0 1 0",
    deuteranopia:   "0.51 0.49 0 0 0 0 1 0 0 0 -0.49 0.49 1 0 0 0 0 0 1 0",
    tritanopia:     "1 -0.3325 0.3325 0 0 0 0.6675 0.3325 0 0 0 0 1 0 0 0 0 0 1 0",
    protanomaly:    "1 0 0 0 0 0.09167 0.90833 0 0 0 0.09167 -0.09167 1 0 0 0 0 0 1 0",
    deuteranomaly:  "0.87083 0.12917 0 0 0 0 1 0 0 0 -0.12917 0.12917 1 0 0 0 0 0 1 0",
    tritanomaly:    "1 -0.09167 0.09167 0 0 0 0.90833 0.09167 0 0 0 0 1 0 0 0 0 0 1 0",
    achromatopsia:  "1.5 -0.25 -0.25 0 0 -0.25 1.5 -0.25 0 0 -0.25 -0.25 1.5 0 0 0 0 0 1 0",
    achromatomaly:  "1.25 -0.125 -0.125 0 0 -0.125 1.25 -0.125 0 0 -0.125 -0.125 1.25 0 0 0 0 0 1 0"
  }
};

const isTopFrame = (window === window.top);

function ensureSVGContainer() {
  if (document.getElementById(SVG_CONTAINER_ID)) return;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("id", SVG_CONTAINER_ID);
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";

  const defs = document.createElementNS(SVG_NS, "defs");
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", FILTER_ID);
  filter.setAttribute("color-interpolation-filters", "linearRGB");

  const matrix = document.createElementNS(SVG_NS, "feColorMatrix");
  matrix.setAttribute("type", "matrix");
  matrix.setAttribute("values", "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0");

  filter.appendChild(matrix);
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.documentElement.appendChild(svg);
}

function applyFilter(matrixValues) {
  if (!isTopFrame) return;
  ensureSVGContainer();

  const matrix = document.querySelector(`#${FILTER_ID} feColorMatrix`);
  matrix.setAttribute("values", matrixValues);

  const existing = document.documentElement.style.filter || "";
  const cleaned = existing.replace(/url\(#__cva_cvd_filter__\)/g, "").trim();
  document.documentElement.style.filter =
    cleaned ? `${cleaned} url(#${FILTER_ID})` : `url(#${FILTER_ID})`;
}

function removeFilter() {
  if (!isTopFrame) return;
  const existing = document.documentElement.style.filter || "";
  document.documentElement.style.filter =
    existing.replace(/url\(#__cva_cvd_filter__\)/g, "").trim();
}

function getMatrix(mode, type) {
  return MATRICES[mode] && MATRICES[mode][type];
}

function injectPrintGuard() {
  if (!isTopFrame) return;
  if (document.getElementById("__cva_print_guard__")) return;
  const style = document.createElement("style");
  style.id = "__cva_print_guard__";
  style.textContent = "@media print { html { filter: none !important; } }";
  document.documentElement.appendChild(style);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "applyFilter") {
    const values = getMatrix(msg.mode, msg.type);
    if (values) {
      applyFilter(values);
      injectPrintGuard();
    }
    sendResponse({ success: true });
  } else if (msg.action === "removeFilter") {
    removeFilter();
    sendResponse({ success: true });
  } else if (msg.action === "getState") {
    sendResponse({ isTopFrame });
  }
  return true;
});

chrome.storage.local.get(["enabled", "mode", "type"], (data) => {
  if (data.enabled && data.mode && data.type) {
    const values = getMatrix(data.mode, data.type);
    if (values) {
      if (document.documentElement) {
        applyFilter(values);
        injectPrintGuard();
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          applyFilter(values);
          injectPrintGuard();
        }, { once: true });
      }
    }
  }
});
