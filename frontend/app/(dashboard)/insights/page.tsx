// frontend/app/(dashboard)/insights/page.tsx

'use client'

import React, { useState, useMemo } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/libs/fetcher'
import { useGlobalFilters, buildGlobalQueryParams } from '@/stores/use-global-filters'
import { Insight, Mention, CTA } from "@/types"
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { 
  FileText, Lightbulb, MessageSquare, CheckCircle2, Star, Archive, BarChart3,
  AlertTriangle, TrendingUp, BrainCircuit, Maximize2
} from 'lucide-react'

// --- Tipos de Datos ---
interface InsightItem {
  id: string; // ID único compuesto
  insight_id: number;
  title: string;
  category: 'Opportunity' | 'Risk' | 'Trend';
  sentiment: 'positive' | 'negative' | 'neutral';
  excerpt: string;
  tags: string[];
  starred: boolean;
  date: string;
  query?: string;
}

interface QuoteItem {
  text: string;
  domain: string;
  emotion: string;
}

// --- Componente Modal de Profundidad ---
const InsightDetailModal = ({ insight }: { insight: InsightItem }) => {
  // Hook para buscar la mención original que generó este insight
  const { data: sourceMention, isLoading } = useSWR<Mention>(
    `/api/mentions/from-insight/${insight.insight_id}`, 
    fetcher
  );

  return (
    <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Análisis Profundo del Insight</DialogTitle>
      </DialogHeader>
      <div className="flex-1 overflow-auto pr-6 space-y-6">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">{insight.category}</Badge>
            <CardTitle className="pt-2">{insight.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Generado a partir de la consulta: "{insight.query}"</p>
          </CardContent>
        </Card>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Contexto Original (Respuesta de la IA)</h4>
          <Card className="bg-muted/50 max-h-60 overflow-auto">
            <CardContent className="p-4 text-sm">
              {isLoading ? <Skeleton className="h-20 w-full" /> : <p className="whitespace-pre-wrap">{sourceMention?.response || "No se encontró el texto original."}</p>}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Metadatos</h4>
          <div className="text-sm space-y-1">
            <p><strong>Fecha:</strong> {insight.date}</p>
            <p><strong>Sentimiento:</strong> <span className="capitalize">{insight.sentiment}</span></p>
            <p><strong>Tags:</strong> {insight.tags.join(', ')}</p>
          </div>
        </div>
      </div>
    </DialogContent>
  );
};


// --- Componente Tarjeta de Insight (ahora es un Trigger) ---
const InsightCard = ({ insight, isStarred, onToggleStar }: { insight: InsightItem, isStarred: boolean, onToggleStar: (id: string) => void }) => {
  const categoryMap = {
    'Opportunity': { icon: TrendingUp, color: 'border-green-500 bg-green-50 text-green-700' },
    'Risk': { icon: AlertTriangle, color: 'border-red-500 bg-red-50 text-red-700' },
    'Trend': { icon: BarChart3, color: 'border-blue-500 bg-blue-50 text-blue-700' }
  };
  const { icon: Icon, color } = categoryMap[insight.category] || { icon: Lightbulb, color: '' };

  return (
    <Card className={cn("flex flex-col h-full transition-all hover:shadow-md", isStarred && "ring-2 ring-yellow-400")}>
      <CardHeader className="pb-3">
         <div className="flex items-start justify-between">
            <Badge variant="outline" className={cn("w-fit", color)}><Icon className="w-3 h-3 mr-1.5" />{insight.category}</Badge>
            <Button variant="ghost" size="sm" className="w-7 h-7 p-0" onClick={(e) => { e.stopPropagation(); onToggleStar(insight.id); }}>
                <Star className={cn("w-4 h-4 text-muted-foreground", isStarred && "text-yellow-500 fill-yellow-400")} />
            </Button>
        </div>
        <CardTitle className="text-base leading-tight pt-2">{insight.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">{insight.excerpt}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center text-xs text-muted-foreground pt-3">
        <span>{insight.date}</span>
         <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs -mr-2 h-7">
                    <Maximize2 className="w-3 h-3 mr-1.5" /> Analizar
                </Button>
            </DialogTrigger>
            <InsightDetailModal insight={insight} />
        </Dialog>
      </CardFooter>
    </Card>
  );
};

// --- Componente Dashboard Resumen ---
const InsightsDashboard = ({ insights }: { insights: InsightItem[] }) => {
  const summary = useMemo(() => {
    const counts = { Opportunity: 0, Risk: 0, Trend: 0 };
    insights.forEach(insight => {
      if (counts[insight.category] !== undefined) {
        counts[insight.category]++;
      }
    });
    return [
      { name: 'Oportunidades', count: counts.Opportunity, fill: 'hsl(var(--chart-2))' },
      { name: 'Riesgos', count: counts.Risk, fill: 'hsl(var(--chart-5))' },
      { name: 'Tendencias', count: counts.Trend, fill: 'hsl(var(--chart-1))' },
    ];
  }, [insights]);

  const opportunityRiskRatio = summary[1].count > 0 ? (summary[0].count / summary[1].count).toFixed(1) : '∞';

  return (
    <Card className="mb-6">
        <CardHeader>
            <CardTitle>Resumen de Insights</CardTitle>
            <CardDescription>Análisis agregado de los {insights.length} insights filtrados.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
                <Card className="bg-muted/50">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Ratio Oportunidad/Riesgo</p>
                        <p className="text-3xl font-bold">{opportunityRiskRatio}</p>
                    </CardContent>
                </Card>
                <Card className="bg-muted/50">
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Insights</p>
                        <p className="text-3xl font-bold">{insights.length}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={summary} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3}/>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}/>
                        <Bar dataKey="count" barSize={30} radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
    </Card>
  );
};


