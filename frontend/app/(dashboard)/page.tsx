"use client"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
import type { VisibilityAPI } from "@/types"
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

// Types for Topics API
type TopicWord = { text: string; value: number }
type TopicTheme = { name: string; count: number }
type TopicsPayload = { words: TopicWord[]; themes: TopicTheme[] }
type Word = { text: string; value: number }

const wordsMock: Word[] = [
  { text: "Expense Management", value: 72 },
  { text: "Cashback", value: 71 },
  { text: "Corporate Cards", value: 65 },
  { text: "ERP Integration", value: 53 },
  { text: "Rewards", value: 58 },
  { text: "Travel", value: 49 },
  { text: "Reconciliation", value: 38 },
  { text: "Virtual Cards", value: 33 },
  { text: "Credit Limits", value: 44 },
  { text: "FX Fees", value: 28 },
  { text: "Approval Flows", value: 26 },
  { text: "Spend Controls", value: 47 },
]

export default function DashboardPage() {
  const { data: visibility, isLoading } = useSWR<VisibilityAPI>("/api/visibility", fetcher)
  const { data: topics, isLoading: topicsLoading } = useSWR<TopicsPayload>("/api/topics?range=7d", fetcher)
  const [sentimentSeries, setSentimentSeries] = useState<{ date: string; sentiment: number }[] | null>(null)
  
  // NEW: Mock ranking type and SWR
  type RankingRow = { position: number; name: string; delta: number; score: number; logo: string }
  const { data: ranking, isLoading: rankingLoading } = useSWR<RankingRow[]>("/api/visibility/mock", fetcher)
  
  const themeList = useMemo(
    () =>
      (topics?.themes ??
        [...wordsMock]
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
          .map(w => ({ name: w.text, count: w.value }))),
    [topics]
  )

  useEffect(() => {
    // Last 7 days with a slight sinus wave around 0.6
    const days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - idx))
      const label = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })
      const base = 0.6
      const amp = 0.15
      const val = Math.max(0, Math.min(1, base + amp * Math.sin(idx * (Math.PI / 6))))
      return { date: label, sentiment: Number(val.toFixed(2)) }
    })
    
    // Simulate async load for Skeleton visibility
    const t = setTimeout(() => {
      setSentimentSeries(days)
    }, 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <HomeToolbar />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Mentions (24h)" value="1,234" change={12.5} icon={MessageSquare} />
        <KpiCard title="Positive Sentiment" value="78%" change={5.2} icon={TrendingUp} />
        <KpiCard title="Alerts Triggered" value="3" change={-25} icon={AlertTriangle} />
        <KpiCard title="Active Queries" value="12" change={0} icon={Search} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NEW: Query Visibility Chart */}
        <QueryVisibilityChart timeRange="7d" brand="lotus" />

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Trend (Last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {!sentimentSeries ? (
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
                  <Tooltip />
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
        </p>
      </div>

      {isLoading ? (
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
          {/* 1) Visibility score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Visibility score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold tabular-nums">
                  {(visibility?.visibility_score ?? 89.8).toFixed(1)}%
                </div>
                <DeltaPill delta={visibility?.delta ?? 1.0} />
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

          {/* 2) Brand Industry Ranking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Brand Industry Ranking</CardTitle>
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
                  {(visibility?.ranking ?? []).map((row) => (
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
                  ))}
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
            <WordCloud words={topics?.words ?? wordsMock} height={240} />
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top themes</CardTitle>
              </CardHeader>
              <CardContent>
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