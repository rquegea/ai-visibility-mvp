// hooks/useLanguage.ts
'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

type Language = 'es' | 'en'

const translations = {
  es: {
    // Navegación
    home: 'Inicio',
    mentions: 'Menciones', 
    insights: 'Insights',
    alerts: 'Alertas',
    industry: 'Industria',
    improve: 'Mejorar',
    settings: 'Configuración',
    
    // Dashboard
    activeFilters: 'Filtros activos',
    positive: 'positivo',
    allModels: 'Todos los modelos',
    
    // Métricas principales
    mentions24h: 'Menciones (24h)',
    positiveSentiment: 'Sentimiento Positivo',
    alertsTriggered: 'Alertas Activadas',
    activeQueries: 'Consultas Activas',
    
    // Gráficos
    visibilityPerQuery: 'Visibilidad % por Consulta',
    sentimentTrend: 'Tendencia de Sentimiento',
    details: 'Detalles',
    bestQuery: 'Mejor Consulta',
    avgVisibility: 'Visibilidad Promedio',
    globalVisibility: 'Visibilidad global',
    
    // Tiempo
    last24h: 'Últimas 24 horas',
    last7d: 'Últimos 7 días', 
    last30d: 'Últimos 30 días',
    customRange: 'Rango personalizado',
    
    // Estados
    realData: 'Datos Reales',
    mockData: 'Datos de Prueba',
    loading: 'Cargando...',
    
    // Otros
    of: 'de',
    mentions: 'menciones'
  },
  en: {
    // Navigation
    home: 'Home',
    mentions: 'Mentions',
    insights: 'Insights', 
    alerts: 'Alerts',
    industry: 'Industry',
    improve: 'Improve',
    settings: 'Settings',
    
    // Dashboard
    activeFilters: 'Active filters',
    positive: 'positive',
    allModels: 'All models',
    
    // Main metrics
    mentions24h: 'Mentions (24h)',
    positiveSentiment: 'Positive Sentiment',
    alertsTriggered: 'Alerts Triggered', 
    activeQueries: 'Active Queries',
    
    // Charts
    visibilityPerQuery: 'Visibility % per Query',
    sentimentTrend: 'Sentiment Trend',
    details: 'Details',
    bestQuery: 'Best Query',
    avgVisibility: 'Avg Visibility',
    globalVisibility: 'Global visibility',
    
    // Time
    last24h: 'Last 24 hours',
    last7d: 'Last 7 days',
    last30d: 'Last 30 days', 
    customRange: 'Custom range',
    
    // States
    realData: 'Real Data',
    mockData: 'Mock Data',
    loading: 'Loading...',
    
    // Others
    of: 'of',
    mentions: 'mentions'
  }
}

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof typeof translations.es) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: (key) => key
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es')

  const t = (key: keyof typeof translations.es): string => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}