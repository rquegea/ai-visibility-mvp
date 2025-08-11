import { NextResponse } from "next/server"

function simpleHeuristic(text: string) {
  const t = text.toLowerCase()
  const positiveWords = ["amazing", "great", "love", "excelente", "bueno", "fantástico", "happy", "delicious"]
  const negativeWords = ["bad", "terrible", "hate", "decepcionante", "malo", "slow", "disappointing", "late"]

  let score = 0
  for (const w of positiveWords) if (t.includes(w)) score += 0.15
  for (const w of negativeWords) if (t.includes(w)) score -= 0.2
  score = Math.max(-1, Math.min(1, score))

  let emotion = "neutral"
  if (score > 0.2) emotion = "alegría"
  else if (score < -0.2) emotion = "enojo"
  else if (t.includes("wow") || t.includes("increíble")) emotion = "sorpresa"

  const confidence = Math.min(1, Math.abs(score) + 0.6)
  return { sentiment: score, emotion, confidence }
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    const result = simpleHeuristic(String(text ?? ""))
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ sentiment: 0, emotion: "neutral", confidence: 0.5 })
  }
}
