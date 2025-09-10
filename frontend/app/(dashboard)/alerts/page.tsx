// frontend/app/(dashboard)/alerts/page.tsx

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/libs/fetcher'
import { useGlobalFilters, buildGlobalQueryParams } from '@/stores/use-global-filters'
import { Mention } from '@/types' // Usaremos Mention como base para las alertas
import { cn } from '@/lib/utils'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, CheckCircle2, Clock, Bell, Archive, Undo, MessageSquare } from 'lucide-react'
import SentimentChip from '@/components/sentiment-chip'

// --- Tipos de Datos Específicos para Alertas ---
interface AlertData extends Mention {
  // Hereda todo de Mention y podemos añadir campos si es necesario
}

interface AlertsResponse {
  mentions: AlertData[];
  pagination: { total: number };
}

// --- Componente de Tarjeta de Alerta Mejorado ---
const AlertCard = ({ alert, onArchive, onUnarchive, view }: { alert: AlertData, onArchive: (id: number) => void, onUnarchive: (id: number) => void, view: 'active' | 'archived' }) => {
  const priorityMap = {
    high: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
    medium: { icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    low: { icon: Bell, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  };

  const getPriority = (sentiment: number) => {
    if (sentiment < -0.6) return 'high';
    if (sentiment < -0.2) return 'medium';
    return 'low';
  };

  const priority = getPriority(alert.sentiment);
  const { icon: Icon, color, bgColor } = priorityMap[priority];

  return (
    <Card className={cn("transition-shadow hover:shadow-md", view === 'archived' && "opacity-70 bg-muted/50")}>
      <CardContent className="p-4 flex items-start gap-4">
        <div className={cn("p-2 rounded-full mt-1", bgColor)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base font-semibold leading-tight">{alert.summary || "Mención importante detectada"}</CardTitle>
            <Badge variant="outline" className="capitalize">{priority}</Badge>
          </div>
          <CardDescription className="text-xs mt-1">{new Date(alert.created_at).toLocaleString()}</CardDescription>
          <p className="text-sm mt-2 text-foreground line-clamp-2">{alert.response}</p>
          <div className="mt-3 flex justify-between items-center">
            <SentimentChip sentiment={alert.sentiment} emotion={alert.emotion} />
            {view === 'active' ? (
              <Button size="sm" variant="ghost" onClick={() => onArchive(alert.id)}>
                <Archive className="w-4 h-4 mr-2" />
                Archivar
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => onUnarchive(alert.id)}>
                <Undo className="w-4 h-4 mr-2" />
                Desarchivar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


// --- Componente Principal de la Página ---
export default function AlertsPage() {
  const globalFilters = useGlobalFilters();
  const [view, setView] = useState<'active' | 'archived'>('active');

  // Construimos los parámetros de forma dinámica
  const buildParams = useCallback(() => {
    const params = new URLSearchParams(buildGlobalQueryParams(globalFilters));
    params.set('limit', '100');
    // El backend debería filtrar por un campo "status", aquí simulamos el filtro
    // En una implementación real, sería: params.set('status', view);
    if (view === 'active') {
       params.set('sentiment', 'negative'); // Filtramos por sentimiento negativo para simular alertas
    }
    return params.toString();
  }, [globalFilters, view]);

  const [queryParams, setQueryParams] = useState(buildParams());

  useEffect(() => {
    setQueryParams(buildParams());
  }, [buildParams]);

  const { data, isLoading, mutate } = useSWR<AlertsResponse>(
    `/api/mentions?${queryParams}`,
    fetcher
  );
  
  // Lógica para manejar el estado de archivado en el cliente
  const [archivedIds, setArchivedIds] = useState<Set<number>>(new Set());

  const handleArchive = useCallback((id: number) => {
    setArchivedIds(prev => new Set(prev).add(id));
    // Aquí iría la llamada a la API PATCH para persistir el estado
  }, []);

  const handleUnarchive = useCallback((id: number) => {
    setArchivedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
     // Aquí iría la llamada a la API PATCH para persistir el estado
  }, []);

  const { activeAlerts, archivedAlerts, summary } = useMemo(() => {
    const allAlerts = data?.mentions || [];
    const active = allAlerts.filter(alert => !archivedIds.has(alert.id));
    const archived = allAlerts.filter(alert => archivedIds.has(alert.id));
    
    const highPriority = active.filter(a => a.sentiment < -0.6).length;

    return {
      activeAlerts: active,
      archivedAlerts: archived,
      summary: {
        total: allAlerts.length,
        high_priority: highPriority,
        active: active.length,
      },
    };
  }, [data, archivedIds]);

  const alertsToShow = view === 'active' ? activeAlerts : archivedAlerts;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
          <p className="text-muted-foreground">Monitoriza y gestiona las alertas de tu marca.</p>
        </div>
      </div>

      {/* KPI Cards de Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{isLoading ? <Skeleton className="h-8 w-16" /> : summary.active}</div>
            <p className="text-xs text-muted-foreground">Actualmente sin resolver</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prioridad Alta</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{isLoading ? <Skeleton className="h-8 w-16" /> : summary.high_priority}</div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total (en rango)</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : summary.total}</div>
            <p className="text-xs text-muted-foreground">Alertas en el período seleccionado</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Alertas */}
      <Card>
        <CardHeader>
          <Tabs value={view} onValueChange={(v) => setView(v as 'active' | 'archived')}>
            <TabsList>
              <TabsTrigger value="active">Activas ({summary.active})</TabsTrigger>
              <TabsTrigger value="archived">Archivadas ({archivedAlerts.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : alertsToShow.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {view === 'active' ? (
                <>
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <h3 className="font-semibold">¡Todo en orden!</h3>
                  <p>No hay alertas activas que coincidan con tus filtros.</p>
                </>
              ) : (
                 <>
                  <Archive className="w-12 h-12 mx-auto mb-4" />
                  <h3 className="font-semibold">Sin alertas archivadas</h3>
                  <p>Las alertas que archives aparecerán aquí.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {alertsToShow.map(alert => (
                <AlertCard key={alert.id} alert={alert} onArchive={handleArchive} onUnarchive={handleUnarchive} view={view} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}