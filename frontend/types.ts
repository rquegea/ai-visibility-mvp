// frontend/types.ts

export interface Mention {
  id: number;
  engine: string;
  source: string;
  response: string;
  sentiment: number;
  emotion: string;
  confidence_score: number;
  created_at: string;
  query: string;
  summary?: string;
  key_topics?: string[];
  generated_insight_id?: number;
}

export interface Insight {
  id: number;
  query_id: number;
  payload: {
    opportunities?: string[];
    risks?: string[];
    trends?: string[];
    [key: string]: any;
  };
  created_at: string;
}