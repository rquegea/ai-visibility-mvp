import useSWR from "swr"

export type SentimentResponse = {
  sentiment: number
  emotion: string
  confidence: number
}

export const useSentiment = (text: string) =>
  useSWR<SentimentResponse>(
    text ? ["/api/sentiment", text] : null,
    async ([url, body]) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      })
      if (!res.ok) {
        throw new Error("Sentiment API error")
      }
      return res.json()
    }
  )
