'use client'

import { useState, useEffect } from 'react'
import { useGlobalFilters, buildGlobalQueryParams } from '@/stores/use-global-filters'
import { AlertTriangle, CheckCircle2, Clock, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

  // 🎯 USAR FILTROS GLOBALES (como en insights y dashboard)
  const globalFilters = useGlobalFilters()
  const queryParams = buildGlobalQueryParams(globalFilters)

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      
      console.log('🚨 Fetching alerts with global filters:', globalFilters)
      console.log('🚨 Query params:', queryParams)
      
      const response = await fetch(`/api/alerts?${queryParams}`)
      
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

  // 🚀 Efecto que depende de los filtros globales
  useEffect(() => {
    fetchAlerts()
  }, [globalFilters.timeRange, globalFilters.model, globalFilters.region, globalFilters.advanced.sentiment])

  const activeAlerts = alerts.filter(alert => alert.status === 'active')
  const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved')

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
          Showing alerts for: {globalFilters.timeRange} | {globalFilters.advanced.sentiment} sentiment | {globalFilters.model} model
        </div>
      </div>

      {/* 🎯 DEBUG: Mostrar filtros globales para verificar sincronización */}
      <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800">
        <strong>Debug - Alerts Global filters:</strong> Range: {globalFilters.timeRange} | Sentiment: {globalFilters.advanced.sentiment} | Model: {globalFilters.model} | Region: {globalFilters.region}
        <br />
        <strong>Query params:</strong> {queryParams}
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
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently unresolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
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
            
            <TabsContent value="all" className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No alerts</h3>
                  <p className="mt-1 text-sm text-gray-500">No alerts found for the current filters.</p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const IconComponent = priorityIcons[alert.priority]
                  return (
                    <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className={`p-2 rounded-full ${priorityColors[alert.priority]}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className={priorityColors[alert.priority]}>
                              {alert.priority}
                            </Badge>
                            <Badge variant={alert.status === 'active' ? 'default' : 'secondary'}>
                              {alert.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                          <span>Source: {alert.source}</span>
                          <span>{new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                        {alert.metadata && (
                          <div className="mt-2 text-xs text-gray-600">
                            {Object.entries(alert.metadata).map(([key, value]) => (
                              <span key={key} className="mr-4">
                                <strong>{key}:</strong> {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>
            
            <TabsContent value="active" className="space-y-4">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No active alerts</h3>
                  <p className="mt-1 text-sm text-gray-500">All alerts have been resolved.</p>
                </div>
              ) : (
                activeAlerts.map((alert) => {
                  const IconComponent = priorityIcons[alert.priority]
                  return (
                    <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-lg border-orange-200">
                      <div className={`p-2 rounded-full ${priorityColors[alert.priority]}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                          <Badge variant="outline" className={priorityColors[alert.priority]}>
                            {alert.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                          <span>Source: {alert.source}</span>
                          <span>{new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>
            
            <TabsContent value="resolved" className="space-y-4">
              {resolvedAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No resolved alerts</h3>
                  <p className="mt-1 text-sm text-gray-500">No resolved alerts in this period.</p>
                </div>
              ) : (
                resolvedAlerts.map((alert) => {
                  const IconComponent = priorityIcons[alert.priority]
                  return (
                    <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-gray-50">
                      <div className="p-2 rounded-full bg-gray-100 text-gray-400">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-500">{alert.title}</h4>
                          <Badge variant="secondary">resolved</Badge>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{alert.description}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                          <span>Source: {alert.source}</span>
                          <span>{new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}