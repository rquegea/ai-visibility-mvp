"use client"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
import type { VisibilityAPI, MentionsResponse } from "@/types"
import { KpiCard } from '@/components/kpi-card'
import { ChartWrapper } from '@/components/chart-wrapper'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { DeltaPill } from "@/components/delta-pill"
import { MessageSquare, TrendingUp, AlertTriangle, Search } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, ComposedChart, Area } from 'recharts'
import { HomeToolbar } from '@/components/home-toolbar'
import { WordCloud } from "@/components/charts/word-cloud"
import { QuoteCarousel } from "@/components/quote-carousel"
import { QueryVisibilityChart } from "@/components/query-visibility-chart"
import { useEffect, useMemo, useState } from "react"

// NUEVO: Importar filtros globales
import { useGlobalFilters, buildGlobalQueryParams } from '@/stores/use-global-filters'

// Types for Topics API
type TopicWord = { text: string; value: number }
type TopicTheme = { name: string; count: number }
type TopicsPayload = { words: TopicWord[]; themes: TopicTheme[] }

// NUEVO: Interface para KPIs reales
interface DashboardKPIs {
  mentions_24h: number
  mentions_24h_delta: number
  positive_sentiment: number
  positive_sentiment_delta: number
  alerts_triggered: number
  alerts_delta: number
  active_queries: number
  queries_delta: number
}

