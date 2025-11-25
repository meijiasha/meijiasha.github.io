import { useMemo, useState, useEffect } from "react";
import { cn, getCategoryColor } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, ChevronRight, ChevronLeft } from "lucide-react";
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
        isStoreListPanelOpen,
        setStoreListPanelOpen
    } = useAppStore();

    const [currentPage, setCurrentPage] = useState(1);

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
        background: 'rgba(255, 137, 0, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        border: '1px solid rgba(255, 137, 0, 0.3)',
    };

    if (!isStoreListPanelOpen) {
        return (
            <div
                className="h-full relative w-full flex flex-col items-center py-4 transition-all duration-300"
                style={glassStyle}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setStoreListPanelOpen(true)}
                    title="展開店家列表"
                    className="hover:bg-white/20"
                >
                    <ChevronLeft className="h-4 w-4 text-orange-900" />
                </Button>
                <div
                    className="text-orange-900 font-bold mt-4 tracking-widest"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                >
                    店家列表
                </div>
            </div>
        );
    }

    return (
        <div
            className="h-full flex flex-col w-full relative overflow-hidden transition-all duration-300"
            style={glassStyle}
        >
            <div className="p-4 border-b border-orange-200/30 flex justify-between items-center bg-white/10">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-orange-950">店家列表</h1>
                    <Badge variant="outline" className="bg-white/30 border-orange-200 text-orange-900">{filteredStores.length} 間</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setStoreListPanelOpen(false)} className="hover:bg-white/20">
                    <ChevronRight className="h-4 w-4 text-orange-900" />
                </Button>
            </div>

            <ScrollArea className="flex-1 bg-transparent">
                <div className="p-4 space-y-4">
                    {filteredStores.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            沒有符合條件的店家
                        </div>
                    ) : (
                        currentStores.map((store) => (
                            <Card
                                key={store.id}
                                className={`cursor-pointer transition-all hover:shadow-md bg-white/60 hover:bg-white/80 border-orange-100 ${selectedStore?.id === store.id ? 'border-orange-500 ring-1 ring-orange-500' : ''}`}
                                onClick={() => handleStoreClick(store)}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex flex-col items-start gap-1">
                                        <CardTitle className="text-base font-bold text-gray-900 line-clamp-2">{store.name}</CardTitle>
                                        <Badge variant="secondary" className={cn("text-xs", getCategoryColor(store.category))}>{store.category}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="text-sm text-gray-700 space-y-1">
                                        <div className="flex items-center">
                                            <MapPin className="w-3 h-3 mr-1 text-orange-600" />
                                            {store.district}
                                        </div>
                                        <div className="truncate">{store.address}</div>
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
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-orange-200/30 bg-white/10">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>

                            {/* Simple pagination: showing current page / total pages */}
                            <PaginationItem>
                                <span className="px-4 text-sm text-orange-900">
                                    {currentPage} / {totalPages}
                                </span>
                            </PaginationItem>

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
};
