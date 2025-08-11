import { create } from "zustand"

type InsightsFilterState = {
  query: string
  setQuery: (q: string) => void
}

export const useInsightsFilterStore = create<InsightsFilterState>((set) => ({
  query: "",
  setQuery: (q: string) => set({ query: q }),
}))
