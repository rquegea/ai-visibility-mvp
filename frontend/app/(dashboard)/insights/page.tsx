'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useGlobalFilters, buildGlobalQueryParams } from '@/stores/use-global-filters'
import { Search, Star, Filter, Grid, BarChart3, FileText, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Insight {
  id: number
  title: string
  category: 'Opportunity' | 'Risk' | 'Trend'
  sentiment: 'positive' | 'negative' | 'neutral'
  excerpt: string
  tags: string[]
  starred: boolean
  date: string
  query?: string
  source?: string
}

interface Quote {
  text: string
  domain: string
  emotion: string
  sentiment?: number
  source_title?: string
}

interface CTA {
  id: number
  text: string
  done: boolean
  source?: string
  created_at?: string
}

export default function InsightsPage() {
  const searchParams = useSearchParams()
  
  // 🎯 USAR FILTROS GLOBALES (como en dashboard y alerts)
  const globalFilters = useGlobalFilters()
  const queryParams = buildGlobalQueryParams(globalFilters)
  
  // Estados para datos
  const [insights, setInsights] = useState<Insight[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [ctas, setCtas] = useState<CTA[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados para UI
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  const [ctaFilter, setCtaFilter] = useState('open')

  // 📡 Función para obtener insights desde el backend real
  const fetchInsights = async () => {
    try {
      setLoading(true)
      
      // 🎯 USAR queryParams del store global
      const params = new URLSearchParams(queryParams)
      params.set('type', activeTab)
      params.set('status', activeTab === 'cta' ? ctaFilter : 'all')
      params.set('limit', '50')
      
      console.log(`📡 Fetching insights with global filters:`, globalFilters)
      console.log(`📡 Full URL: /api/insights?${params}`)
      
      const response = await fetch(`/api/insights?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 Insights data received:', data)
      
      if (activeTab === 'cta') {
        setCtas(data)
      } else if (activeTab === 'quote') {
        setQuotes(data)
      } else {
        setInsights(data)
      }
    } catch (error) {
      console.error('❌ Error fetching insights:', error)
      // En caso de error, limpiar datos para no mostrar mock
      if (activeTab === 'cta') {
        setCtas([])
      } else if (activeTab === 'quote') {
        setQuotes([])
      } else {
        setInsights([])
      }
    } finally {
      setLoading(false)
    }
  }

  // 🚀 Efecto que depende de los filtros globales
  useEffect(() => {
    fetchInsights()
  }, [activeTab, ctaFilter, globalFilters.timeRange, globalFilters.model, globalFilters.region, globalFilters.advanced.sentiment])

  // Función para marcar/desmarcar CTA como completada
  const toggleCTA = async (id: number) => {
    try {
      const cta = ctas.find(c => c.id === id)
      if (!cta) return

      const response = await fetch(`/api/insights/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !cta.done })
      })

      if (response.ok) {
        setCtas(prev => prev.map(c => 
          c.id === id ? { ...c, done: !c.done } : c
        ))
      }
    } catch (error) {
      console.error('Error updating CTA:', error)
    }
  }

  // Filtrar insights por categoría y término de búsqueda
  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || insight.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Opportunity': return 'bg-green-100 text-green-800 border-green-200'
      case 'Risk': return 'bg-red-100 text-red-800 border-red-200'
      case 'Trend': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Insights</h2>
          <p className="text-muted-foreground">
            Explore AI-detected trends, opportunities, and risks.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Grid className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Board
          </Button>
        </div>
      </div>

      {/* 🎯 DEBUG: Mostrar filtros globales para verificar sincronización */}
      <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
        <strong>Debug - Global filters:</strong> Range: {globalFilters.timeRange} | Sentiment: {globalFilters.advanced.sentiment} | Model: {globalFilters.model} | Region: {globalFilters.region}
        <br />
        <strong>Query params:</strong> {queryParams}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="all">
              <FileText className="w-4 h-4 mr-2" />
              All
              <Badge variant="secondary" className="ml-2">{insights.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="quote">
              Quotes
              <Badge variant="secondary" className="ml-2">{quotes.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="cta">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              CTAs
              <Badge variant="secondary" className="ml-2">{ctas.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Filtros específicos por tab */}
          <div className="flex items-center gap-4">
            {activeTab === 'all' && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search insights..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Opportunity">Opportunities</SelectItem>
                    <SelectItem value="Risk">Risks</SelectItem>
                    <SelectItem value="Trend">Trends</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            {activeTab === 'cta' && (
              <Select value={ctaFilter} onValueChange={setCtaFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open CTAs</SelectItem>
                  <SelectItem value="done">Completed</SelectItem>
                  <SelectItem value="all">All CTAs</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tab Contents */}
        <TabsContent value="all" className="space-y-4">
          {filteredInsights.length === 0 && !loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No insights found</h3>
                <p className="text-gray-500 text-center max-w-md">
                  No insights match your current criteria. Try adjusting your filters or search terms.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredInsights.map((insight) => (
                <Card key={insight.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge className={getCategoryColor(insight.category)}>
                        {insight.category}
                      </Badge>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                        <Star className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg leading-tight">{insight.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{insight.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className={getSentimentColor(insight.sentiment)}>
                        {insight.sentiment} sentiment
                      </span>
                      <span>{insight.date}</span>
                    </div>
                    {insight.tags && insight.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {insight.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quote" className="space-y-4">
          {quotes.length === 0 && !loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotes found</h3>
                <p className="text-gray-500 text-center max-w-md">
                  No quotes available for the current filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {quotes.map((quote, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <blockquote className="text-lg italic text-gray-700 mb-4">
                      "{quote.text}"
                    </blockquote>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>From: {quote.domain}</span>
                      <Badge variant="outline">{quote.emotion}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cta" className="space-y-4">
          {ctas.length === 0 && !loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle2 className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No CTAs found</h3>
                <p className="text-gray-500 text-center max-w-md">
                  No call-to-actions available for the current filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {ctas.map((cta) => (
                <Card key={cta.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleCTA(cta.id)}
                        className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          cta.done 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {cta.done && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${cta.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {cta.text}
                        </p>
                        {cta.source && (
                          <p className="text-xs text-gray-500 mt-1">Source: {cta.source}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}