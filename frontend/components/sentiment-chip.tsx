import { cn } from "@/lib/utils"

// Emoji map in Spanish
const EMOJI_BY_EMOTION: Record<string, string> = {
  "alegría": "😊",
  "tristeza": "😢",
  "sorpresa": "😮",
  "enojo": "😠",
  "miedo": "😨",
  "neutral": "🙂",
}

type Props = {
  sentiment: number
  emotion: string
  className?: string
}

export default function SentimentChip({ sentiment, emotion, className }: Props) {
  const bg =
    sentiment > 0.2 ? "bg-green-600" : sentiment < -0.2 ? "bg-red-600" : "bg-neutral-500"

  const emoji = EMOJI_BY_EMOTION[emotion?.toLowerCase()] ?? EMOJI_BY_EMOTION["neutral"]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white",
        bg,
        className
      )}
      title={`Sentiment: ${sentiment.toFixed(2)} • ${emotion}`}
      aria-label={`Sentiment chip ${emotion}`}
    >
      <span aria-hidden="true">{emoji}</span>
      <span className="capitalize">{emotion || "neutral"}</span>
    </span>
  )
}
