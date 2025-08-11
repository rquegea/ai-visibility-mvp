"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, CheckCircle, Clock, Settings } from 'lucide-react'

// Mock data
const alerts = [
  {
    id: 1,
    title: 'Negative sentiment spike detected',
    description: 'Negative mentions increased by 150% in the last 2 hours',
    severity: 'high',
    timestamp: '2024-01-07 14:30',
    resolved: false,
    source: 'Sentiment Monitor'
  },
  {
    id: 2,
    title: 'New competitor mention',
    description: 'Brand mentioned alongside competitor in 5+ posts',
    severity: 'medium',
    timestamp: '2024-01-07 12:15',
    resolved: true,
    source: 'Competitor Analysis'
  },
  {
    id: 3,
    title: 'Volume threshold exceeded',
    description: 'Mention volume exceeded 100 mentions/hour threshold',
    severity: 'low',
    timestamp: '2024-01-07 10:45',
    resolved: false,
    source: 'Volume Monitor'
  }
]

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high': return 'bg-red-100 text-red-800'
    case 'medium': return 'bg-yellow-100 text-yellow-800'
    case 'low': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function AlertsPage() {
  const [slackEnabled, setSlackEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground">
          Monitor and manage your brand monitoring alerts
        </p>
      </div>

      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList>
          <TabsTrigger value="timeline">Alert Timeline</TabsTrigger>
          <TabsTrigger value="settings">Notification Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {alert.resolved ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{alert.title}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          {alert.resolved && (
                            <Badge variant="outline" className="text-green-600">
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{alert.source}</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{alert.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Slack Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send alerts to your Slack workspace
                    </p>
                  </div>
                  <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
                </div>
                
                {slackEnabled && (
                  <div className="ml-4 space-y-2">
                    <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
                    <Input
                      id="slackWebhook"
                      placeholder="https://hooks.slack.com/services/..."
                      defaultValue="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send alerts to your email address
                    </p>
                  </div>
                  <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                </div>
                
                {emailEnabled && (
                  <div className="ml-4 space-y-2">
                    <Label htmlFor="emailAddress">Email Address</Label>
                    <Input
                      id="emailAddress"
                      type="email"
                      placeholder="alerts@yourcompany.com"
                    />
                  </div>
                )}
              </div>

              <Button>Save Settings</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alert Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="volumeThreshold">Volume Threshold (mentions/hour)</Label>
                  <Input id="volumeThreshold" type="number" defaultValue="100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sentimentThreshold">Negative Sentiment Threshold (%)</Label>
                  <Input id="sentimentThreshold" type="number" defaultValue="30" />
                </div>
              </div>
              <Button>Update Thresholds</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
