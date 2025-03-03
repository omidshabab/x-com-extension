import { extractTweetData, TweetData } from "./twitter-scraper";
import browser from "webextension-polyfill";

// Listen for messages from the extension's popup or background script
browser.runtime.onMessage.addListener(async (message) => {
  if (message.action === "getTweetData") {
    const tweetData = await extractTweetData();
    return tweetData;
  }

  if (message.action === "insertReply" && message.replyText) {
    try {
      // Find the reply textarea
      const replyBox = document.querySelector(
        '[data-testid="tweetTextarea_0"]'
      ) as HTMLElement;

      if (replyBox) {
        // Focus the reply box
        replyBox.focus();
        // Set the value directly
        replyBox.innerText = message.replyText;

        return { success: true };
      } else {
        return { success: false, error: "Could not find reply box" };
      }
    } catch (error) {
      console.error("Error inserting reply:", error);
      return { success: false, error: String(error) };
    }
  }
});

// Notify the background script when the content script is loaded (on Twitter pages)
browser.runtime.sendMessage({
  action: "contentScriptLoaded",
  url: window.location.href,
});