// --- Componente Principal (con la misma lógica de antes para Citas y CTAs) ---
export default function InsightsPage() {
    // ... (toda la lógica de estado y fetching se mantiene igual que en la versión anterior)
  const globalFilters = useGlobalFilters();
  const queryParams = buildGlobalQueryParams(globalFilters);
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading, mutate } = useSWR<any[]>(`/api/insights?${queryParams}&type=${activeTab}&limit=100`, fetcher);
  const [starredInsights, setStarredInsights] = useState<Set<string>>(new Set());

  const handleToggleStar = (id: string) => {
    setStarredInsights(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
   const handleToggleCta = async (id: number) => { /* ... se mantiene igual */ };

  const sortedData = useMemo(() => {
    if (!data) return [];
    if (activeTab === 'all') {
      return (data as InsightItem[]).sort((a, b) => 
        (starredInsights.has(b.id) ? 1 : 0) - (starredInsights.has(a.id) ? 1 : 0)
      );
    }
    return data;
  }, [data, activeTab, starredInsights]);


  const renderContent = () => { /* ... se mantiene igual pero ahora usa la nueva InsightCard */
    if (isLoading) { /* ... */ }
    if (!sortedData || sortedData.length === 0) { /* ... */ }

    switch (activeTab) {
      case 'all':
        return (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(sortedData as InsightItem[]).map(insight => (
              <InsightCard 
                key={insight.id} 
                insight={insight}
                isStarred={starredInsights.has(insight.id)}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        );
      // ... los cases para 'quote' y 'cta' se mantienen igual
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ... (el header se mantiene igual) ... */}
       <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Insights</h2>
          <p className="text-muted-foreground">
            Explora tendencias, oportunidades y riesgos detectados por la IA.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all"><FileText className="w-4 h-4 mr-2" />Todos</TabsTrigger>
          <TabsTrigger value="quote"><MessageSquare className="w-4 h-4 mr-2" />Citas</TabsTrigger>
          <TabsTrigger value="cta"><CheckCircle2 className="w-4 h-4 mr-2" />CTAs</TabsTrigger>
        </TabsList>

        {activeTab === 'all' && !isLoading && data && data.length > 0 && (
          <InsightsDashboard insights={data as InsightItem[]} />
        )}
        
        <TabsContent value={activeTab}>
          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}