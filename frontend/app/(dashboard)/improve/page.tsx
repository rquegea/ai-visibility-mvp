"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartWrapper } from "@/components/chart-wrapper"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type PainPoint = { point: string; count: number }
type CTA = { id: number; text: string; done: boolean }
type Matrix = Record<string, { neg: number; neu: number; pos: number }>
type Audience = { tag: string; freq: number; features: string[] }
type TopicsResponse = { words: Array<{ text: string; value: number }>; themes: Array<{ name: string; count: number }> }

export default function ImprovePage() {
  // Pain points extraídos de insights
  const { data: insightsData, isLoading } = useSWR<any[]>(
    "/api/insights",
    fetcher
  )

  // Procesar pain points desde los insights
  const painPoints = useMemo(() => {
    if (!insightsData) return []
    
    const painPointsMap: Record<string, number> = {}
    
    // Extraer pain points de insights de tipo "Risk"
    insightsData
      .filter(insight => insight.category === "Risk")
      .forEach(insight => {
        const title = insight.title || insight.excerpt
        if (title) {
          // Extraer palabras clave como pain points
          if (title.toLowerCase().includes('service')) {
            painPointsMap['Customer Service'] = (painPointsMap['Customer Service'] || 0) + 1
          }
          if (title.toLowerCase().includes('shipping') || title.toLowerCase().includes('delivery')) {
            painPointsMap['Shipping Delays'] = (painPointsMap['Shipping Delays'] || 0) + 1
          }
          if (title.toLowerCase().includes('price') || title.toLowerCase().includes('cost')) {
            painPointsMap['Pricing'] = (painPointsMap['Pricing'] || 0) + 1
          }
          if (title.toLowerCase().includes('quality')) {
            painPointsMap['Product Quality'] = (painPointsMap['Product Quality'] || 0) + 1
          }
          if (title.toLowerCase().includes('return') || title.toLowerCase().includes('refund')) {
            painPointsMap['Returns/Refunds'] = (painPointsMap['Returns/Refunds'] || 0) + 1
          }
        }
      })

    // Convertir a array y ordenar por count
    return Object.entries(painPointsMap)
      .map(([point, count]) => ({ point, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [insightsData])

  const rows = painPoints.length > 0 ? painPoints : [
    { point: "Customer Service", count: 18 },
    { point: "Shipping Delays", count: 15 },
    { point: "Pricing", count: 12 },
    { point: "Product Quality", count: 9 },
    { point: "Returns/Refunds", count: 7 },
  ]

  // CTAs abiertas
  const ctaKey = "/api/insights?type=cta&status=open"
  const { data: ctas, isLoading: ctasLoading, mutate } = useSWR<CTA[]>(ctaKey, fetcher)

  async function onToggle(id: number) {
    const current = ctas ?? []
    const next = current.filter((c) => c.id !== id)
    // Optimistic UI
    mutate(next, { revalidate: false })
    try {
      await fetch(`/api/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      })
      // Revalidate in background
      mutate()
    } catch {
      // Rollback
      mutate(current, { revalidate: false })
    }
  }

  // Feature × Sentiment (usar datos de topics)
  const { data: topicsData, isLoading: matrixLoading } = useSWR<TopicsResponse>(
    "/api/topics",
    fetcher
  )

  // Procesar matriz de sentimientos desde topics
  const matrix = useMemo(() => {
    if (!topicsData?.words) return {}
    
    const matrixData: Matrix = {}
    
    // Simular sentimientos basados en las palabras más frecuentes
    topicsData.words.slice(0, 10).forEach(word => {
      // Simular distribución de sentimientos basada en el valor
      const total = word.value
      const neg = Math.floor(total * 0.2) // 20% negativo
      const pos = Math.floor(total * 0.5) // 50% positivo  
      const neu = total - neg - pos       // resto neutral
      
      matrixData[word.text] = { neg, neu, pos }
    })
    
    return matrixData
  }, [topicsData])

  // Audiencias basadas en temas
  const { data: audienceTopics, isLoading: audLoading } = useSWR<TopicsResponse>(
    "/api/topics",
    fetcher
  )

  const audiences = useMemo(() => {
    if (!audienceTopics?.themes) return []
    
    return audienceTopics.themes.map(theme => ({
      tag: theme.name,
      freq: theme.count * 10, // Escalar para mejor visualización
      features: topicsData?.words.slice(0, 5).map(w => w.text) || []
    }))
  }, [audienceTopics, topicsData])

  const [selectedAudience, setSelectedAudience] = useState<string | null>(null)
  const selected = useMemo(
    () => audiences.find((a) => a.tag === selectedAudience) ?? null,
    [audiences, selectedAudience]
  )

  // Filtrar matriz por audiencia seleccionada
  const matrixEntries = useMemo(() => {
    const entries = Object.entries(matrix ?? {})
    if (!selected) return entries
    const set = new Set(selected.features)
    return entries.filter(([feature]) => set.has(feature))
  }, [matrix, selected])

  // Normalización para intensidad de color
  const maxVal = useMemo(() => {
    let m = 1
    for (const [, v] of matrixEntries) {
      m = Math.max(m, v.neg, v.neu, v.pos)
    }
    return m
  }, [matrixEntries])

  function cellBg(channel: "neg" | "neu" | "pos", value: number) {
    const alpha = Math.max(0.1, Math.min(0.9, value / maxVal))
    if (channel === "neg") return `rgba(239,68,68,${alpha})`   // red-500
    if (channel === "neu") return `rgba(107,114,128,${alpha})` // gray-500
    return `rgba(34,197,94,${alpha})`                          // green-500
  }

  function chipSize(freq: number) {
    if (freq >= 40) return "text-base"
    if (freq >= 25) return "text-sm"
    return "text-xs"
  }

  const isHeatEmpty = !matrixEntries.length && !matrixLoading

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Columna izquierda */}
      <div className="flex-1 w-full space-y-6">
        <h2 className="text-lg font-semibold">Improve – Pain Points</h2>

        {/* Pain points chart */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top pain points (30d)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ChartWrapper className="h-[300px]">
                <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="count" />
                  <YAxis type="category" dataKey="point" width={140} />
                  <Tooltip
                    formatter={(v: number, name: string) => [v, name === "count" ? "Count" : name]}
                    labelFormatter={(l) => String(l)}
                  />
                  <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ChartWrapper>
            )}
          </CardContent>
        </Card>

        {/* CTAs pendientes */}
        <h3 className="text-base font-medium">Calls to Action pendientes</h3>
        <Card className="shadow">
          <CardContent className="p-6 space-y-3">
            {ctasLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-sm" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : (ctas ?? []).length === 0 ? (
              <Alert className="border-green-500/50 text-green-700 dark:text-green-400">
                <AlertTitle>Todo al día</AlertTitle>
              </Alert>
            ) : (
              <ul className="space-y-2">
                {(ctas ?? []).map((cta) => (
                  <li key={cta.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`cta-${cta.id}`}
                      onCheckedChange={() => onToggle(cta.id)}
                      aria-label={`Marcar "${cta.text}" como hecho`}
                    />
                    <Label
                      htmlFor={`cta-${cta.id}`}
                      className="leading-relaxed cursor-pointer text-sm md:text-base"
                    >
                      {cta.text}
                    </Label>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Columna derecha */}
      <div className="w-full md:w-[380px] space-y-6">
        {/* Feature × Sentiment */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Feature × Sentiment</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {matrixLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : isHeatEmpty ? (
              <div className="text-sm text-muted-foreground">No hay datos para mostrar.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead className="w-24 text-center">Neg</TableHead>
                      <TableHead className="w-24 text-center">Neu</TableHead>
                      <TableHead className="w-24 text-center">Pos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrixEntries.map(([feature, vals]) => (
                      <TableRow key={feature}>
                        <TableCell className="whitespace-nowrap">{feature}</TableCell>
                        <TableCell className="text-center">
                          <div
                            className="rounded-md px-2 py-1 text-xs font-medium"
                            style={{ backgroundColor: cellBg("neg", vals.neg), color: "#fff" }}
                            title={`Neg: ${vals.neg}`}
                          >
                            {vals.neg}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div
                            className="rounded-md px-2 py-1 text-xs font-medium"
                            style={{ backgroundColor: cellBg("neu", vals.neu), color: "#fff" }}
                            title={`Neu: ${vals.neu}`}
                          >
                            {vals.neu}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div
                            className="rounded-md px-2 py-1 text-xs font-medium"
                            style={{ backgroundColor: cellBg("pos", vals.pos), color: "#fff" }}
                            title={`Pos: ${vals.pos}`}
                          >
                            {vals.pos}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audiencias */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Audiencias</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {audLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {audiences.map((a) => {
                  const active = a.tag === selectedAudience
                  return (
                    <button
                      key={a.tag}
                      onClick={() => setSelectedAudience(active ? null : a.tag)}
                      className="focus:outline-none"
                      aria-pressed={active}
                    >
                      <Badge
                        variant={active ? "default" : "outline"}
                        className={`px-3 ${chipSize(a.freq)} select-none`}
                        title={`Freq: ${a.freq}`}
                      >
                        {a.tag}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
            {selected && (
              <div className="mt-3 text-xs text-muted-foreground">
                Filtrando por: <span className="font-medium">{selected.tag}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
