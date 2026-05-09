const modeBtns = document.querySelectorAll(".mode-btn");
const typeBtns = document.querySelectorAll(".type-btn");
const offBtn = document.getElementById("offBtn");

let state = { enabled: false, mode: "simulate", type: "protanopia" };

function updateUI() {
  modeBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === state.mode);
  });
  typeBtns.forEach((btn) => {
    btn.classList.toggle("active", state.enabled && btn.dataset.type === state.type);
  });
  offBtn.classList.toggle("disabled", !state.enabled);
}

function sendToContentScript(payload) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, payload).catch(() => {});
    }
  });
}

function saveAndApply() {
  chrome.storage.local.set(state);
  if (state.enabled) {
    sendToContentScript({ action: "applyFilter", mode: state.mode, type: state.type });
  } else {
    sendToContentScript({ action: "removeFilter" });
  }
  updateUI();
}

modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.mode = btn.dataset.mode;
    if (state.enabled) {
      saveAndApply();
    } else {
      chrome.storage.local.set({ mode: state.mode });
      updateUI();
    }
  });
});

typeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.type = btn.dataset.type;
    state.enabled = true;
    saveAndApply();
  });
});

offBtn.addEventListener("click", () => {
  state.enabled = false;
  saveAndApply();
});

chrome.storage.local.get(["enabled", "mode", "type"], (data) => {
  if (data.mode) state.mode = data.mode;
  if (data.type) state.type = data.type;
  state.enabled = !!data.enabled;
  updateUI();
});
