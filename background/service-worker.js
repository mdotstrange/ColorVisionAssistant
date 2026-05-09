chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: false,
    mode: "simulate",
    type: "protanopia"
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    chrome.storage.local.get(["enabled", "mode", "type"], (data) => {
      if (data.enabled) {
        chrome.tabs.sendMessage(tabId, {
          action: "applyFilter",
          mode: data.mode,
          type: data.type
        }).catch(() => {});
      }
    });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-filter") {
    chrome.storage.local.get(["enabled", "mode", "type"], (data) => {
      const newEnabled = !data.enabled;
      chrome.storage.local.set({ enabled: newEnabled });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        if (newEnabled) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "applyFilter",
            mode: data.mode || "simulate",
            type: data.type || "protanopia"
          }).catch(() => {});
        } else {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "removeFilter"
          }).catch(() => {});
        }
      });
    });
  }
});
