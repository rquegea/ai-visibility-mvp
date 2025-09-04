// frontend/app/(dashboard)/mentions/page.tsx (Versión Final con Favoritos y Papelera)

"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { fetcher } from "@/libs/fetcher"
import { useGlobalFilters, buildGlobalQueryParams } from '@/stores/use-global-filters'
import { Mention, Insight } from "@/types"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, BrainCircuit, Star, Zap, Archive, MessageSquare, Trash2, Undo } from 'lucide-react'
import SentimentChip from '@/components/sentiment-chip'
import { cn } from "@/lib/utils"

// --- Componente Modal para ver el Insight Detallado (ya lo teníamos) ---
const InsightDetailModal = ({ insightId, originalQuery }: { insightId: number; originalQuery: string; }) => {
    // ... (este componente se queda exactamente igual que en la versión anterior) ...
    const { data: insight, isLoading } = useSWR<Insight>(`/api/insights/${insightId}`, fetcher)
    return (
        <DialogContent className="max-w-2xl">
            {/* ... Contenido del modal ... */}
        </DialogContent>
    )
};


// --- Componente de Tarjeta de Mención con TODAS las acciones ---
const MentionCard = ({ 
    mention,
    isFavorite,
    onToggleFavorite,
    onArchive
}: { 
    mention: Mention;
    isFavorite: boolean;
    onToggleFavorite: (id: number) => void;
    onArchive: (id: number) => void;
}) => {
    return (
        <Card className={cn(
            "hover:shadow-lg transition-shadow duration-300 flex flex-col",
            isFavorite && "border-yellow-400"
        )}>
            <CardContent className="p-4 space-y-3 flex-1">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{mention.engine}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(mention.created_at).toLocaleDateString()}</span>
                    </div>
                    <SentimentChip sentiment={mention.sentiment} emotion={mention.emotion} />
                </div>
                <p className="text-base font-medium leading-tight text-foreground flex-1">
                    {mention.summary || "Resumen no disponible."}
                </p>
                <div className="min-h-[24px]">
                    <div className="flex flex-wrap items-center gap-2">
                        {(mention.key_topics || []).length > 0 && <span className="text-xs font-semibold text-muted-foreground">Temas:</span>}
                        {(mention.key_topics || []).map(topic => <Badge key={topic} variant="secondary">{topic}</Badge>)}
                    </div>
                </div>
            </CardContent>
            <div className="border-t p-2 flex justify-between items-center gap-1">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onToggleFavorite(mention.id)}>
                    <Star className={cn("w-4 h-4", isFavorite ? "text-yellow-500 fill-yellow-400" : "text-muted-foreground")} />
                </Button>
                <div className="flex items-center gap-1">
                    {mention.generated_insight_id && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm"><BrainCircuit className="w-4 h-4 mr-2" /> Ver Insight</Button>
                            </DialogTrigger>
                            <InsightDetailModal insightId={mention.generated_insight_id} originalQuery={mention.query} />
                        </Dialog>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onArchive(mention.id)}>
                        <Archive className="w-4 h-4 mr-2" /> Archivar
                    </Button>
                </div>
            </div>
        </Card>
    );
}

// --- Componente principal de la Página de Menciones ---
export default function MentionsPage() {
    const globalFilters = useGlobalFilters();
    const queryParams = buildGlobalQueryParams(globalFilters);
    const [view, setView] = useState<'active' | 'archived'>('active');
    
    const swrKey = `/api/mentions?${queryParams}&limit=100&status=${view}`;
    const { data: mentionsData, isLoading, mutate } = useSWR<{ mentions: Mention[] }>(swrKey, fetcher);
    
    const allMentions = mentionsData?.mentions || [];
    const [searchTerm, setSearchTerm] = useState('');
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

    const toggleFavorite = (id: number) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleArchive = async (id: number) => {
        const optimisticData = allMentions.filter(m => m.id !== id);
        mutate({ mentions: optimisticData }, false);
        await fetch(`/api/mentions/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archive: true }), headers: { 'Content-Type': 'application/json' }});
        mutate();
    };

    const handleUnarchive = async (id: number) => {
        const optimisticData = allMentions.filter(m => m.id !== id);
        mutate({ mentions: optimisticData }, false);
        await fetch(`/api/mentions/${id}/archive`, { method: 'PATCH', body: JSON.stringify({ archive: false }), headers: { 'Content-Type': 'application/json' }});
        mutate();
    };

    const filteredMentions = useMemo(() => {
        const filtered = allMentions.filter(mention => 
            mention.summary?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            mention.response.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return filtered.sort((a, b) => (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0));
    }, [allMentions, searchTerm, favorites]);

    return (
        <div className="space-y-6 p-1 md:p-4 lg:p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Inbox de Menciones</h1>
                    <p className="text-muted-foreground">Analiza y actúa sobre la inteligencia generada por la IA.</p>
                </div>
                <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="active">Activas</TabsTrigger>
                        <TabsTrigger value="archived">Archivadas</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={`Buscar en ${allMentions.length} menciones...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 w-full" />)}
                </div>
            ) : filteredMentions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="font-semibold">{view === 'active' ? '¡Bandeja de entrada a cero!' : 'No hay menciones archivadas'}</h3>
                    <p>{view === 'active' ? 'Has revisado todas las menciones.' : 'Las menciones que archives aparecerán aquí.'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMentions.map(mention => (
                        <MentionCard 
                            key={mention.id} 
                            mention={mention}
                            isFavorite={favorites.has(mention.id)}
                            onToggleFavorite={toggleFavorite}
                            onArchive={view === 'active' ? handleArchive : handleUnarchive}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}