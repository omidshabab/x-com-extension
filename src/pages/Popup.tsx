import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import { TweetData, SavedReply } from '../types';
import { useOpenAI } from '../hooks/useOpenAI';
import "./Popup.css";

export default function Popup() {
  const [tweetData, setTweetData] = useState<TweetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnTweetPage, setIsOnTweetPage] = useState(false);
  const [status, setStatus] = useState('');
  const {
    loading: aiLoading,
    error: aiError,
    apiKey,
    generatedReply,
    savedReplies,
    loadApiKey,
    saveApiKey,
    generateTweetReply,
    setGeneratedReply,
    loadSavedReplies,
  } = useOpenAI();

  // On component mount, check if we're on a tweet page
  useEffect(() => {
    const checkCurrentPage = async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const url = tab.url || '';

        const isTweetPage = /twitter\.com\/[^/]+\/status\/\d+|x\.com\/[^/]+\/status\/\d+/.test(url);
        setIsOnTweetPage(isTweetPage);

        if (isTweetPage) {
          setStatus('Extracting tweet data...');

          // Extract tweet data from the page
          const response = await browser.tabs.sendMessage(tab.id as number, { action: 'getTweetData' });

          if (response) {
            setTweetData(response);
            setStatus('');
          } else {
            setStatus('Failed to extract tweet data. Try refreshing the page.');
          }
        } else {
          setStatus('Please navigate to a Twitter/X post to use this extension.');
        }
      } catch (error) {
        console.error('Error checking current page:', error);
        setStatus('Error: Content script not loaded. Try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadApiKey();
    checkCurrentPage();
  }, []);

  useEffect(() => {
    if (tweetData) {
      loadSavedReplies(tweetData.tweetId);
    }
  }, [tweetData]);

  const handleGenerateReply = async () => {
    if (!tweetData) return;

    setStatus('Generating reply...');
    await generateTweetReply(tweetData);
    setStatus('');
  };

  const handleUseReply = async () => {
    if (!generatedReply) return;

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      setStatus('Inserting reply...');
      const response = await browser.tabs.sendMessage(tab.id as number, {
        action: 'insertReply',
        replyText: generatedReply
      });

      if (response && response.success) {
        setStatus('Reply inserted! You can edit it before posting.');
      } else {
        setStatus(`Failed to insert reply: ${response?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error inserting reply:', error);
      setStatus('Error inserting reply. Try refreshing the page.');
    }
  };

  const handleRegenerate = () => {
    handleGenerateReply();
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    saveApiKey(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold">X/Twitter AI Reply Generator</h1>
        <p className="text-sm text-gray-400">AI-powered replies for your automation agency</p>
      </header>

      {!isOnTweetPage ? (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-center text-gray-400">
            Please navigate to a Twitter/X post to generate a reply.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>

          {tweetData && (
            <div className="mb-4 bg-gray-800 p-3 rounded-md">
              <p className="font-medium">Tweet by @{tweetData.tweetAuthor}</p>
              <p className="text-sm text-gray-400 line-clamp-2">{tweetData.tweetContent}</p>
              <p className="text-xs text-gray-500 mt-1">{tweetData.topReplies.length} replies analyzed</p>
            </div>
          )}

          {generatedReply || savedReplies.length > 0 ? (
            <div className="mb-4">
              <button
                onClick={handleGenerateReply}
                disabled={aiLoading || !apiKey}
                className="w-full mb-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-2 px-4 rounded-md"
              >
                {aiLoading ? 'Generating...' : 'Generate AI Reply'}
              </button>

              {generatedReply && (
                <div className="bg-gray-800 p-3 rounded-md mb-2">
                  <p className="text-sm">{generatedReply}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {generatedReply.length}/280 characters
                  </p>
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={handleUseReply}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
                    >
                      Use Reply
                    </button>
                    <button
                      onClick={handleRegenerate}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}

              {savedReplies.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Previous Replies</h3>
                  <div className="space-y-2">
                    {savedReplies.map((reply) => (
                      <div
                        key={reply.id}
                        className="bg-gray-800 p-3 rounded-md cursor-pointer hover:bg-gray-700"
                        onClick={() => {
                          navigator.clipboard.writeText(reply.content);
                          setStatus('Reply copied to clipboard!');
                          setTimeout(() => setStatus(''), 2000);
                        }}
                      >
                        <p className="text-sm">{reply.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(reply.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleGenerateReply}
              disabled={aiLoading || !apiKey}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-2 px-4 rounded-md"
            >
              {aiLoading ? 'Generating...' : 'Generate AI Reply'}
            </button>
          )}

          {aiError && (
            <div className="mt-2 text-red-400 text-sm">
              Error: {aiError}
            </div>
          )}

          {status && (
            <div className="mt-2 text-gray-400 text-sm">
              {status}
            </div>
          )}
        </>
      )}

      <footer className="mt-auto pt-2 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          AI Automation Agency Reply Generator
        </p>
      </footer>
    </div>
  );
}