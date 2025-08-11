"use client"

import { useEffect, useMemo, useState } from "react"
import { useInsightsFilterStore } from "@/stores/use-insights-filter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Search } from 'lucide-react'
import {
  DndContext,
  type DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"

type InsightType = "Trend" | "Risk" | "Opportunity"

type InsightCard = {
  id: number
  type: InsightType
  title: string
  excerpt: string
  tags: string[]
  date: string
}

const MOCK_INSIGHTS: InsightCard[] = [
  {
    id: 1,
    type: "Trend",
    title: "Organic ingredients gaining traction",
    excerpt: "Mentions of organic cookies rose 45% MoM across blogs and forums.",
    tags: ["organic", "ingredients", "cookies"],
    date: "2024-02-01",
  },
  {
    id: 2,
    type: "Opportunity",
    title: "Partnership with eco influencers",
    excerpt: "Sizable overlap between eco audiences and dessert topics.",
    tags: ["influencers", "eco", "growth"],
    date: "2024-02-02",
  },
  {
    id: 3,
    type: "Risk",
    title: "Delayed customer support responses",
    excerpt: "Average response time discussed negatively on Reddit threads.",
    tags: ["support", "sla", "reddit"],
    date: "2024-02-02",
  },
  {
    id: 4,
    type: "Trend",
    title: "Champagne pairing content uptick",
    excerpt: "Celebration posts reference pairing desserts with champagne.",
    tags: ["pairing", "champagne", "celebration"],
    date: "2024-02-03",
  },
  {
    id: 5,
    type: "Opportunity",
    title: "Launch virtual tasting webinar",
    excerpt: "Strong interest in behind-the-scenes baking sessions.",
    tags: ["webinar", "engagement", "events"],
    date: "2024-02-03",
  },
  {
    id: 6,
    type: "Risk",
    title: "Shipping damage complaints",
    excerpt: "Packaging issues causing product damage during delivery.",
    tags: ["logistics", "packaging", "csat"],
    date: "2024-02-04",
  },
  {
    id: 7,
    type: "Trend",
    title: "Growth in Spanish-language mentions",
    excerpt: "Notable spikes across ES-speaking regions.",
    tags: ["international", "spanish", "volume"],
    date: "2024-02-04",
  },
  {
    id: 8,
    type: "Opportunity",
    title: "Rewards tie-in with business cards",
    excerpt: "Business card rewards conversations align with brand themes.",
    tags: ["rewards", "business-card", "cross-sell"],
    date: "2024-02-05",
  },
]

// Style helpers
function typeBadgeClass(t: InsightType) {
  switch (t) {
    case "Opportunity":
      return "bg-emerald-500 text-white"
    case "Risk":
      return "bg-red-500 text-white"
    case "Trend":
      return "bg-amber-500 text-black"
    default:
      return "bg-secondary text-secondary-foreground"
  }
}

// Draggable card for Board
function DraggableCard({ item }: { item: InsightCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  })
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card className={cn("shadow-sm border", isDragging && "ring-2 ring-primary/50")}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Badge className={typeBadgeClass(item.type)}>{item.type}</Badge>
            <span className="text-xs text-muted-foreground">{item.date}</span>
          </div>
          <div className="font-medium">{item.title}</div>
          <p className="text-sm text-muted-foreground line-clamp-3">{item.excerpt}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DroppableColumn({
  id,
  title,
  colorClass,
  children,
}: {
  id: "opportunities" | "risks"
  title: string
  colorClass: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[300px] rounded-lg border p-3 transition-colors",
        isOver ? "bg-muted/60" : "bg-card"
      )}
    >
      <div className={cn("mb-3 text-sm font-semibold", colorClass)}>
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export default function InsightsPage() {
  // Shared search via zustand selector
  const query = useInsightsFilterStore((s) => s.query)
  const setQuery = useInsightsFilterStore((s) => s.setQuery)

  const [items] = useState<InsightCard[]>(MOCK_INSIGHTS)

  // Board state: ids in each column; mutate locally only
  const [board, setBoard] = useState<{
    opportunities: number[]
    risks: number[]
  }>(() => ({
    opportunities: items.filter((i) => i.type === "Opportunity").map((i) => i.id),
    risks: items.filter((i) => i.type === "Risk").map((i) => i.id),
  }))

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const normalizedQuery = query.trim().toLowerCase()
  const matchesFilter = (it: InsightCard) => {
    if (!normalizedQuery) return true
    return (
      it.title.toLowerCase().includes(normalizedQuery) ||
      it.excerpt.toLowerCase().includes(normalizedQuery) ||
      it.tags.some((t) => t.toLowerCase().includes(normalizedQuery)) ||
      it.type.toLowerCase().includes(normalizedQuery)
    )
  }

  // Grid filtered list (all types)
  const gridList = useMemo(
    () => items.filter(matchesFilter),
    [items, normalizedQuery]
  )

  // Board filtered lists (only Opps and Risks)
  const boardOpps = useMemo(
    () =>
      board.opportunities
        .map((id) => items.find((i) => i.id === id))
        .filter((i): i is InsightCard => Boolean(i))
        .filter(matchesFilter),
    [board.opportunities, items, normalizedQuery]
  )
  const boardRisks = useMemo(
    () =>
      board.risks
        .map((id) => items.find((i) => i.id === id))
        .filter((i): i is InsightCard => Boolean(i))
        .filter(matchesFilter),
    [board.risks, items, normalizedQuery]
  )

  const onDragEnd = (e: DragEndEvent) => {
    const activeId = e.active.id as number
    const overId = e.over?.id as "opportunities" | "risks" | undefined
    if (!overId) return
    setBoard((prev) => {
      // Remove from any column
      const nextOpp = prev.opportunities.filter((id) => id !== activeId)
      const nextRisks = prev.risks.filter((id) => id !== activeId)
      // Add to target
      if (overId === "opportunities") nextOpp.push(activeId)
      if (overId === "risks") nextRisks.push(activeId)
      return { opportunities: nextOpp, risks: nextRisks }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-muted-foreground">
            Explore AI-detected trends, opportunities, and risks.
          </p>
        </div>
        {/* Search bar filters both tabs via zustand */}
        <div className="relative w-full sm:w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search insights…"
            value={query ?? ""} // keep controlled value as string [^2]
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="grid" className="space-y-6">
        <TabsList>
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
        </TabsList>

        {/* Grid tab: 3-column responsive cards */}
        <TabsContent value="grid">
          {gridList.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No insights match your search.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridList.slice(0, 999).map((insight) => (
                <Card key={insight.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={typeBadgeClass(insight.type)}>
                        {insight.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{insight.date}</span>
                    </div>
                    <CardTitle className="text-base mt-1">{insight.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{insight.excerpt}</p>
                    <div className="flex flex-wrap gap-1">
                      {insight.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Board tab: Opportunities and Risks with dnd-kit */}
        <TabsContent value="board">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DroppableColumn id="opportunities" title="Opportunities" colorClass="text-emerald-600">
                {boardOpps.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No items</div>
                ) : (
                  boardOpps.map((it) => <DraggableCard key={it.id} item={it} />)
                )}
              </DroppableColumn>

              <DroppableColumn id="risks" title="Risks" colorClass="text-red-600">
                {boardRisks.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No items</div>
                ) : (
                  boardRisks.map((it) => <DraggableCard key={it.id} item={it} />)
                )}
              </DroppableColumn>
            </div>
          </DndContext>
        </TabsContent>
      </Tabs>
    </div>
  )
}
