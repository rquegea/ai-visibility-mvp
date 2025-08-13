"use client"

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/libs/fetcher'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartWrapper } from '@/components/chart-wrapper'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer } from 'recharts'
import { Search, TrendingUp, Eye, Filter, ArrowUpRight } from 'lucide-react'
import { useGlobalFilters, buildGlobalQueryParams } from '@/stores/use-global-filters'

interface QueryData {
  id: number
  query: string
  topic: string
  total_mentions: number
  brand_mentions: number
  visibility_percentage: number
  avg_sentiment: number
  query_short: string
}

interface VisibilityStats {
  total_queries: number
  active_queries: number
  top_performing_query: QueryData | null
}

interface QueryVisibilityData {
  brand: string
  time_range: string
  global_visibility: number
  total_mentions: number
  brand_mentions: number
  queries: QueryData[]
  stats: VisibilityStats
}

interface TimelinePoint {
  date: string
  total_mentions: number
  brand_mentions: number
  visibility_percentage: number
}

interface QueryVisibilityProps {
  brand: string
  className?: string
}

export function QueryVisibilityChart({ brand, className }: QueryVisibilityProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [topicFilter, setTopicFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'visibility' | 'mentions' | 'sentiment'>('visibility')
  const [selectedQuery, setSelectedQuery] = useState<QueryData | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Obtener filtros globales
  const globalFilters = useGlobalFilters()
  const queryParams = buildGlobalQueryParams(globalFilters)

  // Fetch main data
  const { data, isLoading, error } = useSWR<QueryVisibilityData>(
    `/api/query-visibility?brand=${brand}&${queryParams}`,
    fetcher
  )

  // Fetch timeline for selected query
  const { data: timeline } = useSWR<{ timeline: TimelinePoint[] }>(
    selectedQuery ? `/api/query-visibility/${brand}/timeline?query_id=${selectedQuery.id}` : null,
    fetcher
  )

  // Process and filter data
  const { filteredQueries, availableTopics } = useMemo(() => {
    if (!data?.queries) return { filteredQueries: [], availableTopics: [] }

    const topics = [...new Set(data.queries.map(q => q.topic))]
    
    let filtered = data.queries.filter(query => {
      const matchesSearch = query.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           query.topic.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTopic = topicFilter === 'all' || query.topic === topicFilter
      return matchesSearch && matchesTopic
    })

    // Sort queries
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'visibility':
          return b.visibility_percentage - a.visibility_percentage
        case 'mentions':
          return b.total_mentions - a.total_mentions
        case 'sentiment':
          return (b.avg_sentiment || 0) - (a.avg_sentiment || 0)
        default:
          return b.visibility_percentage - a.visibility_percentage
      }
    })

    return { filteredQueries: filtered, availableTopics: topics }
  }, [data?.queries, searchTerm, topicFilter, sortBy])

  // Chart data for main visualization
  const chartData = useMemo(() => {
    if (!filteredQueries) return []
    
    return filteredQueries.slice(0, 10).map((query, index) => ({
      name: `Query ${String.fromCharCode(65 + index)}`, // A, B, C, D...
      fullQuery: query.query,
      visibility: query.visibility_percentage,
      mentions: query.total_mentions,
      brandMentions: query.brand_mentions,
      topic: query.topic,
      queryId: query.id
    }))
  }, [filteredQueries])

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading query visibility data: {error.message}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {brand} Visibility % per Query
              {data && (
                <Badge variant="outline" className="ml-2">
                  {data.time_range}
                </Badge>
              )}
            </CardTitle>
            {data && (
              <p className="text-sm text-muted-foreground mt-1">
                Global visibility: {data.global_visibility}% ({data.brand_mentions} of {data.total_mentions} mentions)
              </p>
            )}
          </div>
          
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Query Visibility Analysis - {brand}</DialogTitle>
              </DialogHeader>
              <QueryDetailsPanel 
                data={data}
                filteredQueries={filteredQueries}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                topicFilter={topicFilter}
                setTopicFilter={setTopicFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                availableTopics={availableTopics}
                onQuerySelect={setSelectedQuery}
                selectedQuery={selectedQuery}
                timeline={timeline?.timeline}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-[300px] w-full" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        ) : data ? (
          <>
            {/* Main Chart - SOLO TOOLTIP EN HOVER */}
            <ChartWrapper className="h-[300px] mb-6">
              <BarChart data={chartData} margin={{ left: 0, right: 0, top: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  height={40}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white border rounded-lg shadow-lg p-3 max-w-sm">
                          <p className="font-medium text-sm mb-1">{data.fullQuery}</p>
                          <p className="text-xs text-muted-foreground mb-2">Topic: {data.topic}</p>
                          <div className="space-y-1 text-xs">
                            <p>Visibility: <span className="font-bold text-blue-600">{data.visibility}%</span></p>
                            <p>Brand mentions: <span className="font-bold">{data.brandMentions}</span></p>
                            <p>Total mentions: <span className="font-bold">{data.mentions}</span></p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar 
                  dataKey="visibility" 
                  fill="#6366f1"
                  radius={[2, 2, 0, 0]}
                  // ❌ ELIMINADO onClick - Solo hover tooltip
                />
              </BarChart>
            </ChartWrapper>

            {/* Quick Stats - ACTIVE QUERIES ES CLICKEABLE */}
            <div className="grid grid-cols-3 gap-4">
              <div 
                className="text-center p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setShowDetails(true)}
              >
                <div className="text-lg font-bold flex items-center justify-center gap-1">
                  {data.stats.active_queries}
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xs text-muted-foreground">Active Queries</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-bold">{data.global_visibility}%</div>
                <div className="text-xs text-muted-foreground">Avg Visibility</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-lg font-bold">
                  {data.stats.top_performing_query?.visibility_percentage || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Best Query</div>
              </div>
            </div>

            {/* ❌ ELIMINADA SECCIÓN "Query Details" */}
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No data available for {brand}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Component for detailed analysis panel
function QueryDetailsPanel({ 
  data, 
  filteredQueries, 
  searchTerm, 
  setSearchTerm, 
  topicFilter, 
  setTopicFilter, 
  sortBy, 
  setSortBy, 
  availableTopics,
  onQuerySelect,
  selectedQuery,
  timeline
}: {
  data?: QueryVisibilityData
  filteredQueries: QueryData[]
  searchTerm: string
  setSearchTerm: (term: string) => void
  topicFilter: string
  setTopicFilter: (filter: string) => void
  sortBy: 'visibility' | 'mentions' | 'sentiment'
  setSortBy: (sort: 'visibility' | 'mentions' | 'sentiment') => void
  availableTopics: string[]
  onQuerySelect: (query: QueryData) => void
  selectedQuery: QueryData | null
  timeline?: TimelinePoint[]
}) {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {availableTopics.map(topic => (
              <SelectItem key={topic} value={topic}>{topic}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="visibility">Visibility</SelectItem>
            <SelectItem value="mentions">Mentions</SelectItem>
            <SelectItem value="sentiment">Sentiment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queries Table */}
        <div className="space-y-3">
          <h4 className="font-medium">Queries ({filteredQueries.length})</h4>
          <div className="border rounded-lg max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left p-3">Query</th>
                  <th className="text-right p-3">Visibility</th>
                  <th className="text-right p-3">Mentions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueries.map((query) => (
                  <tr 
                    key={query.id} 
                    className={`border-b hover:bg-muted/50 cursor-pointer ${
                      selectedQuery?.id === query.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onQuerySelect(query)}
                  >
                    <td className="p-3">
                      <div>
                        <div className="font-medium truncate max-w-xs">
                          {query.query_short}
                        </div>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {query.topic}
                        </Badge>
                      </div>
                    </td>
                    <td className="text-right p-3">
                      <span className="font-medium">{query.visibility_percentage}%</span>
                    </td>
                    <td className="text-right p-3">
                      <span className="text-muted-foreground">
                        {query.brand_mentions}/{query.total_mentions}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Query Details */}
        <div className="space-y-3">
          <h4 className="font-medium">
            {selectedQuery ? 'Query Timeline' : 'Select a query for timeline'}
          </h4>
          
          {selectedQuery ? (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/30">
                <h5 className="font-medium text-sm mb-2">{selectedQuery.query}</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Visibility:</span>
                    <span className="ml-2 font-medium">{selectedQuery.visibility_percentage}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sentiment:</span>
                    <span className="ml-2 font-medium">
                      {selectedQuery.avg_sentiment > 0 ? '+' : ''}{(selectedQuery.avg_sentiment * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Brand mentions:</span>
                    <span className="ml-2 font-medium">{selectedQuery.brand_mentions}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total mentions:</span>
                    <span className="ml-2 font-medium">{selectedQuery.total_mentions}</span>
                  </div>
                </div>
              </div>

              {timeline && timeline.length > 0 && (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis tickFormatter={(value) => `${value}%`} fontSize={12} />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Visibility']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="visibility_percentage" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-muted-foreground">
              Click on a query to see its timeline
            </div>
          )}
        </div>
      </div>
    </div>
  )
}