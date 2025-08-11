"use client"

import { useGlobalFilters, buildGlobalQueryParams } from "@/stores/use-global-filters"

/**
 * Hook for pages/components to derive a query string from the global filters.
 * Example: const qs = useGlobalQuery(); fetch(`/api/visibility?${qs}`)
 */
export function useGlobalQuery() {
  const s = useGlobalFilters()
  return buildGlobalQueryParams(s)
}
