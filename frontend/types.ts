export interface VisibilityPoint {
  date: string
  score: number
}

export interface VisibilityAPI {
  visibility_score: number
  delta: number
  series: VisibilityPoint[]
  ranking: {
    position: number
    name: string
    logo: string
    delta: number
    score: number
  }[]
}

export type InsightCategory = "Risk" | "Opportunity" | "Trend" | "Quote"

export interface Insight {
  id: number
  title: string
  category: InsightCategory
  sentiment: "positive" | "negative" | "neutral"
  excerpt: string
  tags: string[]
  starred: boolean
  date: string
}

export interface Mention {
  id: number
  engine: string
  source: string
  response: string
  sentiment: number
  emotion: string
  confidence: number
  source_title?: string
  source_url?: string
  language: string
  created_at: string
  query: string
}

export interface MentionsResponse {
  mentions: Mention[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_next: boolean
  }
}

export interface TopicsResponse {
  words: Array<{ text: string; value: number }>
  themes: Array<{ name: string; count: number }>
}

export interface CTA {
  id: number
  text: string
  done: boolean
}


export interface QueryVisibility {
  query_id: number
  query: string
  full_query: string
  total_mentions: number
  brand_mentions: number
  visibility_percentage: number
}

export interface VisibilityByQueryResponse {
  brand: string
  queries: QueryVisibility[]
}
