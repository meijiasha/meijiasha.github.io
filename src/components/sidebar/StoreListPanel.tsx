import { useMemo, useState, useEffect } from "react";
import { cn, getCategoryColor } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink, X, Instagram, Clock } from "lucide-react";
import { InstagramEmbed } from 'react-social-media-embed';
import { getStoreStatus } from "@/lib/time";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import type { Store } from "@/types/store";
import { useAppStore } from "@/store/useAppStore";

import { DEFAULT_CITY } from "@/lib/locations";

interface StoreListPanelProps {
    stores: Store[];
}

const ITEMS_PER_PAGE = 10;

export const StoreListPanel = ({ stores }: StoreListPanelProps) => {
    const {
        selectedCity,
        selectedStore,
        setSelectedStore,
        setMapCenter,
        selectedDistrict,
        selectedCategory,
        setStoreListPanelOpen
    } = useAppStore();

    const [currentPage, setCurrentPage] = useState(1);
    const [expandedInstagramStoreIds, setExpandedInstagramStoreIds] = useState<Set<string>>(new Set());

    const toggleInstagram = (storeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedInstagramStoreIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(storeId)) {
                newSet.delete(storeId);
            } else {
                newSet.add(storeId);
            }
            return newSet;
        });
    };

    // Filter stores based on selection
    const filteredStores = useMemo(() => {
        return stores.filter((store) => {
            const storeCity = store.city || DEFAULT_CITY;
            const matchCity = storeCity === selectedCity;
            const matchDistrict = selectedDistrict === '全部' || store.district === selectedDistrict;
            const matchCategory = selectedCategory === '全部' || store.category === selectedCategory;
            return matchCity && matchDistrict && matchCategory;
        });
    }, [stores, selectedCity, selectedDistrict, selectedCategory]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDistrict, selectedCategory]);

    // Pagination logic
    const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE);
    const currentStores = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredStores.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredStores, currentPage]);

    const handleStoreClick = (store: Store) => {
        setSelectedStore(store);
        setMapCenter({ lat: store.lat, lng: store.lng });
    };

    const glassStyle = {
        background: 'rgba(239, 150, 46, 0.2)',
        borderRadius: '16px 0 0 16px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
    };

    return (
        <div
            className="h-full flex flex-col w-full relative overflow-hidden transition-all duration-300"
            style={glassStyle}
        >
            <div className="p-4 border-b border-border dark:border-b-0 flex justify-between items-center bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground">店家列表</h1>
                    <Badge variant="outline" className="bg-background/50 text-muted-foreground">{filteredStores.length} 間</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setStoreListPanelOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 bg-transparent">
                <div className="p-4 pb-0 text-center text-xs text-muted-foreground border-b border-border/50 mb-2">
                    營業時間資訊抓取自 Google Maps ，
                    <strong>還請確認營業時間</strong>。
                </div>
                <div className="p-4 space-y-4">
                    {filteredStores.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            沒有符合條件的店家
                        </div>
                    ) : (
                        currentStores.map((store) => (
                            <Card
                                key={store.id}
                                className={`cursor-pointer transition-all hover:shadow-md bg-card hover:bg-accent/50 border-border ${selectedStore?.id === store.id ? 'border-primary ring-1 ring-primary' : ''}`}
                                onClick={() => handleStoreClick(store)}
                            >
                                <CardHeader className="p-3 md:p-4 pb-2 md:pb-2">
                                    <div className="flex flex-col items-start gap-1">
                                        <div className="h-12 flex items-center w-full">
                                            <CardTitle className="text-base font-bold text-card-foreground line-clamp-2 leading-tight">{store.name}</CardTitle>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="secondary" className={cn("text-xs", getCategoryColor(store.category))}>{store.category}</Badge>
                                            {(() => {
                                                const { isOpen } = getStoreStatus(store.opening_hours_periods);
                                                return isOpen ? (
                                                    <Badge className="bg-green-500 hover:bg-green-600 text-white shadow-sm gap-1 text-xs px-1.5 h-5">
                                                        <Clock className="w-3 h-3" />
                                                        營業中
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-gray-500/80 text-white hover:bg-gray-600/80 shadow-sm gap-1 text-xs px-1.5 h-5">
                                                        <Clock className="w-3 h-3" />
                                                        休息中
                                                    </Badge>
                                                );
                                            })()}
                                        </div>
                                        {store.dishes && (
                                            <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                                                <span className="shrink-0">👍</span>
                                                <span className="line-clamp-1">{store.dishes}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <div className="flex items-center">
                                            <MapPin className="w-3 h-3 mr-1 text-primary" />
                                            {store.district}
                                        </div>
                                        <div className="line-clamp-2 h-10 flex items-center">{store.address}</div>
                                        {store.google_maps_url && (
                                            <a
                                                href={store.google_maps_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center text-blue-600 hover:underline mt-2"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                Google Maps
                                            </a>
                                        )}
                                        {store.instagram_url && (
                                            <div className="mt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full text-xs h-8 gap-2 text-pink-600 border-pink-200 hover:bg-pink-50 dark:text-pink-400 dark:border-pink-900 dark:hover:bg-pink-950/30"
                                                    onClick={(e) => toggleInstagram(store.id, e)}
                                                >
                                                    <Instagram className="w-3 h-3" />
                                                    {expandedInstagramStoreIds.has(store.id) ? "隱藏 Instagram" : "查看 Instagram"}
                                                </Button>
                                                {expandedInstagramStoreIds.has(store.id) && (
                                                    <div className="mt-2 -mx-2 overflow-hidden rounded-lg border border-border" onClick={(e) => e.stopPropagation()}>
                                                        <InstagramEmbed url={store.instagram_url} width="100%" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-2 border-t border-border bg-background/80 backdrop-blur-sm">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                            <span className="text-sm text-muted-foreground mx-2">
                                {currentPage} / {totalPages}
                            </span>
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
};
