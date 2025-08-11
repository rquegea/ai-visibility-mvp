"use client"

import { useCallback, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
Tooltip,
TooltipContent,
TooltipProvider,
TooltipTrigger,
} from "@/components/ui/tooltip"
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, ExternalLink, MoreHorizontal, LayoutGrid, TableIcon, Flag, Star, FileDown, AlertTriangle } from 'lucide-react'
import SentimentChip from '@/components/sentiment-chip'
import { useSentiment } from '@/hooks/use-sentiment'
import { cn } from "@/lib/utils"

// ------------------------
// Mock data (extendable)
// ------------------------
type Mention = {
id: number
source: "Twitter" | "Reddit" | "Instagram" | "News"
text: string
fullText: string
sentimentLabel: "positive" | "neutral" | "negative"
score: number
date: string
url: string
query: string
triggeredAlert?: boolean
}

const ALL_MENTIONS: Mention[] = [
{
  id: 1,
  source: "Twitter",
  text: "Just tried the new cookies — amazing! The chocolate chip ones are my favorite.",
  fullText:
    "Just tried the new cookies from Cookie Co and they're amazing! The chocolate chip ones are my favorite. Definitely ordering more for the office. #cookies #delicious",
  sentimentLabel: "positive",
  score: 0.85,
  date: "2024-01-07 14:30",
  url: "https://twitter.com/user/status/123",
  query: "Brand Mention - Cookies",
  triggeredAlert: true,
},
{
  id: 2,
  source: "Reddit",
  text: "Customer service was disappointing. Waited 2 hours for a response.",
  fullText:
    "Cookie Co's customer service was disappointing. Waited 2 hours for a response to a simple question about my order. Expected better from such a well-known brand.",
  sentimentLabel: "negative",
  score: -0.6,
  date: "2024-01-07 12:15",
  url: "https://reddit.com/r/cookies/comments/abc123",
  query: "Customer Service",
},
{
  id: 3,
  source: "Instagram",
  text: "Moët & Chandon champagne for tonight's celebration 🥂",
  fullText:
    "Moët & Chandon champagne for tonight's celebration 🥂 Nothing beats the classics for special occasions.",
  sentimentLabel: "neutral",
  score: 0.1,
  date: "2024-01-07 11:45",
  url: "https://instagram.com/p/abc123",
  query: "Competitor - Champagne",
},
{
  id: 4,
  source: "News",
  text: "Reports show strong demand for organic dessert lines.",
  fullText:
    "Analysts report sustained demand growth in organic dessert lines across retail channels, suggesting a potential expansion opportunity.",
  sentimentLabel: "positive",
  score: 0.42,
  date: "2024-01-06 09:05",
  url: "https://news.example.com/article/xyz",
  query: "Organic Trends",
},
]

// ------------------------
// Small helpers
// ------------------------
function platformBadge(source: Mention["source"]) {
switch (source) {
  case "Twitter":
    return { emoji: "🐦", label: "Twitter", color: "bg-sky-100 text-sky-700" }
  case "Reddit":
    return { emoji: "👽", label: "Reddit", color: "bg-orange-100 text-orange-700" }
  case "Instagram":
    return { emoji: "📸", label: "Instagram", color: "bg-pink-100 text-pink-700" }
  default:
    return { emoji: "📰", label: "News", color: "bg-indigo-100 text-indigo-700" }
}
}

function sentimentBadgeColor(label: Mention["sentimentLabel"]) {
if (label === "positive") return "bg-green-100 text-green-700"
if (label === "negative") return "bg-red-100 text-red-700"
return "bg-gray-100 text-gray-700"
}

function toCSV(rows: Mention[]) {
const header = [
  "id",
  "source",
  "sentimentLabel",
  "score",
  "date",
  "query",
  "text",
  "url",
]
const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
const lines = rows.map((m) =>
  [
    m.id,
    m.source,
    m.sentimentLabel,
    m.score,
    m.date,
    escape(m.query),
    escape(m.fullText),
    m.url,
  ].join(",")
)
return [header.join(","), ...lines].join("\n")
}

function download(filename: string, content: string, type = "text/csv") {
const blob = new Blob([content], { type })
const url = URL.createObjectURL(blob)
const a = document.createElement("a")
a.href = url
a.download = filename
a.click()
URL.revokeObjectURL(url)
}

