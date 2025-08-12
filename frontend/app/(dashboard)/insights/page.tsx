'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const [insights, setInsights] = useState<Insight[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [ctas, setCtas] = useState<CTA[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  const [ctaFilter, setCtaFilter] = useState('open')

  // Leer filtros de la URL (del header global)
  const getFiltersFromURL = () => {
    const range = searchParams.get('range') || '7d'
    const sentiment = searchParams.get('sentiment') || 'all'
    const model = searchParams.get('model') || 'all'
    
    return { range, sentiment, model }
  }

  // Función para obtener insights desde el backend real
  const fetchInsights = async () => {
    try {
      setLoading(true)
      
      // Obtener filtros de la URL
      const filters = getFiltersFromURL()
      
      // Construir query params
      const params = new URLSearchParams({
        type: activeTab,
        status: activeTab === 'cta' ? ctaFilter : 'all',
        limit: '50',
        range: filters.range,
        sentiment: filters.sentiment,
        model: filters.model
      })
      
      console.log(`Fetching insights from: /api/insights?${params}`)
      const response = await fetch(`/api/insights?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Insights data received:', data)
      
      if (activeTab === 'cta') {
        setCtas(data)
      } else if (activeTab === 'quote') {
        setQuotes(data)
      } else {
        setInsights(data)
      }
    } catch (error) {
      console.error('Error fetching insights:', error)
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

  // Cargar datos cuando cambie el tab activo, filtros o parámetros de URL
  useEffect(() => {
    fetchInsights()
  }, [activeTab, ctaFilter, searchParams])

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
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Grid className="mr-2 h-4 w-4" />
            Grid
          </Button>
          <Button variant="ghost" size="sm">
            <BarChart3 className="mr-2 h-4 w-4" />
            Board
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>All</span>
            <Badge variant="secondary" className="ml-1">
              {insights.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="quote" className="flex items-center space-x-2">
            <span>💬</span>
            <span>Quotes</span>
            <Badge variant="secondary" className="ml-1">
              {quotes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cta" className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>CTAs</span>
            <Badge variant="secondary" className="ml-1">
              {ctas.filter(c => !c.done).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* All Insights */}
        <TabsContent value="all" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search insights..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Opportunity">Opportunities</SelectItem>
                <SelectItem value="Risk">Risks</SelectItem>
                <SelectItem value="Trend">Trends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Insights Grid */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading insights...
            </div>
          ) : filteredInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInsights.map((insight) => (
                <Card key={insight.id} className="relative">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <Badge className={getCategoryColor(insight.category)} variant="outline">
                        {insight.category}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Star className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg leading-tight">{insight.title}</CardTitle>
                    <CardDescription className={getSentimentColor(insight.sentiment)}>
                      {insight.date}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {insight.excerpt}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {insight.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {insight.query && (
                      <p className="text-xs text-muted-foreground mt-2 truncate">
                        Query: {insight.query}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No insights found matching your criteria.</p>
            </div>
          )}
        </TabsContent>

        {/* Quotes */}
        <TabsContent value="quote" className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading quotes...
            </div>
          ) : quotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((quote, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <blockquote className="text-sm italic border-l-4 border-blue-200 pl-4">
                        "{quote.text}"
                      </blockquote>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{quote.domain}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {quote.emotion}
                          </Badge>
                          {quote.sentiment !== undefined && (
                            <span className={getSentimentColor(quote.sentiment > 0 ? 'positive' : quote.sentiment < 0 ? 'negative' : 'neutral')}>
                              {quote.sentiment > 0 ? '+' : ''}{quote.sentiment.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No quotes available.</p>
            </div>
          )}
        </TabsContent>

        {/* CTAs */}
        <TabsContent value="cta" className="space-y-6">
          {/* CTA Filter */}
          <div className="flex items-center space-x-4">
            <Select value={ctaFilter} onValueChange={setCtaFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All CTAs</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading CTAs...
            </div>
          ) : ctas.length > 0 ? (
            <div className="space-y-4">
              {ctas.map((cta) => (
                <Card key={cta.id} className={`${cta.done ? 'opacity-60' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCTA(cta.id)}
                        className={`mt-1 ${cta.done ? 'text-green-600' : 'text-gray-400'}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <div className="flex-1">
                        <p className={`text-sm ${cta.done ? 'line-through text-muted-foreground' : ''}`}>
                          {cta.text}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {cta.source || 'ai_analysis'}
                          </Badge>
                          {cta.created_at && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(cta.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No CTAs available.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

