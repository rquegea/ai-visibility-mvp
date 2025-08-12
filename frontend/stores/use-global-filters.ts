"use client"
import { create } from "zustand"

export type TimeRange = "24h" | "7d" | "30d" | "custom"
export type SentimentFilter = "all" | "positive" | "neutral" | "negative"

type AdvancedFilters = {
  sentiment: SentimentFilter
  hideBots: boolean
  verifiedOnly: boolean
}

type GlobalFiltersState = {
  // time
  timeRange: TimeRange
  from?: string // ISO yyyy-mm-dd
  to?: string   // ISO yyyy-mm-dd
  // dropdowns
  model: string
  region: string
  advanced: AdvancedFilters
  // actions
  setTimeRange: (r: TimeRange) => void
  setCustomRange: (from?: string, to?: string) => void
  setModel: (model: string) => void
  setRegion: (region: string) => void
  setAdvanced: (next: Partial<AdvancedFilters>) => void
  resetAll: () => void
  // ✅ NUEVO: sincronización URL
  initFromURL: () => void
}

// Helper para actualizar URL
function updateURL(state: GlobalFiltersState) {
  if (typeof window === "undefined") return
  
  const params = new URLSearchParams(window.location.search)
  
  // Actualizar parámetros
  params.set("range", state.timeRange)
  
  if (state.timeRange === "custom") {
    if (state.from) params.set("from", state.from)
    if (state.to) params.set("to", state.to)
  } else {
    params.delete("from")
    params.delete("to")
  }
  
  if (state.model && state.model !== "All models") {
    params.set("model", state.model)
  } else {
    params.delete("model")
  }
  
  if (state.region && state.region !== "Region") {
    params.set("region", state.region)
  } else {
    params.delete("region")
  }
  
  if (state.advanced?.sentiment && state.advanced.sentiment !== "all") {
    params.set("sentiment", state.advanced.sentiment)
  } else {
    params.delete("sentiment")
  }
  
  if (state.advanced?.hideBots) {
    params.set("hideBots", "1")
  } else {
    params.delete("hideBots")
  }
  
  if (state.advanced?.verifiedOnly) {
    params.set("verified", "1")
  } else {
    params.delete("verified")
  }
  
  // Actualizar URL sin recargar página
  const newUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', newUrl)
}

// Helper para leer de URL
function loadFromURL(): Partial<GlobalFiltersState> {
  if (typeof window === "undefined") return {}
  
  const params = new URLSearchParams(window.location.search)
  const result: Partial<GlobalFiltersState> = {}
  
  // Time range
  const range = params.get("range")
  if (range && ["24h", "7d", "30d", "custom"].includes(range)) {
    result.timeRange = range as TimeRange
  }
  
  // Custom dates
  const from = params.get("from")
  const to = params.get("to")
  if (from) result.from = from
  if (to) result.to = to
  
  // Model
  const model = params.get("model")
  if (model) result.model = model
  
  // Region
  const region = params.get("region")
  if (region) result.region = region
  
  // Advanced filters
  const sentiment = params.get("sentiment")
  const hideBots = params.get("hideBots") === "1"
  const verifiedOnly = params.get("verified") === "1"
  
  if (sentiment || hideBots || verifiedOnly) {
    result.advanced = {
      sentiment: (sentiment as SentimentFilter) || "all",
      hideBots,
      verifiedOnly
    }
  }
  
  return result
}

// Storage helpers (mantener funcionalidad existente)
const STORAGE_KEY = "global:filters:v1"

function load(): Partial<GlobalFiltersState> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persist(state: GlobalFiltersState) {
  if (typeof window === "undefined") return
  const { timeRange, from, to, model, region, advanced } = state
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ timeRange, from, to, model, region, advanced })
  )
}

const defaultState: Omit<GlobalFiltersState, keyof GlobalFiltersState> & GlobalFiltersState = {
  timeRange: "7d",
  from: undefined,
  to: undefined,
  model: "All models",
  region: "Region",
  advanced: { sentiment: "all", hideBots: false, verifiedOnly: false },
  setTimeRange: () => {},
  setCustomRange: () => {},
  setModel: () => {},
  setRegion: () => {},
  setAdvanced: () => {},
  resetAll: () => {},
  initFromURL: () => {},
}

export const useGlobalFilters = create<GlobalFiltersState>((set, get) => {
  // ✅ MEJORADO: Priorizar URL > localStorage > defaults
  const fromURL = loadFromURL()
  const fromStorage = load()
  const initial = { 
    ...defaultState, 
    ...fromStorage,
    ...fromURL  // URL tiene prioridad sobre localStorage
  }

  return {
    ...initial,
    
    setTimeRange: (r) => {
      const next: GlobalFiltersState = { ...get(), timeRange: r }
      // clear custom dates if not 'custom'
      if (r !== "custom") {
        next.from = undefined
        next.to = undefined
      }
      set(next)
      persist(next)
      updateURL(next) // ✅ NUEVO: actualizar URL
    },
    
    setCustomRange: (from, to) => {
      const next: GlobalFiltersState = { ...get(), timeRange: "custom", from, to }
      set(next)
      persist(next)
      updateURL(next) // ✅ NUEVO: actualizar URL
    },
    
    setModel: (model) => {
      const next = { ...get(), model }
      set(next)
      persist(next)
      updateURL(next) // ✅ NUEVO: actualizar URL
    },
    
    setRegion: (region) => {
      const next = { ...get(), region }
      set(next)
      persist(next)
      updateURL(next) // ✅ NUEVO: actualizar URL
    },
    
    setAdvanced: (partial) => {
      const next = { ...get(), advanced: { ...get().advanced, ...partial } }
      set(next)
      persist(next as GlobalFiltersState)
      updateURL(next) // ✅ NUEVO: actualizar URL
    },
    
    resetAll: () => {
      const next: GlobalFiltersState = {
        ...defaultState,
        setTimeRange: get().setTimeRange,
        setCustomRange: get().setCustomRange,
        setModel: get().setModel,
        setRegion: get().setRegion,
        setAdvanced: get().setAdvanced,
        resetAll: get().resetAll,
        initFromURL: get().initFromURL,
      }
      set(next)
      persist(next)
      updateURL(next) // ✅ NUEVO: actualizar URL
    },
    
    // ✅ NUEVO: función para re-sincronizar desde URL
    initFromURL: () => {
      const fromURL = loadFromURL()
      if (Object.keys(fromURL).length > 0) {
        const current = get()
        const next = { ...current, ...fromURL }
        set(next)
        persist(next)
      }
    }
  }
})

/**
 * Helper: build standard query params for fetchers, e.g. ?range=7d&model=...&region=...
 */
export function buildGlobalQueryParams(s: GlobalFiltersState) {
  const params = new URLSearchParams()
  params.set("range", s.timeRange)
  if (s.timeRange === "custom") {
    if (s.from) params.set("from", s.from)
    if (s.to) params.set("to", s.to)
  }
  if (s.model && s.model !== "All models") params.set("model", s.model)
  if (s.region && s.region !== "Region") params.set("region", s.region)
  if (s.advanced?.sentiment && s.advanced.sentiment !== "all") {
    params.set("sentiment", s.advanced.sentiment)
  }
  if (s.advanced?.hideBots) params.set("hideBots", "1")
  if (s.advanced?.verifiedOnly) params.set("verified", "1")
  return params.toString()
}