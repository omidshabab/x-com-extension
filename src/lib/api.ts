import { TweetData } from "../content-scripts/twitter-scraper";
import { SavedReply } from "../types/index";

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

export async function getOpenAIApiKey(): Promise<string> {
  try {
    const { openaiApiKey } = await chrome.storage.local.get("openaiApiKey");
    return openaiApiKey || "";
  } catch (error) {
    console.error("Error retrieving API key:", error);
    return "";
  }
}

export async function setOpenAIApiKey(apiKey: string): Promise<void> {
  try {
    await chrome.storage.local.set({ openaiApiKey: apiKey });
  } catch (error) {
    console.error("Error setting API key:", error);
    throw error;
  }
}

export async function generateReply(
  tweetData: TweetData,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }

  // Check if we have enough context
  if (!tweetData.tweetContent || tweetData.tweetContent.trim().length < 10) {
    throw new Error(
      "Tweet content is too short to generate a meaningful reply"
    );
  }

  // Require at least 2 meaningful replies for better context
  const meaningfulReplies = tweetData.topReplies.filter(
    (reply) => reply.replyContent.trim().length > 15
  );

  if (meaningfulReplies.length < 2) {
    throw new Error(
      "Not enough meaningful replies to generate contextual response"
    );
  }

  try {
    const prompt = createPrompt(tweetData);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI reply generator for Twitter/X. Analyze the tweet content and existing replies to generate a contextually relevant, single-sentence response that adds value to the conversation.

CRITICAL REQUIREMENTS:
- Generate reply ONLY if you can add meaningful value based on tweet content and existing replies
- Must be ONE simple sentence under 90 characters
- Must be directly relevant to the conversation context
- NO questions unless absolutely necessary
- NO generic advice
- NO promotional language
- Focus on adding specific value to the ongoing discussion`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    const data: OpenAIResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Unknown error occurred");
    }

    const reply = data.choices[0].message.content.trim();

    // Additional validation of the generated reply
    if (reply.includes("?") || reply.length > 90 || reply.includes(";")) {
      throw new Error("Generated reply does not meet requirements");
    }

    return reply;
  } catch (error) {
    console.error("Error generating reply:", error);
    throw error;
  }
}

function createPrompt(tweetData: TweetData): string {
  const { tweetContent, tweetAuthor, topReplies } = tweetData;

  let repliesText = "";
  if (topReplies.length > 0) {
    repliesText =
      "Existing conversation context (analyze these replies):\n" +
      topReplies
        .map(
          (reply, index) =>
            `${index + 1}. ${reply.replyAuthor}: "${reply.replyContent}"`
        )
        .join("\n");
  }

  return `Analyze this conversation and generate a contextually relevant reply:

Original Tweet by ${tweetAuthor}: "${tweetContent}"

${repliesText}

REQUIREMENTS:
- Reply must be directly relevant to the specific conversation
- Must add unique value based on the context
- Must be under 90 characters
- Must be a single, simple sentence
- Must avoid generic responses
- Only reply if you can add meaningful value

Reply:`;
}

export async function getSavedReplies(tweetId: string): Promise<SavedReply[]> {
  try {
    const { savedReplies = {} } = await chrome.storage.local.get(
      "savedReplies"
    );
    return savedReplies[tweetId] || [];
  } catch (error) {
    console.error("Error retrieving saved replies:", error);
    return [];
  }
}

export async function saveReply(
  tweetId: string,
  content: string
): Promise<void> {
  try {
    const { savedReplies = {} } = await chrome.storage.local.get(
      "savedReplies"
    );
    const tweetReplies = savedReplies[tweetId] || [];

    const newReply: SavedReply = {
      id: crypto.randomUUID(),
      content,
      tweetId,
      timestamp: Date.now(),
    };

    savedReplies[tweetId] = [...tweetReplies, newReply];
    await chrome.storage.local.set({ savedReplies });
  } catch (error) {
    console.error("Error saving reply:", error);
    throw error;
  }
}