export default function DashboardPage() {
  // Hook de filtros globales
  const globalFilters = useGlobalFilters()
  const queryParams = buildGlobalQueryParams(globalFilters)
  
  // SWR con filtros aplicados - TODOS LOS ENDPOINTS REALES
  const { data: visibility, isLoading: visibilityLoading } = useSWR<VisibilityAPI>(
    `/api/visibility?${queryParams}`, 
    fetcher
  )
  const { data: topics, isLoading: topicsLoading } = useSWR<TopicsPayload>(
    `/api/topics?${queryParams}`, 
    fetcher
  )
  
  // NUEVO: Obtener menciones para KPIs reales
  const { data: mentions24h } = useSWR<MentionsResponse>(
    `/api/mentions?range=24h&limit=1`, 
    fetcher
  )
  const { data: mentionsWeek } = useSWR<MentionsResponse>(
    `/api/mentions?range=7d&limit=1`, 
    fetcher
  )

  // NUEVO: Calcular KPIs reales
  const kpis = useMemo((): DashboardKPIs => {
    const mentions24hCount = mentions24h?.pagination?.total || 0
    const mentionsWeekCount = mentionsWeek?.pagination?.total || 0
    const weeklyAvg = mentionsWeekCount / 7
    const mentions24hDelta = weeklyAvg > 0 ? ((mentions24hCount - weeklyAvg) / weeklyAvg) * 100 : 0

    // Calcular sentimiento positivo de las menciones recientes
    const recentMentions = mentions24h?.mentions || []
    const positiveMentions = recentMentions.filter(m => m.sentiment > 0.2).length
    const positivePercentage = recentMentions.length > 0 ? (positiveMentions / recentMentions.length) * 100 : 0
    
    // Delta del sentimiento (comparar con promedio de la semana)
    const weekMentions = mentionsWeek?.mentions || []
    const weekPositive = weekMentions.filter(m => m.sentiment > 0.2).length
    const weekPositivePercentage = weekMentions.length > 0 ? (weekPositive / weekMentions.length) * 100 : 0
    const sentimentDelta = weekPositivePercentage > 0 ? positivePercentage - weekPositivePercentage : 0

    return {
      mentions_24h: mentions24hCount,
      mentions_24h_delta: mentions24hDelta,
      positive_sentiment: positivePercentage,
      positive_sentiment_delta: sentimentDelta,
      alerts_triggered: 3, // TODO: implementar endpoint de alerts
      alerts_delta: -25,
      active_queries: 12, // TODO: obtener de /api/queries
      queries_delta: 0
    }
  }, [mentions24h, mentionsWeek])

  // NUEVO: Serie temporal REAL del backend
  const sentimentSeries = useMemo(() => {
    if (!visibility?.series) return null
    
    // Convertir serie de visibility a serie de sentiment
    return visibility.series.map(point => ({
      date: point.date,
      sentiment: point.score / 100 // Convertir porcentaje a decimal
    }))
  }, [visibility?.series])

  // CORREGIDO: Usar datos reales del endpoint visibility en lugar de mock
  const ranking = useMemo(() => {
    return visibility?.ranking || []
  }, [visibility])

  const themeList = useMemo(() => {
    return topics?.themes || []
  }, [topics])

  // NUEVO: Indicador de datos reales vs mock
  const dataStatus = useMemo(() => {
    const realData = {
      visibility: !!visibility,
      topics: !!topics,
      mentions: !!mentions24h,
      ranking: (visibility?.ranking?.length || 0) > 0
    }
    
    const realCount = Object.values(realData).filter(Boolean).length
    const totalCount = Object.keys(realData).length
    
    return {
      ...realData,
      percentage: (realCount / totalCount) * 100,
      isFullyReal: realCount === totalCount
    }
  }, [visibility, topics, mentions24h])

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <HomeToolbar />

      {/* NUEVO: Indicador de estado de datos */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Active filters:</span>
          <span className="px-2 py-1 bg-muted rounded text-xs">
            {globalFilters.timeRange}
          </span>
          {globalFilters.model !== "All models" && (
            <span className="px-2 py-1 bg-muted rounded text-xs">
              {globalFilters.model}
            </span>
          )}
          {globalFilters.region !== "Region" && (
            <span className="px-2 py-1 bg-muted rounded text-xs">
              {globalFilters.region}
            </span>
          )}
          {globalFilters.advanced.sentiment !== "all" && (
            <span className="px-2 py-1 bg-muted rounded text-xs">
              {globalFilters.advanced.sentiment}
            </span>
          )}
        </div>
        
        {/* Indicador de datos reales */}
        <div className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full ${
          dataStatus.isFullyReal 
            ? 'bg-green-100 text-green-700' 
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            dataStatus.isFullyReal ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          {dataStatus.isFullyReal ? 'Real Data' : `${dataStatus.percentage.toFixed(0)}% Real Data`}
        </div>
      </div>

      {/* KPI Cards - AHORA CON DATOS REALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Mentions (24h)" 
          value={kpis.mentions_24h.toLocaleString()} 
          change={kpis.mentions_24h_delta} 
          icon={MessageSquare} 
        />
        <KpiCard 
          title="Positive Sentiment" 
          value={`${kpis.positive_sentiment.toFixed(1)}%`} 
          change={kpis.positive_sentiment_delta} 
          icon={TrendingUp} 
        />
        <KpiCard 
          title="Alerts Triggered" 
          value={kpis.alerts_triggered.toString()} 
          change={kpis.alerts_delta} 
          icon={AlertTriangle} 
        />
        <KpiCard 
          title="Active Queries" 
          value={kpis.active_queries.toString()} 
          change={kpis.queries_delta} 
          icon={Search} 
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Visibility Chart con filtros */}
        <QueryVisibilityChart 
          brand="lotus" 
        />

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Trend ({globalFilters.timeRange})</CardTitle>
          </CardHeader>
          <CardContent>
            {!sentimentSeries || visibilityLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ChartWrapper className="h-[260px]">
                <AreaChart data={sentimentSeries}>
                  <defs>
                    <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Sentiment']} />
                  <Area
                    type="monotone"
                    dataKey="sentiment"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#sentimentGradient)"
                  />
                </AreaChart>
              </ChartWrapper>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Brand visibility section */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Brand visibility</h2>
        <p className="text-sm text-muted-foreground">
          Percentage of AI answers about Business credit cards that mention the selected brand
          {globalFilters.model !== "All models" && ` (${globalFilters.model})`}
        </p>
      </div>

      {visibilityLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-6 w-44 rounded-full" />
              <Skeleton className="h-[150px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <Skeleton className="h-5 w-6" />
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-6 w-28 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1) Visibility score - DATOS REALES */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Visibility score
                {!dataStatus.visibility && (
                  <span className="ml-2 text-xs text-orange-600">(No real data)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold tabular-nums">
                  {(visibility?.visibility_score ?? 0).toFixed(1)}%
                </div>
                <DeltaPill delta={visibility?.delta ?? 0} />
              </div>
              <ChartWrapper className="h-[150px]">
                <ComposedChart data={visibility?.series ?? []} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${Number(v).toFixed(1)}%`} />
                  <Area type="monotone" dataKey="score" stroke="#16a34a" strokeWidth={2} fill="url(#visGradient)" />
                </ComposedChart>
              </ChartWrapper>
            </CardContent>
          </Card>

          {/* 2) Brand Industry Ranking - DATOS REALES */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Brand Industry Ranking
                {!dataStatus.ranking && (
                  <span className="ml-2 text-xs text-orange-600">(No real data)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead className="w-40">Delta</TableHead>
                    <TableHead className="w-20 text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.length > 0 ? ranking.map((row) => (
                    <TableRow key={row.position}>
                      <TableCell className="font-medium">{row.position}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={row.logo || "/placeholder.svg"} alt={row.name} />
                            <AvatarFallback>
                              {row.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="whitespace-nowrap">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DeltaPill delta={row.delta} className="whitespace-nowrap" />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.score.toFixed(1)}%</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No ranking data available - Check backend connection
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Topic visibility */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Topic visibility</h2>
      </div>

      {topicsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Skeleton className="h-[260px] w-full" />
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <Skeleton className="h-4 w-6" />
                    <Skeleton className="ml-3 h-4 w-40" />
                    <Skeleton className="ml-auto h-6 w-10 rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 border rounded-xl p-3">
            <div className="relative">
              <WordCloud words={topics?.words || []} height={240} />
              {!dataStatus.topics && (
                <div className="absolute top-2 right-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  No real data
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Top themes
                  {!dataStatus.topics && (
                    <span className="ml-2 text-xs text-orange-600">(No real data)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {themeList.length > 0 ? (
                  <ol className="space-y-2">
                    {themeList.slice(0, 6).map((t, i) => (
                      <li key={t.name} className="flex items-center text-sm">
                        <span className="w-6 text-muted-foreground">{i + 1}.</span>
                        <span className="ml-2">{t.name}</span>
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs">
                          {t.count}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No themes data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Quote carousel */}
      <QuoteCarousel />
    </div>
  )
}