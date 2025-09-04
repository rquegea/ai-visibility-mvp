// frontend/types.ts (Versión Final, Limpia y Corregida)

// --- TIPO PRINCIPAL PARA MENCIONES ---
export interface Mention {
  id: number;
  engine: string;
  source: string;
  response: string;
  sentiment: number;
  emotion: string;
  confidence: number;
  confidence_score: number;
  source_title?: string;
  source_url?: string;
  language: string;
  created_at: string;
  query: string;
  summary?: string;
  key_topics?: string[];
  generated_insight_id?: number;
}

// --- TIPO PRINCIPAL PARA INSIGHTS ---
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

// --- TIPOS PARA RESPUESTAS DE API ---
export interface MentionsResponse {
  mentions: Mention[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_next: boolean;
  };
}

// --- OTROS TIPOS USADOS EN LA APLICACIÓN ---
export interface VisibilityPoint {
  date: string;
  score: number;
}

export interface VisibilityAPI {
  visibility_score: number;
  delta: number;
  series: VisibilityPoint[];
  ranking: {
    position: number;
    name: string;
    logo: string;
    delta: number;
    score: number;
  }[];
}

export interface TopicsResponse {
  words: Array<{ text: string; value: number }>;
  themes: Array<{ name: string; count: number }>;
}

export interface CTA {
  id: number;
  text: string;
  done: boolean;
}

export interface QueryVisibility {
  query_id: number;
  query: string;
  full_query: string;
  total_mentions: number;
  brand_mentions: number;
  visibility_percentage: number;
}

export interface FeatureData {
  feature: string;
  category: string;
  neg: number;
  neu: number;
  pos: number;
  trend: 'up' | 'down' | 'stable';
  topQuotes: string[];
  mentionIds: number[];
}