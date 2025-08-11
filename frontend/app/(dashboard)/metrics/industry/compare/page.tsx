"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
import { ChartWrapper } from "@/components/chart-wrapper"

type CompetitorPoint = {
  label: string
  logo?: string
  sentiment_avg: number // -1..1
  mentions: number
}

type VisibilityWithCompetitors = {
  competitors?: CompetitorPoint[]
}

export default function CompetitorMapComparePage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d")
  const { data, isLoading } = useSWR<VisibilityWithCompetitors>(
    `/api/visibility?range=${range}`,
    fetcher
  )

  // Build points for chart
  const points = useMemo(() => {
    const rows = data?.competitors ?? []
    return rows.map((r) => ({
      x: r.sentiment_avg,
      y: r.mentions,
      z: Math.max(10, r.mentions), // ZAxis scales bubble size
      label: r.label,
      logo: r.logo,
    }))
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Competitor Map</h1>
          <p className="text-muted-foreground">
            Compare average sentiment and mention volume across competitors.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {range === "7d" ? "Last 7 days" : range === "90d" ? "Last 90 days" : "Last 30 days"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRange("7d")}>Last 7 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRange("30d")}>Last 30 days</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRange("90d")}>Last 90 days</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Industry comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartWrapper className="h-[360px]">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[-1, 1]}
                label={{ value: "Avg Sentiment", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                label={{ value: "Mentions", angle: -90, position: "insideLeft" }}
              />
              <ZAxis dataKey="z" range={[60, 400]} name="Mentions bubble size" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value: number, name) => {
                  if (name === "x") return [`${value.toFixed(2)}`, "Avg Sentiment"]
                  if (name === "y") return [value, "Mentions"]
                  return [value, name]
                }}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as any
                  return p?.label ?? ""
                }}
              />
              <Legend verticalAlign="top" align="right" />
              <Scatter name="Competitors" data={points} fill="#6366f1" />
            </ScatterChart>
          </ChartWrapper>
          {isLoading && (
            <div className="mt-2 text-sm text-muted-foreground">
              Loading competitor data…
            </div>
          )}
          {!isLoading && points.length === 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              No competitor data available for this range.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
