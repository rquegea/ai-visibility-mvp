// frontend/app/(dashboard)/mentions/page.tsx

"use client"
import { useMemo, useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
import { Mention, Insight } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, BrainCircuit, Star, Archive, MessageSquare, Undo } from 'lucide-react'
import SentimentChip from '@/components/sentiment-chip'
import { cn } from "@/lib/utils"

const InsightDetailModal = ({ insightId, originalQuery }: { insightId: number; originalQuery: string; }) => {
    const { data: insight, isLoading } = useSWR<Insight>(`/api/insights/${insightId}`, fetcher)
    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Análisis de Insight Detallado #{insightId}</DialogTitle>
                <p className="text-sm text-muted-foreground pt-2">
                    Generado a partir de la query: "{originalQuery}"
                </p>
            </DialogHeader>
            {isLoading ? <Skeleton className="h-48 w-full" /> : !insight ? (
                <div className="py-4 text-muted-foreground">No se encontró el insight.</div>
            ) : (
                <div className="space-y-4 max-h-[60vh] overflow-auto py-4 pr-4">
                    {/* ... (contenido del modal) ... */}
                </div>
            )}
        </DialogContent>
    )
};

const MentionCard = ({ mention, onArchive, onUnarchive, isArchivedView }: { mention: Mention; onArchive: (id: number) => void; onUnarchive: (id: number) => void; isArchivedView: boolean; }) => {
    if (!mention || typeof mention.id === 'undefined') {
        return null; // No renderizar si la mención no es válida
    }
    return (
        <Card className="hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <CardContent className="p-4 space-y-3 flex-1">
                <div className="flex justify-between items-center">
                    <Badge variant="outline">{mention.engine}</Badge>
                    <SentimentChip sentiment={mention.sentiment} emotion={mention.emotion} />
                </div>
                <p className="text-base font-medium leading-tight text-foreground flex-1">{mention.summary || "Resumen no disponible."}</p>
                <div className="min-h-[24px]">
                    <div className="flex flex-wrap items-center gap-2">
                        {(mention.key_topics || []).length > 0 && <span className="text-xs font-semibold text-muted-foreground">Temas:</span>}
                        {(mention.key_topics || []).map(topic => <Badge key={topic} variant="secondary">{topic}</Badge>)}
                    </div>
                </div>
            </CardContent>
            <div className="border-t p-2 flex justify-end items-center gap-1">
                {isArchivedView ? (
                    <Button variant="ghost" size="sm" onClick={() => onUnarchive(mention.id)}>
                        <Undo className="w-4 h-4 mr-2" /> Desarchivar
                    </Button>
                ) : (
                    <>
                        {mention.generated_insight_id && (
                            <Dialog><DialogTrigger asChild><Button variant="ghost" size="sm"><BrainCircuit className="w-4 h-4 mr-2" /> Ver Insight</Button></DialogTrigger><InsightDetailModal insightId={mention.generated_insight_id} originalQuery={mention.query} /></Dialog>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onArchive(mention.id)}><Archive className="w-4 h-4 mr-2" /> Archivar</Button>
                    </>
                )}
            </div>
        </Card>
    );
}

export default function MentionsPage() {
    const [view, setView] = useState<'active' | 'archived'>('active');
    const swrKey = `/api/mentions?status=${view}`;
    const { data: mentionsData, isLoading, mutate } = useSWR<{ mentions: Mention[] }>(swrKey, fetcher);
    
    const allMentions = useMemo(() => (mentionsData?.mentions || []).filter(m => m && typeof m.id !== 'undefined'), [mentionsData]);

    const handleArchive = async (id: number) => {
        const optimisticData = allMentions.filter(m => m.id !== id);
        mutate({ mentions: optimisticData }, false);
        try {
            await fetch(`/api/mentions/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archive: true }), headers: { 'Content-Type': 'application/json' }});
            mutate();
        } catch (error) {
            mutate({ mentions: allMentions }, false);
        }
    };

    const handleUnarchive = async (id: number) => {
        const optimisticData = allMentions.filter(m => m.id !== id);
        mutate({ mentions: optimisticData }, false);
        try {
            await fetch(`/api/mentions/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archive: false }), headers: { 'Content-Type': 'application/json' }});
            mutate();
        } catch (error) {
            mutate({ mentions: allMentions }, false);
        }
    };

    return (
        <div className="space-y-6 p-1 md:p-4 lg:p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Inbox de Menciones</h1>
                <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                    <TabsList><TabsTrigger value="active">Activas</TabsTrigger><TabsTrigger value="archived">Archivadas</TabsTrigger></TabsList>
                </Tabs>
            </div>
            {isLoading ? <Skeleton className="h-96 w-full" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allMentions.map(mention => (
                        <MentionCard key={mention.id} mention={mention} onArchive={handleArchive} onUnarchive={handleUnarchive} isArchivedView={view === 'archived'} />
                    ))}
                </div>
            )}
        </div>
    )
}