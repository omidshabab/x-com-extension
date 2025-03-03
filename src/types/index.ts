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

export interface GenerateReplyResponse {
  success: boolean;
  reply?: string;
  error?: string;
}

export interface InsertReplyResponse {
  success: boolean;
  error?: string;
}

export interface SavedReply {
  id: string;
  content: string;
  tweetId: string;
  timestamp: number;
}
