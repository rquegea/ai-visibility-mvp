export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch " + url)
  return res.json()
}