// SentimentChip using API (fallback to defaults)
function SentimentCell({
text,
defaultLabel,
defaultScore,
}: {
text: string
defaultLabel: Mention["sentimentLabel"]
defaultScore: number
}) {
const { data, isLoading } = useSentiment(text)

if (isLoading) {
  return <Skeleton className="h-6 w-24 rounded-full" />
}

const sentiment = data?.sentiment ?? defaultScore ?? 0
const emotion = data?.emotion ?? (defaultLabel === "positive" ? "alegría" : defaultLabel === "negative" ? "enojo" : "neutral")

return <SentimentChip sentiment={sentiment} emotion={emotion} />
}

// ------------------------
// Page
// ------------------------
export default function MentionsPage() {
// Header filters
const [query, setQuery] = useState("")
const [view, setView] = useState<"cards" | "table">("cards")

const filtered = useMemo(() => {
  const q = query.toLowerCase()
  return ALL_MENTIONS.filter((m) => {
    return (
      m.text.toLowerCase().includes(q) ||
      m.fullText.toLowerCase().includes(q) ||
      m.query.toLowerCase().includes(q)
    )
  })
}, [query])

const exportCSV = useCallback(() => {
  const csv = toCSV(filtered)
  download("mentions.csv", csv)
}, [filtered])

// Cards/Table toggle
const ToggleView = () => (
  <div className="inline-flex rounded-full border border-border bg-card p-1">
    <Button
      variant={view === "cards" ? "secondary" : "ghost"}
      size="sm"
      className="rounded-full"
      onClick={() => setView("cards")}
    >
      <LayoutGrid className="h-4 w-4 mr-2" /> Cards
    </Button>
    <Button
      variant={view === "table" ? "secondary" : "ghost"}
      size="sm"
      className="rounded-full"
      onClick={() => setView("table")}
    >
      <TableIcon className="h-4 w-4 mr-2" /> Table
    </Button>
  </div>
)

// Row actions (per mention)
function RowActions({ m }: { m: Mention }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => download(`mention-${m.id}.csv`, toCSV([m]))}>
          <FileDown className="w-4 h-4 mr-2" />
          Export row (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => console.log("favorite", m.id)}>
          <Star className="w-4 h-4 mr-2" />
          Favorite
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => console.log("flag", m.id)}>
          <Flag className="w-4 h-4 mr-2" />
          Flag
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

return (
  <TooltipProvider>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Mentions</h1>
          <p className="text-muted-foreground">
            Track and analyze brand mentions across all platforms
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ToggleView />
          <Button variant="outline" onClick={exportCSV}>
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search mentions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {view === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle>Mentions ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Emotion</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const p = platformBadge(m.source)
                    return (
                      <TableRow key={m.id} className="align-top">
                        <TableCell>
                          <div className="inline-flex items-center gap-2">
                            <span className={cn("inline-flex items-center justify-center h-6 px-2 rounded-full text-xs font-medium", p.color)}>
                              <span aria-hidden="true">{p.emoji}</span>
                              <span className="ml-1">{p.label}</span>
                            </span>
                            {m.triggeredAlert && (
                              <Badge className="bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" /> Alert
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <SentimentCell text={m.text} defaultLabel={m.sentimentLabel} defaultScore={m.score} />
                        </TableCell>
                        <TableCell>
                          <span className={cn("px-2 py-1 rounded-full text-xs font-medium", sentimentBadgeColor(m.sentimentLabel))}>
                            {m.sentimentLabel}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">{m.score > 0 ? "+" : ""}{m.score.toFixed(2)}</TableCell>
                        <TableCell className="max-w-[440px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm text-foreground/90 line-clamp-2 cursor-help">{m.fullText}</p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs leading-relaxed">{m.fullText}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{m.query}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{m.date}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <a href={m.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View Source
                              </a>
                            </Button>
                            <RowActions m={m} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </UITable>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Card grid view
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((m) => {
            const p = platformBadge(m.source)
            return (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center justify-center h-6 px-2 rounded-full text-xs font-medium", p.color)}>
                        <span aria-hidden="true">{p.emoji}</span>
                        <span className="ml-1">{p.label}</span>
                      </span>
                      {m.triggeredAlert && (
                        <Badge className="bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Alert
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", sentimentBadgeColor(m.sentimentLabel))}>
                        {m.sentimentLabel}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{m.score > 0 ? "+" : ""}{m.score.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <SentimentCell text={m.text} defaultLabel={m.sentimentLabel} defaultScore={m.score} />
                    <span className="text-xs text-muted-foreground ml-auto">{m.date}</span>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm text-foreground/90 line-clamp-3 cursor-help">{m.fullText}</p>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs leading-relaxed">{m.fullText}</p>
                    </TooltipContent>
                  </Tooltip>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{m.query}</span>
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <a href={m.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Source
                        </a>
                      </Button>
                      <RowActions m={m} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  </TooltipProvider>
)
}
