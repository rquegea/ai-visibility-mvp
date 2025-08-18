"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
import { useGlobalFilters, buildGlobalQueryParams } from "@/stores/use-global-filters"
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DeltaPill } from "@/components/delta-pill"
import Image from "next/image"

type RankingRow = {
  pos: number
  name: string
  delta: number
  mentions?: number
  sentiment?: number
  logo?: string
}

type Competitor = {
  name: string
  logo?: string
  sentiment_avg: number
  mentions: number
}

const COLORS = ["#10B981", "#06B6D4", "#F59E0B", "#8B5CF6", "#F43F5E"]
function brandColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props
  const mentions = Number(payload?.mentions ?? 1)
  const minRadius = 6, maxRadius = 24
  const minMentions = 1, maxMentions = 15
  const normalized = Math.min(Math.max(mentions, minMentions), maxMentions)
  const radius = minRadius + (maxRadius - minRadius) * (normalized - minMentions) / (maxMentions - minMentions)
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={payload.color}
      opacity={0.8}
      stroke="rgba(0,0,0,0.1)"
      strokeWidth={1}
    />
  )
}

function TooltipContent({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border rounded shadow-lg">
        <p className="font-semibold">{data.name}</p>
        <p className="text-sm text-muted-foreground">Sentimiento: {Number(data.x).toFixed(3)}</p>
        <p className="text-sm text-muted-foreground">Menciones: {data.mentions}</p>
      </div>
    )
  }
  return null
}

export default function IndustryPage() {
  const globalFilters = useGlobalFilters()
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const globalParams = buildGlobalQueryParams(globalFilters)

  const { data: competitorsData, isLoading: competitorsLoading } = useSWR(
    `/api/industry/competitors?${globalParams}`, fetcher
  )
  const { data: sovData, isLoading: sovLoading } = useSWR(
    `/api/industry/share-of-voice?${globalParams}`, fetcher
  )
  const { data: rankingData, isLoading: rankingLoading } = useSWR(
    `/api/industry/ranking?${globalParams}`, fetcher
  )

  const toggleKey = (k: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  // Competitors -> puntos scatter
  const competitors: Competitor[] = competitorsData?.competitors || []
  const points = useMemo(
    () =>
      competitors.map((c) => ({
        x: Number(c.sentiment_avg ?? 0),
        y: Number(c.mentions ?? 0),
        mentions: Number(c.mentions ?? 0),
        name: c.name,
        logo: c.logo,
        color: brandColor(c.name),
      })),
    [competitors]
  )

  // SOV
  const sovChartData = useMemo(() => {
    return sovData?.data || sovData?.sov_data || []
  }, [sovData])

  const allBrands = useMemo(() => {
    if (!Array.isArray(sovChartData)) return []
    const brands = new Set<string>()
    sovChartData.forEach((day: any) => {
      if (day && typeof day === "object") {
        Object.keys(day).forEach((k) => { if (k !== "date") brands.add(k) })
      }
    })
    return Array.from(brands).slice(0, 6)
  }, [sovChartData])

  const SERIES = useMemo(() => {
    return allBrands.map((b, i) => ({ key: b, color: COLORS[i % COLORS.length] }))
  }, [allBrands])

  // Ranking – mapeo robusto (position/pos, score/mentions, logo opcional)
  const rankingRows: RankingRow[] = useMemo(() => {
    const raw = rankingData?.ranking ?? []
    return raw.map((r: any, i: number) => ({
      pos: r.pos ?? r.position ?? i + 1,
      name: r.name ?? r.brand ?? "—",
      delta: typeof r.delta === "number" ? r.delta : 0,
      mentions: r.score ?? r.mentions ?? undefined,
      sentiment: r.sentiment_avg ?? r.sentiment ?? undefined,
      logo: r.logo,
    }))
  }, [rankingData])

  function SOVLegend() {
    return (
      <div className="flex flex-wrap gap-3 px-1 pb-2">
        {SERIES.map((s) => {
          const isHidden = hidden.has(s.key)
          return (
            <button
              key={s.key}
              onClick={() => toggleKey(s.key)}
              className="inline-flex items-center gap-2 text-xs"
              aria-pressed={isHidden}
              aria-label={`Toggle ${s.key}`}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: isHidden ? "#d4d4d8" : s.color }}
              />
              <span className={isHidden ? "text-muted-foreground line-through" : ""}>{s.key}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Industry – Competitor Map</h2>
        <div className="text-sm text-muted-foreground">Filtros globales: {globalFilters.timeRange}</div>
      </div>

      {/* Competitor Scatter */}
      <Card className="shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Competitor scatter
            {competitorsLoading && <span className="ml-2 text-sm text-muted-foreground">(Cargando...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {competitors.length > 0 ? (
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart margin={{ top: 12, right: 24, bottom: 24, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" domain={[-1, 1]}
                       label={{ value: "Sentimiento medio", position: "insideBottom", offset: -10 }} />
                <YAxis type="number" dataKey="y" label={{ value: "Menciones", angle: -90, position: "insideLeft" }} />
                <Tooltip content={<TooltipContent />} cursor={{ strokeDasharray: "3 3" }} />
                <Legend verticalAlign="top" align="right" />
                <Scatter name="Competitors" data={points} shape={<CustomDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[380px] flex items-center justify-center text-muted-foreground">
              {competitorsLoading ? "Cargando competidores..." : "No hay datos de competidores para el período seleccionado"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share of Voice */}
      <Card className="shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Share of Voice – {globalFilters.timeRange}
            {sovLoading && <span className="ml-2 text-sm text-muted-foreground">(Cargando...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {SERIES.length > 0 && <SOVLegend />}
          <div className="h-[260px]">
            {Array.isArray(sovChartData) && sovChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sovChartData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${Number(value).toFixed(0)}%`, name]}
                    labelFormatter={(label: string) => `Fecha: ${label}`}
                  />
                  {SERIES.map((s) =>
                    hidden.has(s.key) ? null : (
                      <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        stackId="1"
                        stroke={s.color}
                        fill={s.color}
                        fillOpacity={0.2}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    )
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                {sovLoading ? "Cargando share of voice..." : "No hay datos de share of voice para el período seleccionado"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ranking Movements */}
      <Card className="shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Movimientos de Ranking
            {rankingLoading && <span className="ml-2 text-sm text-muted-foreground">(Cargando...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            {rankingRows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead className="w-48">Δ vs semana pasada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingRows.map((r) => (
                    <TableRow key={`${r.name}-${r.pos}`}>
                      <TableCell className="font-medium">{r.pos}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {r.logo ? (
                            <Image src={r.logo} alt="" width={20} height={20} className="rounded" />
                          ) : (
                            <span className="inline-block h-4 w-4 rounded bg-muted" aria-hidden="true" />
                          )}
                          <span className="font-medium">{r.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DeltaPill delta={r.delta} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                {rankingLoading ? "Cargando ranking..." : "No hay datos de ranking para el período seleccionado"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
