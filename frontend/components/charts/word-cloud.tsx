"use client"

import dynamic from "next/dynamic"
import React, { useEffect, useMemo, useRef, useState, type ErrorInfo } from "react"

type Word = { text: string; value: number }

const ReactWordcloud = dynamic(() => import("react-wordcloud"), {
  ssr: false,
})

class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // Optionally log to monitoring here
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children as React.ReactElement
  }
}

export function WordCloud({
  words = [],
  height = 260,
}: {
  words: Word[]
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Sanitize data to avoid crashes in react-wordcloud
  const safeWords = useMemo<Word[]>(
    () =>
      (words ?? [])
        .filter(
          (w) =>
            w &&
            typeof w.text === "string" &&
            w.text.trim().length > 0 &&
            typeof w.value === "number" &&
            Number.isFinite(w.value)
        )
        .map((w) => ({ text: w.text.trim(), value: w.value })),
    [words]
  )

  // Ensure this runs only on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Measure container width and keep it updated
  useEffect(() => {
    if (!mounted || !containerRef.current) return
    const el = containerRef.current
    const update = () => setWidth(el.clientWidth || 0)
    update()

    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mounted])

  const options = useMemo(
    () => ({
      deterministic: true,
      enableTooltip: true,
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      fontSizes: [12, 40] as [number, number],
      rotations: 2,
      rotationAngles: [0, 0] as [number, number],
      spiral: "archimedean" as const,
      padding: 2,
      callbacks: {
        // >=70 cyan-500, 50–69 blue-500, 30–49 amber-500, <=29 red-500
        getWordColor: (word: Word) => {
          if (word.value >= 70) return "#06b6d4" // cyan-500
          if (word.value >= 50) return "#3b82f6" // blue-500
          if (word.value >= 30) return "#f59e0b" // amber-500
          return "#ef4444" // red-500
        },
      },
    }),
    []
  )

  const ready = mounted && width > 0 && safeWords.length > 0

  return (
    <div ref={containerRef} style={{ width: "100%", height }} aria-label="Word cloud">
      {!ready ? (
        <div className="h-full w-full rounded-lg bg-muted" aria-hidden="true" />
      ) : (
        <ErrorBoundary
          fallback={<div className="h-full w-full rounded-lg bg-muted" aria-hidden="true" />}
        >
          {
            // Key on width to force re-layout when container size changes
            // @ts-expect-error react-wordcloud types are loose in this env
            <ReactWordcloud key={width} words={safeWords} options={options} size={[width, height]} />
          }
        </ErrorBoundary>
      )}
    </div>
  )
}
