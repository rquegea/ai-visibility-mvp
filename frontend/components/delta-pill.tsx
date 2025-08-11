import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from "@/lib/utils"

export function DeltaPill({
  delta,
  suffix = "vs last week",
  className,
}: {
  delta: number
  suffix?: string
  className?: string
}) {
  const positive = delta >= 0
  const color = positive ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100"
  const Icon = positive ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>
        {positive ? "+" : ""}
        {Math.abs(delta).toFixed(1)}% {suffix}
      </span>
    </span>
  )
}
