"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Search } from 'lucide-react'
import { cn } from "@/lib/utils"

type CTA = { id: number; text: string; done: boolean }

export default function InboxPage() {
  const [query, setQuery] = useState("")
  const key = "/api/insights?type=cta&status=open"
  const { data, isLoading, mutate } = useSWR<CTA[]>(key, fetcher)

  const filtered = (data ?? []).filter((c) =>
    c.text.toLowerCase().includes(query.toLowerCase())
  )

  const onToggle = useCallback(
    async (id: number) => {
      // Optimistic remove
      const current = data ?? []
      const next = current.filter((c) => c.id !== id)
      mutate(next, { revalidate: false })
      try {
        await fetch(`/api/insights/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ done: true }),
        })
        // Revalidate in background
        mutate()
      } catch (e) {
        // Rollback on error
        mutate(current, { revalidate: false })
      }
    },
    [data, mutate]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-muted-foreground">Review and complete open actions.</p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Find CTAs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Calls to Action */}
      <Card>
        <CardHeader>
          <CardTitle>Calls to Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-sm" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Alert>
              <AlertTitle>All CTAs completed 🎉</AlertTitle>
              <AlertDescription>
                You’re up to date. New items will appear here as they’re created.
              </AlertDescription>
            </Alert>
          ) : (
            <ul className="space-y-2">
              {filtered.map((cta) => (
                <li key={cta.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`cta-${cta.id}`}
                    onCheckedChange={() => onToggle(cta.id)}
                    aria-label={`Mark "${cta.text}" as done`}
                  />
                  <Label
                    htmlFor={`cta-${cta.id}`}
                    className={cn(
                      "leading-relaxed cursor-pointer",
                      "text-sm md:text-base"
                    )}
                  >
                    {cta.text}
                  </Label>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
