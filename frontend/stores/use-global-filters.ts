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
}

// small helpers
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
}

export const useGlobalFilters = create<GlobalFiltersState>((set, get) => {
  const initial = { ...defaultState, ...load() }
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
    },
    setCustomRange: (from, to) => {
      const next: GlobalFiltersState = { ...get(), timeRange: "custom", from, to }
      set(next)
      persist(next)
    },
    setModel: (model) => {
      const next = { ...get(), model }
      set(next)
      persist(next)
    },
    setRegion: (region) => {
      const next = { ...get(), region }
      set(next)
      persist(next)
    },
    setAdvanced: (partial) => {
      const next = { ...get(), advanced: { ...get().advanced, ...partial } }
      set(next)
      persist(next as GlobalFiltersState)
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
      }
      set(next)
      persist(next)
    },
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
