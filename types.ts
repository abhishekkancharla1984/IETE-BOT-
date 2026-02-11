
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: {
    data: string;
    mimeType: string;
  };
  sources?: { title: string; uri: string }[];
}

export interface UserProfile {
  name: string;
  joinedAt: Date;
}
