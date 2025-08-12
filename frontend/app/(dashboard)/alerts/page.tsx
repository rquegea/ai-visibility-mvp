'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSearchParams } from 'next/navigation'

interface Alert {
  id: number
  title: string
  description: string
  priority: 'high' | 'medium' | 'low' | 'info'
  status: 'active' | 'resolved'
  source: string
  created_at: string
  metadata?: any
}

interface AlertsResponse {
  alerts: Alert[]
  summary: {
    total: number
    high_priority: number
    active: number
  }
  debug?: any
}

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-gray-100 text-gray-800 border-gray-200'
}

const priorityIcons = {
  high: AlertTriangle,
  medium: Clock,
  low: Bell,
  info: CheckCircle2
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState({ total: 0, high_priority: 0, active: 0 })
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  // Obtener filtros de la URL (igual que en otras páginas)
  const getFiltersFromURL = () => {
    return {
      range: searchParams.get('range') || '7d',
      sentiment: searchParams.get('sentiment') || 'all',
      model: searchParams.get('model') || 'all',
      region: searchParams.get('region') || 'all'
    }
  }

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const filters = getFiltersFromURL()
      
      // Construir URL con filtros
      const params = new URLSearchParams({
        range: filters.range,
        sentiment: filters.sentiment,
        model: filters.model,
        region: filters.region
      })
      
      console.log('🚨 Fetching alerts with filters:', filters)
      
      const response = await fetch(`/api/alerts?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }
      
      const data: AlertsResponse = await response.json()
      console.log('🚨 Alerts response:', data)
      
      setAlerts(data.alerts || [])
      setSummary(data.summary || { total: 0, high_priority: 0, active: 0 })
    } catch (error) {
      console.error('Error fetching alerts:', error)
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  // Refetch cuando cambian los parámetros de URL
  useEffect(() => {
    fetchAlerts()
  }, [searchParams])

  const activeAlerts = alerts.filter(alert => alert.status === 'active')
  const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved')
  const currentFilters = getFiltersFromURL()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
            <p className="text-muted-foreground">Monitor and manage your brand monitoring alerts</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">Monitor and manage your brand monitoring alerts</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing alerts for: {currentFilters.range} | {currentFilters.sentiment} sentiment | {currentFilters.model} model
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">
              All alerts in selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.high_priority}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently unresolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>Latest monitoring alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({alerts.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activeAlerts.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedAlerts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <AlertsList alerts={alerts} />
            </TabsContent>

            <TabsContent value="active" className="mt-6">
              <AlertsList alerts={activeAlerts} />
            </TabsContent>

            <TabsContent value="resolved" className="mt-6">
              <AlertsList alerts={resolvedAlerts} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function AlertsList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
        <p className="text-muted-foreground">No alerts match your current filters</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => {
        const Icon = priorityIcons[alert.priority]
        return (
          <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-lg">
            <div className={`p-2 rounded-full ${
              alert.priority === 'high' ? 'bg-red-100' :
              alert.priority === 'medium' ? 'bg-yellow-100' :
              alert.priority === 'low' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Icon className={`h-4 w-4 ${
                alert.priority === 'high' ? 'text-red-600' :
                alert.priority === 'medium' ? 'text-yellow-600' :
                alert.priority === 'low' ? 'text-blue-600' : 'text-gray-600'
              }`} />
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{alert.title}</h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={priorityColors[alert.priority]}>
                    {alert.priority}
                  </Badge>
                  <Badge variant={alert.status === 'active' ? 'default' : 'secondary'}>
                    {alert.status}
                  </Badge>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">{alert.description}</p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{alert.source}</span>
                <span>{alert.created_at}</span>
              </div>
              
              {alert.metadata && alert.metadata.competitors && (
                <div className="text-xs bg-gray-50 p-2 rounded">
                  <strong>Competitors mentioned:</strong> {alert.metadata.competitors.join(', ')}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}