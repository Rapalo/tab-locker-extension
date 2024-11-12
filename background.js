// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  // Create the context menu item
  chrome.contextMenus.create({
    id: "lockTab",
    title: "Lock/Unlock Tab",
    contexts: ["page"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "lockTab") {
    chrome.tabs.sendMessage(tab.id, { action: "toggleLock" });
  }
});

// Handle toolbar icon clicks
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggleLock" });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-lock") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleLock" });
    });
  }
});

// Handle icon updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateIcon") {
    chrome.action.setIcon({
      path: `assets/${request.state}.png`,
      tabId: sender.tab.id
    });
  }
});
