"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, Globe, SlidersHorizontal, Sparkles } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useGlobalFilters, type TimeRange } from "@/stores/use-global-filters"

const timeOptions: { key: TimeRange; label: string }[] = [
  { key: "24h", label: "Last 24 hours" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "custom", label: "Custom range" },
]

export function GlobalFilterBar() {
  const {
    timeRange,
    from,
    to,
    setTimeRange,
    setCustomRange,
    model,
    setModel,
    region,
    setRegion,
    advanced,
    setAdvanced,
  } = useGlobalFilters()

  // local state for custom range picker
  const [openCustom, setOpenCustom] = useState(false)
  const [draftFrom, setDraftFrom] = useState(from ?? "")
  const [draftTo, setDraftTo] = useState(to ?? "")

  // segmented button style
  const pill = (active: boolean) =>
    cn(
      "rounded-full border transition-colors duration-200",
      "px-4 py-2 text-sm",
      active
        ? "bg-secondary text-foreground border-border"
        : "bg-card hover:bg-muted border-border"
    )

  // Right-hand pill style
  const rightPill = cn(
    "rounded-full border border-border bg-card hover:bg-muted",
    "px-4 py-2 text-sm transition-colors duration-200 inline-flex items-center"
  )

  const timeLabel = useMemo(() => {
    if (timeRange !== "custom") {
      return timeOptions.find((o) => o.key === timeRange)?.label ?? "Last 7 days"
    }
    if (from || to) return `Custom: ${from ?? "…"} – ${to ?? "…"}`
    return "Custom range"
  }, [timeRange, from, to])

  return (
    <div
      role="toolbar"
      aria-label="Global dashboard filters"
      className="flex w-full items-center justify-between gap-3 flex-wrap"
    >
      {/* Left: Segmented time ranges */}
      <div className="flex items-center gap-2 flex-wrap">
        {timeOptions.slice(0, 3).map((opt) => (
          <Button
            key={opt.key}
            variant="ghost"
            className={pill(timeRange === opt.key)}
            onClick={() => setTimeRange(opt.key)}
            aria-pressed={timeRange === opt.key}
          >
            {opt.label}
          </Button>
        ))}

        {/* Custom range with date picker dropdown */}
        <DropdownMenu open={openCustom} onOpenChange={setOpenCustom}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={pill(timeRange === "custom")}
              aria-pressed={timeRange === "custom"}
            >
              {timeLabel}
              <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px]">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Pick a date range</div>
            <div className="px-2 py-2 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="from" className="text-xs">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="to" className="text-xs">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraftFrom("")
                    setDraftTo("")
                    setCustomRange(undefined, undefined)
                    setOpenCustom(false)
                  }}
                >
                  Reset
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // convenience: today
                      const today = new Date().toISOString().slice(0, 10)
                      setDraftFrom(today)
                      setDraftTo(today)
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCustomRange(draftFrom || undefined, draftTo || undefined)
                      setOpenCustom(false)
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Presets</div>
            <DropdownMenuItem onClick={() => { setTimeRange("24h"); setOpenCustom(false) }}>
              Last 24 hours
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTimeRange("7d"); setOpenCustom(false) }}>
              Last 7 days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setTimeRange("30d"); setOpenCustom(false) }}>
              Last 30 days
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right: Model, Region, Advanced Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Models */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={rightPill}>
              <Sparkles className="mr-2 h-4 w-4" />
              {model}
              <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All models", "GPT-4o", "Llama 3.1", "Claude 3.5"].map((m) => (
              <DropdownMenuItem key={m} onClick={() => setModel(m)}>
                {m}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Region */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={rightPill}>
              <Globe className="mr-2 h-4 w-4" />
              {region}
              <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["Region", "Global", "US", "EU", "APAC"].map((r) => (
              <DropdownMenuItem key={r} onClick={() => setRegion(r)}>
                {r}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Advanced Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={rightPill}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filter
              <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Sentiment</div>
            {[
              { key: "all", label: "All" },
              { key: "positive", label: "Positive" },
              { key: "neutral", label: "Neutral" },
              { key: "negative", label: "Negative" },
            ].map((o) => (
              <DropdownMenuItem
                key={o.key}
                onClick={() => setAdvanced({ sentiment: o.key as any })}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "size-3 rounded-full border",
                      advanced.sentiment === o.key ? "bg-foreground" : "bg-background"
                    )}
                    aria-checked={advanced.sentiment === o.key}
                    role="radio"
                  />
                  <span>{o.label}</span>
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <div className="px-2 py-1.5 text-xs text-muted-foreground">Sources</div>
            <div className="px-2 py-2 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={advanced.hideBots}
                  onCheckedChange={(v) => setAdvanced({ hideBots: Boolean(v) })}
                />
                Hide bots
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={advanced.verifiedOnly}
                  onCheckedChange={(v) => setAdvanced({ verifiedOnly: Boolean(v) })}
                />
                Verified sources only
              </label>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default GlobalFilterBar
