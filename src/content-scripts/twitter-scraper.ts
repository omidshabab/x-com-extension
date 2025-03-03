/**
 * Functions to extract tweet data from Twitter/X pages
 */

export interface TweetData {
  tweetId: string;
  tweetContent: string;
  tweetAuthor: string;
  topReplies: Array<{
    replyId: string;
    replyContent: string;
    replyAuthor: string;
  }>;
}

export async function extractTweetData(): Promise<TweetData | null> {
  try {
    // Check if we're on a tweet page
    const urlRegex =
      /twitter\.com\/[^/]+\/status\/(\d+)|x\.com\/[^/]+\/status\/(\d+)/;
    const match = window.location.href.match(urlRegex);

    if (!match) {
      console.error("Not on a tweet page");
      return null;
    }

    const tweetId = match[1] || match[2];

    // Extract main tweet
    // Since Twitter's DOM can change frequently, we'll use more resilient selectors
    const mainTweetElement = document.querySelector(
      '[data-testid="tweetText"]'
    );
    if (!mainTweetElement) {
      console.error("Could not find main tweet element");
      return null;
    }

    const tweetContent = mainTweetElement.textContent || "";

    // Extract tweet author
    const authorElement = document.querySelector('[data-testid="User-Name"]');
    const tweetAuthor = authorElement?.textContent || "Unknown";

    // Extract top replies (up to 10)
    const replyElements = Array.from(
      document.querySelectorAll('[data-testid="tweet"]')
    ).slice(1, 11); // Skip the first one (original tweet)

    const topReplies = replyElements
      .map((replyElement) => {
        const replyTextElement = replyElement.querySelector(
          '[data-testid="tweetText"]'
        );
        const replyAuthorElement = replyElement.querySelector(
          '[data-testid="User-Name"]'
        );

        const replyId = replyElement.getAttribute("data-tweet-id") || "";
        const replyContent = replyTextElement?.textContent || "";
        const replyAuthor = replyAuthorElement?.textContent || "Unknown";

        return { replyId, replyContent, replyAuthor };
      })
      .filter((reply) => reply.replyContent.trim() !== "");

    return {
      tweetId,
      tweetContent,
      tweetAuthor,
      topReplies,
    };
  } catch (error) {
    console.error("Error extracting tweet data:", error);
    return null;
  }
}
