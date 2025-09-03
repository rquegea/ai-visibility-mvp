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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, ExternalLink, MoreHorizontal, LayoutGrid, TableIcon, Flag, Star, FileDown, AlertTriangle } from 'lucide-react'
import SentimentChip from '@/components/sentiment-chip'
import { useSentiment } from '@/hooks/use-sentiment'
import { cn } from "@/lib/utils"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
import { useGlobalFilters, buildGlobalQueryParams } from '@/stores/use-global-filters'

// ------------------------
// Types
// ------------------------
type Mention = {
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

// ------------------------
// Small helpers
// ------------------------
function platformBadge(engine: string) {
  switch (engine.toLowerCase()) {
    case "gpt-4":
      return { emoji: "🤖", label: "GPT-4", color: "bg-green-100 text-green-700" }
    case "pplx-7b-chat":
      return { emoji: "🔍", label: "Perplexity", color: "bg-blue-100 text-blue-700" }
    case "claude":
      return { emoji: "🎭", label: "Claude", color: "bg-purple-100 text-purple-700" }
    default:
      return { emoji: "🤖", label: engine, color: "bg-gray-100 text-gray-700" }
  }
}

function getSentimentLabel(sentiment: number) {
  if (sentiment > 0.2) return "positive"
  if (sentiment < -0.2) return "negative"
  return "neutral"
}

// MEJORADO: Parser inteligente para respuestas de AI
function parseAIResponse(response: string, engine: string) {
  // Limpiar response (quitar <think> blocks de Perplexity)
  let cleanResponse = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  
  // Extraer marcas mencionadas (texto entre ** o en mayúsculas)
  const brandMatches = [
    ...cleanResponse.matchAll(/\*\*(.*?)\*\*/g),
    ...cleanResponse.matchAll(/([A-Z][a-z]+ [A-Z][a-z]+(?:'s)?)/g)
  ]
  const brands = [...new Set(brandMatches.map(m => m[1]).filter(b => 
    b.length > 3 && !['From', 'This', 'The', 'Based', 'According'].includes(b)
  ))].slice(0, 6)
  
  // MEJORADO: Extraer topics/temas importantes además de brands
  const topicMatches = [
    ...cleanResponse.matchAll(/(sustainable|sustainability|eco[- ]friendly|renewable|carbon[- ]neutral|biodegradable|organic|green|recyclable|compostable)/gi),
    ...cleanResponse.matchAll(/(packaging|containers|materials|plastic|paper|cardboard|glass)/gi),
    ...cleanResponse.matchAll(/(innovation|technology|digital|AI|automation|efficiency)/gi),
    ...cleanResponse.matchAll(/(quality|premium|luxury|affordable|budget|cost[- ]effective)/gi),
    ...cleanResponse.matchAll(/(health|wellness|nutrition|fitness|safety)/gi)
  ]
  const topics = [...new Set(topicMatches.map(m => m[1] || m[0]).map(t => t.toLowerCase()))].slice(0, 6)
  
  // Combinar brands y topics para "brandsAndTopics"
  const brandsAndTopics = [...brands, ...topics.map(t => t.charAt(0).toUpperCase() + t.slice(1))]
  
  // MEJORADO: Extraer métricas/números importantes con etiquetas descriptivas
  const rawMetrics = [
    ...cleanResponse.matchAll(/(\d+%|\d+\.\d+%)/g),
    ...cleanResponse.matchAll(/(\$\d+(?:\.\d+)?(?:M|B|K)?)/g),
    ...cleanResponse.matchAll(/(reduced? .* by (\d+%))/gi),
    ...cleanResponse.matchAll(/(increased? .* by (\d+%))/gi),
    ...cleanResponse.matchAll(/((\d+%) reduction in)/gi),
    ...cleanResponse.matchAll(/((\d+%) more)/gi)
  ]
  
  // NUEVO: Crear métricas con etiquetas descriptivas (Opción A)
  const metricsWithLabels = []
  
  // Buscar patrones específicos para crear etiquetas descriptivas
  const reductionMatches = cleanResponse.match(/(\d+%).*?reduction.*?(weight|package|packaging|carbon|footprint)/gi)
  if (reductionMatches) {
    reductionMatches.forEach(match => {
      const percentage = match.match(/(\d+%)/)?.[1]
      if (match.toLowerCase().includes('weight') || match.toLowerCase().includes('package')) {
        metricsWithLabels.push(`${percentage} - Reducción en peso de packaging`)
      } else if (match.toLowerCase().includes('carbon') || match.toLowerCase().includes('footprint')) {
        metricsWithLabels.push(`${percentage} - Reducción en huella de carbono`)
      }
    })
  }
  
  const recyclableMatches = cleanResponse.match(/(100%|(\d+%)).*?(recyclable|compostable|biodegradable)/gi)
  if (recyclableMatches) {
    recyclableMatches.forEach(match => {
      const percentage = match.match(/(\d+%)/)?.[1]
      if (match.toLowerCase().includes('recyclable')) {
        metricsWithLabels.push(`${percentage} - Materiales reciclables`)
      } else if (match.toLowerCase().includes('compostable')) {
        metricsWithLabels.push(`${percentage} - Materiales compostables`)
      }
    })
  }
  
  // Si no encontramos métricas con contexto, usar las métricas básicas
  const basicMetrics = [...new Set(rawMetrics.map(m => m[1] || m[0]))].slice(0, 4)
  const finalMetrics = metricsWithLabels.length > 0 ? metricsWithLabels.slice(0, 4) : basicMetrics
  
  // Dividir en secciones por headers (##, #, **Title**)
  const sections = cleanResponse
    .split(/(?=##?\s|(?:\n|^)\*\*[A-Za-z].*?\*\*(?:\n|$))/g)
    .map(s => s.trim())
    .filter(s => s.length > 50)
    .slice(0, 4) // Max 4 secciones
  
  // Extraer primer párrafo como resumen
  const summary = cleanResponse
    .split('\n\n')[0]
    ?.replace(/^#+\s*/, '')
    ?.slice(0, 300) + (cleanResponse.length > 300 ? '...' : '')
  
  // Detectar insights positivos/negativos
  const positiveWords = /excellent|great|best|top|leader|impressive|outstanding|recommend/gi
  const negativeWords = /poor|bad|worst|disappointing|avoid|terrible|lacking/gi
  
  const positiveInsights = cleanResponse.match(new RegExp(`[^.!?]*(?:${positiveWords.source})[^.!?]*[.!?]`, 'gi'))?.slice(0, 3) || []
  const negativeInsights = cleanResponse.match(new RegExp(`[^.!?]*(?:${negativeWords.source})[^.!?]*[.!?]`, 'gi'))?.slice(0, 3) || []
  
  return {
    summary,
    sections,
    brands,
    topics,
    brandsAndTopics, // NUEVO: Combinación de brands y topics
    metrics: finalMetrics, // MEJORADO: Métricas con etiquetas descriptivas
    positiveInsights,
    negativeInsights,
    cleanText: cleanResponse,
    isStructured: sections.length > 1 || brands.length > 0 || topics.length > 0
  }
}

function sentimentBadgeColor(label: string) {
  if (label === "positive") return "bg-green-100 text-green-700"
  if (label === "negative") return "bg-red-100 text-red-700"
  return "bg-gray-100 text-gray-700"
}

function toCSV(rows: Mention[]) {
  const header = [
    "id",
    "engine",
    "sentiment",
    "score",
    "date",
    "query",
    "response",
    "url",
  ]
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = rows.map((m) =>
    [
      m.id,
      m.engine,
      getSentimentLabel(m.sentiment),
      m.sentiment,
      new Date(m.created_at).toLocaleString(),
      escape(m.query),
      escape(m.response),
      m.source_url || "",
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
  defaultScore,
}: {
  text: string
  defaultScore: number
}) {
  const { data, isLoading } = useSentiment(text)

  if (isLoading) {
    return <Skeleton className="h-6 w-24 rounded-full" />
  }

  const sentiment = data?.sentiment ?? defaultScore ?? 0
  const emotion = data?.emotion ?? "neutral"

  return <SentimentChip sentiment={sentiment} emotion={emotion} />
}

// ------------------------
// Page
// ------------------------
export default function MentionsPage() {
  // Hooks - DENTRO del componente
  const globalFilters = useGlobalFilters()
  const queryParams = buildGlobalQueryParams(globalFilters)
  const { data: mentionsData, isLoading } = useSWR(
    `/api/mentions?${queryParams}&limit=50`,
    fetcher
  )
  
  const ALL_MENTIONS: Mention[] = mentionsData?.mentions || []

  // Local state
  const [query, setQuery] = useState("")
  const [view, setView] = useState<"cards" | "table">("cards")
  const [selectedMention, setSelectedMention] = useState<Mention | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return ALL_MENTIONS.filter((m) => {
      return (
        m.response.toLowerCase().includes(q) ||
        m.query.toLowerCase().includes(q) ||
        m.engine.toLowerCase().includes(q)
      )
    })
  }, [ALL_MENTIONS, query])

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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mentions</h1>
          <p className="text-muted-foreground">Loading mentions...</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
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
              Track and analyze brand mentions across AI engines
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ToggleView />
            <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
              <FileDown className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Active filters indicator */}
        {(globalFilters.model !== "All models" || globalFilters.advanced.sentiment !== "all") && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Active filters:</span>
            {globalFilters.model !== "All models" && (
              <Badge variant="secondary">{globalFilters.model}</Badge>
            )}
            {globalFilters.advanced.sentiment !== "all" && (
              <Badge variant="secondary">{globalFilters.advanced.sentiment}</Badge>
            )}
          </div>
        )}

        {/* Filters row */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Search Mentions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search mentions, queries, or engines..."
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
                      <TableHead>Engine</TableHead>
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
                      const p = platformBadge(m.engine)
                      const sentimentLabel = getSentimentLabel(m.sentiment)
                      return (
                        <TableRow key={m.id} className="align-top">
                          <TableCell>
                            <div className="inline-flex items-center gap-2">
                              <span className={cn("inline-flex items-center justify-center h-6 px-2 rounded-full text-xs font-medium", p.color)}>
                                <span aria-hidden="true">{p.emoji}</span>
                                <span className="ml-1">{p.label}</span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <SentimentCell text={m.response} defaultScore={m.sentiment} />
                          </TableCell>
                          <TableCell>
                            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", sentimentBadgeColor(sentimentLabel))}>
                              {sentimentLabel}
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums">{m.sentiment > 0 ? "+" : ""}{m.sentiment.toFixed(2)}</TableCell>
                          <TableCell className="max-w-[440px]">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm text-foreground/90 line-clamp-2 cursor-help">{m.response}</p>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs leading-relaxed">{m.response}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="whitespace-nowrap max-w-[200px] truncate">{m.query}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {new Date(m.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              {m.source_url ? (
                                <Button asChild variant="ghost" size="sm">
                                  <a href={m.source_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-1" />
                                    View Source
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">No URL</span>
                              )}
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
              const p = platformBadge(m.engine)
              const sentimentLabel = getSentimentLabel(m.sentiment)
              return (
                <Card 
                  key={m.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedMention(m)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center justify-center h-6 px-2 rounded-full text-xs font-medium", p.color)}>
                          <span aria-hidden="true">{p.emoji}</span>
                          <span className="ml-1">{p.label}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", sentimentBadgeColor(sentimentLabel))}>
                          {sentimentLabel}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {m.sentiment > 0 ? "+" : ""}{m.sentiment.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <SentimentChip sentiment={m.sentiment} emotion={m.emotion} />
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-sm text-foreground/90 line-clamp-3">
                      {(() => {
                        // Parse para mostrar contenido más amigable en las cards
                        const parsed = parseAIResponse(m.response, m.engine)
                        if (parsed.summary && parsed.summary.length > 50) {
                          return parsed.summary
                        } else if (parsed.brandsAndTopics.length > 0) {
                          return `Analysis of ${parsed.brandsAndTopics.slice(0, 3).join(', ')}${parsed.brandsAndTopics.length > 3 ? ' and others' : ''}...`
                        } else {
                          // Limpiar <think> para preview
                          const cleanPreview = m.response
                            .replace(/<think>[\s\S]*?<\/think>/g, '')
                            .trim()
                            .slice(0, 150)
                          return cleanPreview + '...'
                        }
                      })()}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground max-w-[180px] truncate" title={m.query}>
                          {m.query}
                        </span>
                        {(() => {
                          const parsed = parseAIResponse(m.response, m.engine)
                          if (parsed.brandsAndTopics.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-1">
                                {parsed.brandsAndTopics.slice(0, 2).map((item, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                    {item}
                                  </span>
                                ))}
                                {parsed.brandsAndTopics.length > 2 && (
                                  <span className="text-xs text-muted-foreground">+{parsed.brandsAndTopics.length - 2}</span>
                                )}
                              </div>
                            )
                          }
                        })()}
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {m.source_url ? (
                          <Button asChild variant="ghost" size="sm">
                            <a href={m.source_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Source
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No URL</span>
                        )}
                        <RowActions m={m} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No mentions found matching your search.</p>
            </CardContent>
          </Card>
        )}

        {/* Modal de detalles */}
        <Dialog open={!!selectedMention} onOpenChange={() => setSelectedMention(null)}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mention Analysis</DialogTitle>
            </DialogHeader>
            {selectedMention && (() => {
              const parsed = parseAIResponse(selectedMention.response, selectedMention.engine)
              return (
                <div className="space-y-6">
                  {/* Header con badges */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className={cn("inline-flex items-center justify-center h-8 px-3 rounded-full text-sm font-medium", 
                      platformBadge(selectedMention.engine).color)}>
                      <span aria-hidden="true">{platformBadge(selectedMention.engine).emoji}</span>
                      <span className="ml-2">{platformBadge(selectedMention.engine).label}</span>
                    </span>
                    
                    <span className={cn("px-3 py-1 rounded-full text-sm font-medium", 
                      sentimentBadgeColor(getSentimentLabel(selectedMention.sentiment)))}>
                      {getSentimentLabel(selectedMention.sentiment)}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <SentimentChip sentiment={selectedMention.sentiment} emotion={selectedMention.emotion} />
                      <span className="text-sm text-muted-foreground">
                        Score: {selectedMention.sentiment > 0 ? "+" : ""}{selectedMention.sentiment.toFixed(3)}
                      </span>
                    </div>
                  </div>

                  {/* Query */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-muted-foreground">QUERY</h4>
                    <p className="text-sm bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      {selectedMention.query}
                    </p>
                  </div>

                  {parsed.isStructured ? (
                    // Vista estructurada e inteligente
                    <div className="space-y-6">
                      {/* Resumen ejecutivo */}
                      {parsed.summary && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm text-muted-foreground">📋 EXECUTIVE SUMMARY</h4>
                          <p className="text-sm bg-green-50 border border-green-200 p-3 rounded-lg leading-relaxed">
                            {parsed.summary}
                          </p>
                        </div>
                      )}

                      {/* Grid de insights principales */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* MEJORADO: Brands & Topics mencionados */}
                        {parsed.brandsAndTopics.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">🏢 BRANDS & TOPICS MENTIONED</h4>
                            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                              <div className="flex flex-wrap gap-2">
                                {parsed.brandsAndTopics.map((item, i) => (
                                  <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MEJORADO: Métricas clave con etiquetas descriptivas */}
                        {parsed.metrics.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 text-sm text-muted-foreground">📊 KEY METRICS</h4>
                            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                              <div className="space-y-1">
                                {parsed.metrics.map((metric, i) => (
                                  <div key={i} className="text-xs bg-orange-100 px-2 py-1 rounded">
                                    {metric}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Insights positivos y negativos */}
                      {(parsed.positiveInsights.length > 0 || parsed.negativeInsights.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {parsed.positiveInsights.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 text-sm text-muted-foreground">✅ POSITIVE INSIGHTS</h4>
                              <div className="bg-green-50 border border-green-200 p-3 rounded-lg space-y-2">
                                {parsed.positiveInsights.map((insight, i) => (
                                  <p key={i} className="text-xs leading-relaxed">
                                    • {insight.trim()}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                          {parsed.negativeInsights.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 text-sm text-muted-foreground">⚠️ AREAS FOR IMPROVEMENT</h4>
                              <div className="bg-red-50 border border-red-200 p-3 rounded-lg space-y-2">
                                {parsed.negativeInsights.map((insight, i) => (
                                  <p key={i} className="text-xs leading-relaxed">
                                    • {insight.trim()}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Secciones estructuradas */}
                      {parsed.sections.length > 1 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm text-muted-foreground">📑 DETAILED ANALYSIS</h4>
                          <div className="space-y-3">
                            {parsed.sections.slice(0, 3).map((section, i) => {
                              const title = section.match(/^#+\s*(.+?)(?:\n|$)/)?.[1] || 
                                          section.match(/^\*\*(.+?)\*\*/)?.[1] || 
                                          `Section ${i + 1}`
                              const content = section.replace(/^#+\s*.+?(?:\n|$)/, '').replace(/^\*\*.+?\*\*/, '').trim()
                              
                              return (
                                <details key={i} className="bg-gray-50 border rounded-lg">
                                  <summary className="p-3 cursor-pointer font-medium text-sm hover:bg-gray-100 rounded-lg">
                                    {title}
                                  </summary>
                                  <div className="px-3 pb-3 text-xs leading-relaxed text-gray-700">
                                    {content}
                                  </div>
                                </details>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Toggle para ver respuesta completa */}
                      <details className="border-t pt-4">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                          🔍 View Full Raw Response
                        </summary>
                        <div className="mt-3 text-xs bg-gray-50 border p-3 rounded-lg max-h-60 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-mono">{selectedMention.response}</pre>
                        </div>
                      </details>
                    </div>
                  ) : (
                    // Fallback: respuesta simple
                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">RESPONSE</h4>
                      <div className="text-sm bg-gray-50 border p-4 rounded-lg max-h-96 overflow-y-auto">
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {selectedMention.response}
                        </div>
                      </div>
                    </div>
                  )}
                
                  {/* Metadata compacta */}
                  <div>
                    <h4 className="font-semibold mb-3 text-sm text-muted-foreground">📋 METADATA</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-600">Engine</div>
                        <div className="mt-1">{selectedMention.engine}</div>
                      </div>
                      
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-600">Date</div>
                        <div className="mt-1">{new Date(selectedMention.created_at).toLocaleDateString()}</div>
                      </div>
                      
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-600">Language</div>
                        <div className="mt-1">{selectedMention.language}</div>
                      </div>
                      
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-600">Confidence</div>
                        <div className="mt-1">{selectedMention.confidence?.toFixed(2) || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions compactas */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    {selectedMention.source_url && (
                      <Button asChild variant="outline" size="sm">
                        <a href={selectedMention.source_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Source
                        </a>
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => download(`mention-${selectedMention.id}.csv`, toCSV([selectedMention]))}
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(parsed.summary || selectedMention.response)
                      }}
                    >
                      📋 Copy
                    </Button>
                  </div>
                </div>
              )
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}