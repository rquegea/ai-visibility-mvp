"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Badge } from "@/components/ui/badge"
import { QueryVisibility, VisibilityByQueryResponse } from "@/types"
import { useGlobalFilters, buildGlobalQueryParams } from '@/stores/use-global-filters'

// ELIMINADO: Props manuales, ahora usa filtros globales
interface QueryVisibilityChartProps {
  brand?: string // Mantener solo brand como prop opcional
}

export function QueryVisibilityChart({ brand = "rho" }: QueryVisibilityChartProps) {
  const [data, setData] = useState<QueryVisibility[]>([])
  const [loading, setLoading] = useState(true)
  const [brandName, setBrandName] = useState("Rho")

  // NUEVO: Usar filtros globales
  const globalFilters = useGlobalFilters()
  const queryParams = buildGlobalQueryParams(globalFilters)

  // ACTUALIZADO: useEffect ahora escucha cambios en filtros globales
  useEffect(() => {
    fetchData()
  }, [queryParams, brand]) // Depende de queryParams en lugar de timeRange manual

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // ACTUALIZADO: Usar queryParams globales en lugar de timeRange manual
      const url = `/api/visibility/by-query?${queryParams}&brand=${brand}`
      console.log('QueryVisibilityChart fetching:', url) // Debug
      
      const response = await fetch(url)
      const result: VisibilityByQueryResponse = await response.json()
      
      if (result.queries) {
        setData(result.queries)
        setBrandName(result.brand)
      }
    } catch (error) {
      console.error('Error fetching query visibility:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener color basado en porcentaje
  const getBarColor = (percentage: number) => {
    if (percentage >= 70) return "#10b981" // green-500
    if (percentage >= 40) return "#f59e0b" // amber-500
    if (percentage >= 20) return "#ef4444" // red-500
    return "#6b7280" // gray-500
  }

  // Preparar datos para el gráfico
  const chartData = data.map((item, index) => ({
    name: `Query ${String.fromCharCode(65 + index)}`, // A, B, C, etc.
    percentage: item.visibility_percentage,
    mentions: item.total_mentions,
    brand_mentions: item.brand_mentions,
    query: item.query,
    full_query: item.full_query
  }))

  // NUEVO: Helper para mostrar el rango de tiempo actual
  const getTimeRangeLabel = () => {
    const { timeRange, from, to } = globalFilters
    if (timeRange === 'custom' && from && to) {
      return `${from} to ${to}`
    }
    return timeRange.replace('d', ' days').replace('h', ' hours')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visibility % per Query</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {brandName} Visibility % per Query
          <Badge variant="outline" className="text-xs">
            {getTimeRangeLabel()}
          </Badge>
          {/* NUEVO: Mostrar filtros aplicados */}
          {globalFilters.model !== "All models" && (
            <Badge variant="secondary" className="text-xs">
              {globalFilters.model}
            </Badge>
          )}
          {globalFilters.advanced.sentiment !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {globalFilters.advanced.sentiment}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
                        <p className="font-medium text-sm mb-1">{label}</p>
                        <p className="text-xs text-gray-600 mb-2">"{data.query}"</p>
                        <p className="text-sm">
                          <span className="font-medium">{data.percentage}%</span> visibility
                        </p>
                        <p className="text-xs text-gray-500">
                          {data.brand_mentions} of {data.mentions} mentions
                        </p>
                        {/* NUEVO: Mostrar filtros en tooltip */}
                        <p className="text-xs text-gray-400 mt-1">
                          Filtered by: {getTimeRangeLabel()}
                          {globalFilters.model !== "All models" && ` • ${globalFilters.model}`}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Resumen de queries */}
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium text-gray-700">Query Details:</div>
          {data.slice(0, 3).map((query, index) => (
            <div key={query.query_id} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 max-w-[200px] truncate">
                Query {String.fromCharCode(65 + index)}: {query.full_query}
              </span>
              <Badge 
                variant={query.visibility_percentage >= 50 ? "default" : "secondary"}
                className="ml-2"
              >
                {query.visibility_percentage}%
              </Badge>
            </div>
          ))}
          
          {/* NUEVO: Indicador de filtros activos */}
          {(globalFilters.model !== "All models" || globalFilters.advanced.sentiment !== "all") && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Active filters: {getTimeRangeLabel()}
                {globalFilters.model !== "All models" && ` • ${globalFilters.model}`}
                {globalFilters.advanced.sentiment !== "all" && ` • ${globalFilters.advanced.sentiment}`}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}