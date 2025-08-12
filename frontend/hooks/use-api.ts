import useSWR from "swr"
import { useGlobalFilters } from "@/stores/use-global-filters"

function buildUrl(path: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== "All models") usp.append(k, v)
  })
  return usp.toString() ? `${path}?${usp.toString()}` : path
}

export function useApi<T = any>(path: string) {
  const { timeRange, from, to, brand, model } = useGlobalFilters()

  const url = buildUrl(path, {
    range: timeRange,
    from,
    to,
    brand,
    model,
  })

  const fetcher = (u: string) => fetch(u).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
    return r.json()
  })

  const swr = useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  return { ...swr, url }
}
