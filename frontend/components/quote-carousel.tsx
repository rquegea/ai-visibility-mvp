"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import SentimentChip from "@/components/sentiment-chip"
import { fetcher } from "@/libs/fetcher"
import { cn } from "@/lib/utils"

type QuoteItem = {
  text: string
  domain: string
  emotion: string
}

function domainInitial(domain: string) {
  const d = (domain || "").trim()
  const first = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim().charAt(0)
  return (first || "W").toUpperCase()
}

function sentimentFromEmotion(emotion: string): number {
  const e = (emotion || "").toLowerCase()
  if (e.includes("alegr") || e.includes("joy") || e.includes("positivo")) return 0.4
  if (e.includes("enojo") || e.includes("anger") || e.includes("negativo")) return -0.4
  if (e.includes("triste")) return -0.3
  if (e.includes("sorp")) return 0.1
  return 0
}

export function QuoteCarousel({ className }: { className?: string }) {
  // Fetch exactly 5 quotes
  const { data, isLoading } = useSWR<QuoteItem[]>(
    "/api/insights?type=quote&limit=5",
    fetcher
  )
  const quotes = data ?? []
  const len = quotes.length

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  // Auto-rotate every 5s
  useEffect(() => {
    if (!len || paused) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % len)
    }, 5000)
    return () => clearInterval(id)
  }, [len, paused])

  // Reset index when data length changes
  useEffect(() => {
    setIndex(0)
  }, [len])

  // Empty state
  if (!isLoading && len === 0) {
    return (
      <Card className={cn(className)}>
        <CardContent className="py-6">
          <div className="text-sm text-muted-foreground">No quotes</div>
        </CardContent>
      </Card>
    )
  }

  const current = len ? quotes[index] : null

  return (
    <Card
      className={cn("overflow-hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <CardContent className="py-6">
        <div className="flex items-center gap-4 md:gap-6">
          {/* Left: Domain initial avatar */}
          <div className="flex-shrink-0">
            <Avatar className="h-10 w-10 md:h-12 md:w-12">
              <AvatarFallback>{domainInitial(current?.domain ?? "")}</AvatarFallback>
            </Avatar>
          </div>

          {/* Center: Animated quote */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-center mx-auto max-w-[600px]"
              >
                <div className="text-sm text-muted-foreground truncate">
                  {current?.domain ?? (isLoading ? "Loading…" : "")}
                </div>
                <blockquote className="mt-1 text-base md:text-lg font-medium italic">
                  {current?.text ?? (isLoading ? "…" : "")}
                </blockquote>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: SentimentChip */}
          <div className="flex-shrink-0">
            {current ? (
              <SentimentChip
                sentiment={sentimentFromEmotion(current.emotion)}
                emotion={current.emotion}
              />
            ) : (
              <div className="h-6 w-24 rounded-full bg-muted" />
            )}
          </div>
        </div>

        {/* Dots */}
        {len > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {quotes.map((_, i) => (
              <button
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === index ? "bg-foreground" : "bg-muted"
                )}
                aria-label={`Go to quote ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default QuoteCarousel
