import browser from "webextension-polyfill";

console.log("Twitter Reply Generator extension background script loaded!");

// Track which tabs are on Twitter tweet pages
const twitterTabs = new Set<number>();

// Listen for navigation events to update our tab tracking
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const url = tab.url;
    if (isTweetPage(url)) {
      twitterTabs.add(tabId);
      // Update extension icon status
      browser.action.setIcon({
        path: {
          16: "icon/16.png",
          48: "icon/48.png",
          128: "icon/128.png",
        },
        tabId,
      });
      browser.action.enable(tabId);
    } else if (isTwitterPage(url) && !isTweetPage(url)) {
      // On Twitter but not on a tweet page
      twitterTabs.delete(tabId);
      browser.action.disable(tabId);
    } else {
      // Not on Twitter at all
      twitterTabs.delete(tabId);
      browser.action.disable(tabId);
    }
  }
});

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "contentScriptLoaded" && sender.tab?.id) {
    const url = message.url;
    if (isTweetPage(url)) {
      twitterTabs.add(sender.tab.id);
      browser.action.enable(sender.tab.id);
    }
  }
});

// Helper functions to check URLs
function isTwitterPage(url: string): boolean {
  return url.includes("twitter.com") || url.includes("x.com");
}

function isTweetPage(url: string): boolean {
  return /twitter\.com\/[^/]+\/status\/\d+|x\.com\/[^/]+\/status\/\d+/.test(
    url
  );
}

// Handle extension installation
browser.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details);

  // Set default API key if not already set
  browser.storage.local.get("openaiApiKey").then((result) => {
    if (!result.openaiApiKey) {
      browser.storage.local.set({ openaiApiKey: "" });
    }
  });
});
