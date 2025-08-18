// Crear nuevo archivo: frontend/components/feature-sentiment-matrix.tsx

"use client"

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/libs/fetcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Eye, MessageSquare, Filter } from 'lucide-react';

interface FeatureData {
  feature: string;
  category: string;
  neg: number;
  neu: number;
  pos: number;
  trend: 'up' | 'down' | 'stable';
  topQuotes: string[];
  mentionIds: number[];
  predefined: boolean;
  mentions?: Array<{
    id: number;
    sentiment: number;
    keywords_found: string[];
    date: string;
  }>;
}

interface FeatureSentimentResponse {
  features: FeatureData[];
  total_features: number;
  date_range: {
    start: string;
    end: string;
  };
}

interface FeatureSentimentMatrixProps {
  timeRange?: string;
}

export function FeatureSentimentMatrix({ timeRange = '30d' }: FeatureSentimentMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPredefinedOnly, setShowPredefinedOnly] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<FeatureData | null>(null);

  // Fetch datos reales del backend
  const { data, isLoading, error } = useSWR<FeatureSentimentResponse>(
    `/api/features-sentiment?range=${timeRange}`,
    fetcher,
    {
      refreshInterval: 30000, // Actualizar cada 30 segundos
      revalidateOnFocus: false
    }
  );

  // Categorías disponibles
  const categories = useMemo(() => {
    if (!data?.features) return ['all'];
    const cats = new Set(data.features.map(f => f.category));
    return ['all', ...Array.from(cats)];
  }, [data]);

  // Datos filtrados
  const filteredData = useMemo(() => {
    if (!data?.features) return [];
    
    let filtered = data.features;
    
    if (showPredefinedOnly) {
      filtered = filtered.filter(f => f.predefined);
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.category === selectedCategory);
    }
    
    return filtered.sort((a, b) => {
      const totalA = a.pos + a.neu + a.neg;
      const totalB = b.pos + b.neu + b.neg;
      return totalB - totalA; // Ordenar por total de menciones
    });
  }, [data, selectedCategory, showPredefinedOnly]);

  // Calcular valores máximos para normalización
  const maxValue = useMemo(() => {
    if (!data?.features) return 1;
    return Math.max(...data.features.flatMap(f => [f.neg, f.neu, f.pos]), 1);
  }, [data]);

  // Función para obtener color de celda
  const getCellColor = (type: 'neg' | 'neu' | 'pos', value: number) => {
    const intensity = Math.min(0.9, Math.max(0.1, value / maxValue));
    
    if (type === 'neg') return `rgba(239, 68, 68, ${intensity})`;
    if (type === 'neu') return `rgba(156, 163, 175, ${intensity})`;
    return `rgba(34, 197, 94, ${intensity})`;
  };

  // Función para obtener ícono de tendencia
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  // Calcular score general
  const getOverallScore = (feature: FeatureData) => {
    const total = feature.pos + feature.neu + feature.neg;
    if (total === 0) return 0;
    return Math.round(((feature.pos - feature.neg) / total) * 100);
  };

  // Calcular distribución de sentimientos
  const getSentimentDistribution = (feature: FeatureData) => {
    const total = feature.pos + feature.neu + feature.neg;
    if (total === 0) return { pos: 0, neu: 0, neg: 0 };
    
    return {
      pos: Math.round((feature.pos / total) * 100),
      neu: Math.round((feature.neu / total) * 100),
      neg: Math.round((feature.neg / total) * 100)
    };
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature × Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature × Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Error cargando datos de features</p>
            <p className="text-sm text-gray-400 mt-2">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data?.features || data.features.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature × Sentiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No hay datos de features disponibles</p>
            <p className="text-sm text-gray-400 mt-2">
              Las features se extraen automáticamente de las menciones analizadas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Feature × Sentiment</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {data.total_features} features
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Datos reales
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controles */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas las categorías' : cat}
                </option>
              ))}
            </select>
          </div>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showPredefinedOnly}
              onChange={(e) => setShowPredefinedOnly(e.target.checked)}
              className="rounded"
            />
            Solo features predefinidas
          </label>

          <div className="text-xs text-gray-500">
            Período: {new Date(data.date_range.start).toLocaleDateString()} - {new Date(data.date_range.end).toLocaleDateString()}
          </div>
        </div>

        {/* Vista de resumen - Top 4 features */}
        {filteredData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredData.slice(0, 4).map((feature) => {
              const score = getOverallScore(feature);
              const distribution = getSentimentDistribution(feature);
              const total = feature.pos + feature.neu + feature.neg;
              
              return (
                <Card 
                  key={feature.feature} 
                  className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => setSelectedFeature(feature)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm truncate">{feature.feature}</span>
                      {getTrendIcon(feature.trend)}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Score: {score > 0 ? '+' : ''}{score}%</span>
                        <span>{total} menciones</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-green-600">Pos: {distribution.pos}%</span>
                          <span className="text-gray-500">Neu: {distribution.neu}%</span>
                          <span className="text-red-600">Neg: {distribution.neg}%</span>
                        </div>
                        
                        <div className="flex gap-0.5 h-2 bg-gray-200 rounded overflow-hidden">
                          {distribution.pos > 0 && (
                            <div 
                              className="bg-green-500"
                              style={{ width: `${distribution.pos}%` }}
                            />
                          )}
                          {distribution.neu > 0 && (
                            <div 
                              className="bg-gray-400"
                              style={{ width: `${distribution.neu}%` }}
                            />
                          )}
                          {distribution.neg > 0 && (
                            <div 
                              className="bg-red-500"
                              style={{ width: `${distribution.neg}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant="outline" className="mt-2 text-xs">
                      {feature.category}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Matriz detallada */}
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Feature</th>
                  <th className="text-center p-3 font-medium w-20">Trend</th>
                  <th className="text-center p-3 font-medium w-16">Neg</th>
                  <th className="text-center p-3 font-medium w-16">Neu</th>
                  <th className="text-center p-3 font-medium w-16">Pos</th>
                  <th className="text-center p-3 font-medium w-20">Score</th>
                  <th className="text-center p-3 font-medium w-24">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((feature) => {
                  const score = getOverallScore(feature);
                  const total = feature.pos + feature.neu + feature.neg;
                  
                  return (
                    <tr key={feature.feature} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{feature.feature}</span>
                          <Badge variant="secondary" className="text-xs">
                            {feature.category}
                          </Badge>
                          {!feature.predefined && (
                            <Badge variant="outline" className="text-xs">Auto</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {total} menciones • {feature.mentionIds.length} únicas
                        </div>
                      </td>
                      
                      <td className="text-center p-3">
                        {getTrendIcon(feature.trend)}
                      </td>
                      
                      <td 
                        className="text-center p-3 font-medium text-white rounded-l"
                        style={{ backgroundColor: getCellColor('neg', feature.neg) }}
                      >
                        {feature.neg}
                      </td>
                      
                      <td 
                        className="text-center p-3 font-medium text-white"
                        style={{ backgroundColor: getCellColor('neu', feature.neu) }}
                      >
                        {feature.neu}
                      </td>
                      
                      <td 
                        className="text-center p-3 font-medium text-white rounded-r"
                        style={{ backgroundColor: getCellColor('pos', feature.pos) }}
                      >
                        {feature.pos}
                      </td>
                      
                      <td className="text-center p-3">
                        <Badge 
                          variant={score > 20 ? "default" : score < -20 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {score > 0 ? '+' : ''}{score}%
                        </Badge>
                      </td>
                      
                      <td className="text-center p-3">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedFeature(feature)}
                            className="h-8 w-8 p-0"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title={`Ver ${feature.mentionIds.length} menciones`}
                            onClick={() => {
                              // TODO: Implementar navegación a menciones filtradas
                              console.log('Navigate to mentions:', feature.mentionIds);
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay features que coincidan con los filtros</p>
          </div>
        )}

        {/* Modal de detalle de feature */}
        {selectedFeature && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <span>Detalle: {selectedFeature.feature}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedFeature(null)}
                  >
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedFeature.pos}</div>
                    <div className="text-xs text-gray-500">Positivas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-500">{selectedFeature.neu}</div>
                    <div className="text-xs text-gray-500">Neutrales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{selectedFeature.neg}</div>
                    <div className="text-xs text-gray-500">Negativas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{getOverallScore(selectedFeature)}%</div>
                    <div className="text-xs text-gray-500">Score</div>
                  </div>
                </div>

                {/* Top quotes */}
                {selectedFeature.topQuotes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">🗣️ Quotes Representativas</h4>
                    <div className="space-y-2">
                      {selectedFeature.topQuotes.map((quote, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
                          <p className="text-sm italic">"{quote}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acciones recomendadas */}
                <div>
                  <h4 className="font-medium mb-3">💡 Acciones Recomendadas</h4>
                  <div className="space-y-2">
                    {getOverallScore(selectedFeature) < -20 && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Atención urgente:</strong> Esta feature tiene sentiment muy negativo. 
                          Considerar mejoras inmediatas o cambios en la estrategia.
                        </p>
                      </div>
                    )}
                    
                    {getOverallScore(selectedFeature) > 20 && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>Fortaleza identificada:</strong> Aprovechar este aspecto positivo en 
                          marketing, comunicación y desarrollo de producto.
                        </p>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Análisis profundo:</strong> Revisar las {selectedFeature.mentionIds.length} menciones 
                        relacionadas para obtener insights más específicos y contexto completo.
                      </p>
                    </div>

                    {selectedFeature.predefined && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Feature estratégica:</strong> Esta es una característica clave del producto. 
                          Monitorear su evolución regularmente.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información técnica */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2 text-sm">📊 Información Técnica</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Categoría:</span> {selectedFeature.category}
                    </div>
                    <div>
                      <span className="font-medium">Tipo:</span> {selectedFeature.predefined ? 'Predefinida' : 'Auto-extraída'}
                    </div>
                    <div>
                      <span className="font-medium">Tendencia:</span> {
                        selectedFeature.trend === 'up' ? '↗️ Mejorando' : 
                        selectedFeature.trend === 'down' ? '↘️ Empeorando' : 
                        '➡️ Estable'
                      }
                    </div>
                    <div>
                      <span className="font-medium">Menciones únicas:</span> {selectedFeature.mentionIds.length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}