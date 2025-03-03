import { useState } from "react";
import {
  generateReply,
  getOpenAIApiKey,
  setOpenAIApiKey,
  getSavedReplies,
  saveReply,
} from "../lib/api";
import { TweetData } from "../content-scripts/twitter-scraper";
import { SavedReply } from "../types/index";

export function useOpenAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [generatedReply, setGeneratedReply] = useState<string>("");
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);

  // Load API key from storage
  const loadApiKey = async () => {
    try {
      const key = await getOpenAIApiKey();
      setApiKey(key);
      return key;
    } catch (err) {
      setError("Failed to load API key");
      return "";
    }
  };

  // Save API key to storage
  const saveApiKey = async (key: string) => {
    try {
      await setOpenAIApiKey(key);
      setApiKey(key);
      setError(null);
    } catch (err) {
      setError("Failed to save API key");
    }
  };

  const loadSavedReplies = async (tweetId: string) => {
    const replies = await getSavedReplies(tweetId);
    setSavedReplies(replies);
  };

  // Generate reply using OpenAI
  const generateTweetReply = async (tweetData: TweetData) => {
    setLoading(true);
    setError(null);

    try {
      const key = apiKey || (await loadApiKey());

      if (!key) {
        setError("OpenAI API key is required");
        setLoading(false);
        return null;
      }

      const reply = await generateReply(tweetData, key);
      setGeneratedReply(reply);

      // Save the generated reply
      await saveReply(tweetData.tweetId, reply);
      await loadSavedReplies(tweetData.tweetId);

      setLoading(false);
      return reply;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  return {
    loading,
    error,
    apiKey,
    generatedReply,
    savedReplies,
    loadApiKey,
    saveApiKey,
    generateTweetReply,
    setGeneratedReply,
    loadSavedReplies,
  };
}
