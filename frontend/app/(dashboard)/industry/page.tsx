"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from 'lucide-react'
import Image from "next/image"
import { ChartWrapper } from "@/components/chart-wrapper"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DeltaPill } from "@/components/delta-pill"

type RankingRow = {
  name: string
  logo?: string
  sentiment_avg?: number // -1..1
  mentions?: number
}

type MovementRow = { pos: number; name: string; delta: number }

// Simple deterministic brand color by name
const COLORS = ["#10B981", "#06B6D4", "#F59E0B", "#8B5CF6", "#F43F5E"] // emerald, cyan, amber, violet, rose
function brandColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

// Actualizado para usar marcas de galletas reales
const SERIES = [
  { key: "Oreo", color: "#2563eb" }, // blue-600
  { key: "Chips Ahoy", color: "#22c55e" }, // green-500
  { key: "Pepperidge Farm", color: "#f97316" }, // orange-500
  { key: "Girl Scout", color: "#a855f7" }, // violet-500
] as const

function CustomDot(props: any) {
  const { cx, cy, payload } = props
  const y = Number(payload?.y ?? 0)
  const r = Math.max(6, Math.min(32, y / 12)) // sizeDot = y/12 (clamped)
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={payload.color}
      opacity={0.9}
      stroke="rgba(0,0,0,0.08)"
    />
  )
}

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="rounded-md border bg-popover p-3 text-popover-foreground shadow">
      <div className="flex items-center gap-2">
        {p.logo ? (
          <Image
            src={p.logo || "/placeholder.svg?height=20&width=20&query=brand+logo"}
            alt={p.name}
            width={20}
            height={20}
            className="rounded-sm"
          />
        ) : (
          <div className="h-5 w-5 rounded-sm bg-muted" />
        )}
        <div className="font-medium">{p.name}</div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {"Sent: "}{Number(p.x).toFixed(2)}
        {", Mentions: "}{Number(p.y).toLocaleString()}
      </div>
    </div>
  )
}

export default function IndustryPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d")
  const { data } = useSWR<{ ranking?: any[] }>("/api/visibility", fetcher)

  const { data: sov, isLoading: sovLoading } = useSWR<any[]>(
    "/api/mentions?range=90d",
    fetcher
  )

  const { data: moves, isLoading: movesLoading } = useSWR<MovementRow[]>(
    "/api/visibility?range=7d",
    fetcher
  )

  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const toggleKey = (k: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  // Mapear datos reales de /api/visibility a formato esperado
  const rows = data?.ranking?.length ? 
    data.ranking.map((item: any) => ({
      name: item.name,
      logo: item.logo,
      sentiment_avg: (item.delta || 0) / 100, // Convertir delta a sentimiento
      mentions: (item.score || 0) * 10 // Convertir score a número de menciones
    })) :
    [
      { name: "Oreo", logo: "/placeholder.svg", sentiment_avg: 0.15, mentions: 150 },
      { name: "Chips Ahoy!", logo: "/placeholder.svg", sentiment_avg: 0.08, mentions: 80 },
      { name: "Pepperidge Farm", logo: "/placeholder.svg", sentiment_avg: 0.03, mentions: 30 },
      { name: "Girl Scout Cookies", logo: "/placeholder.svg", sentiment_avg: -0.02, mentions: 20 },
      { name: "Tate's", logo: "/placeholder.svg", sentiment_avg: -0.08, mentions: 10 }
    ]

  // Prepare points: { x, y, name, logo, color }
  const points = useMemo(
    () =>
      rows.map((r) => ({
        x: Number(r.sentiment_avg ?? 0),
        y: Number(r.mentions ?? 0),
        name: r.name,
        logo: r.logo,
        color: brandColor(r.name),
      })),
    [rows]
  )

  // Datos de Share of Voice actualizados con marcas de galletas
  const sovFallback = [
    { date: "Aug 04", Oreo: 45, "Chips Ahoy": 25, "Pepperidge Farm": 20, "Girl Scout": 10 },
    { date: "Aug 05", Oreo: 44, "Chips Ahoy": 26, "Pepperidge Farm": 19, "Girl Scout": 11 },
    { date: "Aug 06", Oreo: 46, "Chips Ahoy": 24, "Pepperidge Farm": 21, "Girl Scout": 9 },
    { date: "Aug 07", Oreo: 43, "Chips Ahoy": 27, "Pepperidge Farm": 18, "Girl Scout": 12 },
    { date: "Aug 08", Oreo: 45, "Chips Ahoy": 25, "Pepperidge Farm": 20, "Girl Scout": 10 },
    { date: "Aug 09", Oreo: 47, "Chips Ahoy": 23, "Pepperidge Farm": 22, "Girl Scout": 8 },
    { date: "Aug 10", Oreo: 44, "Chips Ahoy": 26, "Pepperidge Farm": 19, "Girl Scout": 11 },
  ]
  const sovData = sov && Array.isArray(sov) && sov.length ? sov : sovFallback

  // Datos de movimientos actualizados con marcas de galletas
  const movesFallback: MovementRow[] = [
    { pos: 1, name: "Oreo", delta: 0 },
    { pos: 2, name: "Chips Ahoy!", delta: +1 },
    { pos: 3, name: "Pepperidge Farm", delta: 0 },
    { pos: 4, name: "Girl Scout Cookies", delta: -1 },
    { pos: 5, name: "Tate's", delta: 0 },
    { pos: 6, name: "Keebler", delta: +1 },
    { pos: 7, name: "Nabisco", delta: -1 },
    { pos: 8, name: "Famous Amos", delta: 0 },
    { pos: 9, name: "Milano", delta: 0 },
    { pos: 10, name: "Archway", delta: +1 },
  ]
  const moveRows = (moves?.length ? moves : movesFallback).slice(0, 10)

  // Custom clickable legend
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
              <span className={isHidden ? "text-muted-foreground line-through" : ""}>
                {s.key}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado + selector rango */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Industry – Competitor Map</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {range === "7d" ? "Last 7d" : range === "90d" ? "Last 90d" : "Last 30d"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRange("7d")}>Last 7d</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRange("30d")}>Last 30d</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRange("90d")}>Last 90d</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Gráfica en Card padd-6 con sombra */}
      <Card className="shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Competitor scatter</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 12, right: 24, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[-1, 1]}
                label={{ value: "Sentimiento medio", position: "insideBottom", offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                label={{ value: "Menciones", angle: -90, position: "insideLeft" }}
              />
              <Tooltip content={<TooltipContent />} cursor={{ strokeDasharray: "3 3" }} />
              <Legend verticalAlign="top" align="right" />
              <Scatter name="Competitors" data={points} shape={<CustomDot />} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Share of Voice – últimos 90 días</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <SOVLegend />
          <ChartWrapper className="h-[260px]">
            <AreaChart data={sovData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip
                formatter={(value: number, name: string) => [`${Number(value).toFixed(0)}%`, name]}
                labelFormatter={(label: string) => `Fecha: ${label}`}
              />
              {/* Stacked areas; only render if not hidden */}
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
          </ChartWrapper>
          {sovLoading && (
            <div className="mt-2 text-sm text-muted-foreground">Cargando series de Share of Voice…</div>
          )}
        </CardContent>
      </Card>
      <Card className="shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Movimientos de Ranking</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="w-48">Δ vs semana pasada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moveRows.map((r) => (
                  <TableRow key={r.pos}>
                    <TableCell className="font-medium">{r.pos}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>
                      <DeltaPill delta={r.delta} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {movesLoading && (
              <div className="mt-2 text-sm text-muted-foreground">
                Cargando movimientos…
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}