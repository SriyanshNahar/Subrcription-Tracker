chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Trackovo Saver Extension Installed successfully!');
});

// Relays tokens and tracks domain checks if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveToken") {
    chrome.storage.local.set({ 
      token: request.token,
      tokenExpiry: request.tokenExpiry 
    }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
});
