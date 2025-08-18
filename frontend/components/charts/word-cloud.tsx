"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import cloud from "d3-cloud"
import * as d3 from "d3"

type Word = { text: string; value: number }

const PALETTE = ["#10B981", "#06B6D4", "#F59E0B", "#8B5CF6", "#F43F5E", "#3B82F6"]
const brandColor = (name: string) => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function WordCloud({
  words = [],
  height = 280,
  maxWords = 40,
}: {
  words: Word[]
  height?: number
  maxWords?: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 0, h: height })
  const [layoutWords, setLayoutWords] = useState<any[]>([])

  // Sanitizar y limitar nº de palabras
  const data = useMemo<Word[]>(() => {
    const cleaned = (words ?? [])
      .filter(
        (w) =>
          w &&
          typeof w.text === "string" &&
          w.text.trim().length > 0 &&
          Number.isFinite(Number(w.value))
      )
      .map((w) => ({ text: w.text.trim(), value: Number(w.value) }))

    // dedupe por texto y quedarnos con top por valor
    const acc = new Map<string, number>()
    for (const w of cleaned) acc.set(w.text, Math.max(acc.get(w.text) ?? 0, w.value))
    return Array.from(acc.entries())
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, maxWords)
  }, [words, maxWords])

  // Medir ancho del contenedor
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const update = () => setSize({ w: el.clientWidth || 0, h: height })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [height])

  // Calcular layout con d3-cloud (tamaños de fuente responsivos)
  useEffect(() => {
    if (size.w === 0 || data.length === 0) {
      setLayoutWords([])
      return
    }

    const minV = d3.min(data, (d) => d.value) ?? 1
    const maxV = d3.max(data, (d) => d.value) ?? 1

    // Rango de fuente en función del ancho disponible y del nº de palabras
    const maxFont = Math.max(24, Math.min(Math.floor(size.w / Math.max(data.length / 2, 4)) * 1.2, 80))
    const fontScale = d3.scaleSqrt().domain([minV, maxV]).range([14, maxFont])

    const layout = cloud<Word>()
      .size([size.w, size.h])
      .words(data.map((d) => ({ ...d }) as any))
      .padding(2)
      .rotate(() => 0)
      .font("Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial")
      .fontSize((d: any) => fontScale(d.value))
      .on("end", (w) => setLayoutWords(w as any))

    layout.start()
    return () => layout.stop()
  }, [size, data])

  // Auto-scale para que el grupo ocupe el área disponible
  useEffect(() => {
    if (!containerRef.current) return
    const svg = d3.select(containerRef.current).select("svg")
    const g = svg.select<SVGGElement>("g.words")
    if (g.empty()) return
    const node = g.node()
    if (!node) return
    const bbox = node.getBBox()
    if (!bbox.width || !bbox.height) return

    const sx = (size.w * 0.9) / bbox.width
    const sy = (size.h * 0.9) / bbox.height
    const s = Math.min(sx, sy, 2) // limita el zoom x2 para que no pixele

    const tx = size.w / 2 - (bbox.x + bbox.width / 2) * s
    const ty = size.h / 2 - (bbox.y + bbox.height / 2) * s
    g.attr("transform", `translate(${tx},${ty}) scale(${s})`)
  }, [layoutWords, size])

  const ready = size.w > 0 && data.length > 0

  return (
    <div ref={containerRef} style={{ width: "100%", height }} aria-label="Word cloud">
      {!ready ? (
        <div className="h-full w-full rounded-lg bg-muted" aria-hidden="true" />
      ) : (
        <svg width={size.w} height={size.h} role="img">
          <g className="words">
            {layoutWords.map((d, i) => (
              <text
                key={i}
                textAnchor="middle"
                transform={`translate(${d.x},${d.y}) rotate(${d.rotate})`}
                style={{ fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
                fontSize={d.size}
                fill={brandColor(d.text)}
              >
                {d.text}
              </text>
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
