import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, X, Instagram } from "lucide-react";
import { InstagramEmbed } from 'react-social-media-embed';
import type { Store } from "@/types/store";
import { useAppStore } from "@/store/useAppStore";
import { GOOGLE_MAPS_API_KEY } from "@/lib/config";
import { cn, getCategoryColor } from "@/lib/utils";

import { useState } from "react";

export const RecommendationCards = () => {
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
    const {
        recommendationResults,
        isRecommendationPanelOpen,
        setRecommendationPanelOpen,
        setSelectedStore,
        setMapCenter
    } = useAppStore();

    if (!isRecommendationPanelOpen || recommendationResults.length === 0) return null;

    const handleStoreClick = (store: Store) => {
        setSelectedStore(store);
        setMapCenter({ lat: store.lat, lng: store.lng });
    };

    const getPhotoUrl = (store: Store) => {
        if (store.photo_url) {
            console.log(`RecommendationCards: Using fetched photo_url for ${store.name}`);
            return store.photo_url;
        }
        if (store.photo_reference) {
            console.log(`RecommendationCards: Using photo_reference for ${store.name}`);
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${store.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
        }
        // Fallback to Static Map
        if (store.lat && store.lng) {
            console.log(`RecommendationCards: Using Static Map fallback for ${store.name}`);
            return `https://maps.googleapis.com/maps/api/staticmap?center=${store.lat},${store.lng}&zoom=15&size=400x300&markers=color:red%7C${store.lat},${store.lng}&key=${GOOGLE_MAPS_API_KEY}`;
        }
        console.warn(`RecommendationCards: No photo or location for ${store.name}, using placeholder`);
        return "/placeholder.svg";
    };

    if (!isRecommendationPanelOpen || recommendationResults.length === 0) {
        return null;
    }

    console.log("RecommendationCards: Rendering cards for", recommendationResults.length, "stores");
    return (
        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center items-end pointer-events-none px-4 pb-4">
            <div className="flex gap-4 overflow-x-auto max-w-full pb-2 pointer-events-auto snap-x snap-mandatory px-4 items-end">
                {recommendationResults.map((store, index) => (
                    <div
                        key={store.id}
                        className="w-[350px] h-[450px] shrink-0 snap-center perspective-1000 group animate-in zoom-in-50 fade-in slide-in-from-bottom-12 duration-700 ease-out fill-mode-backwards"
                        style={{ animationDelay: `${index * 150}ms` }}
                    >
                        <div
                            className={cn(
                                "relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]"
                            )}
                        >
                            {/* Back Face (Logo) - Now Default Visible (0deg) */}
                            <Card
                                className="absolute inset-0 w-full h-full shadow-xl border-2 border-primary bg-primary [backface-visibility:hidden] flex items-center justify-center cursor-pointer z-10"
                            >
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src="/meijiasha.svg" alt="Logo" className="w-32 h-32 opacity-90" />
                                </div>
                            </Card>

                            {/* Front Face (Info) - Now Flipped (180deg) */}
                            <Card
                                className="relative w-full h-full shadow-xl border-2 border-white/50 bg-white/90 backdrop-blur-md hover:bg-white transition-colors cursor-pointer [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col"
                                onClick={() => handleStoreClick(store)}
                            >
                                <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-gray-100">
                                    <img
                                        src={getPhotoUrl(store)}
                                        alt={store.name}
                                        className="w-full h-full object-cover transition-transform hover:scale-105"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (!target.src.includes('staticmap')) {
                                                target.src = `https://maps.googleapis.com/maps/api/staticmap?center=${store.lat},${store.lng}&zoom=17&size=400x300&markers=color:red%7C${store.lat},${store.lng}&key=${GOOGLE_MAPS_API_KEY}`;
                                            } else {
                                                target.src = "https://placehold.co/400x300?text=No+Image";
                                            }
                                        }}
                                    />
                                    {store.distance !== undefined && (
                                        <Badge variant="secondary" className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm text-black shadow-sm">
                                            {store.distance.toFixed(1)} km
                                        </Badge>
                                    )}
                                </div>
                                <CardContent className="p-4 flex-1 overflow-y-auto">
                                    <div className="flex flex-col items-start gap-1 mb-2">
                                        <div className="h-14 flex items-center w-full">
                                            <h3 className="font-bold text-lg line-clamp-2 leading-tight w-full dark:text-primary">{store.name}</h3>
                                        </div>
                                        <Badge variant="secondary" className={cn("text-xs", getCategoryColor(store.category))}>
                                            {store.category}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                                            <span className="line-clamp-2 min-h-[2.5rem]">{store.address}</span>
                                        </div>
                                        {store.phone_number && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 shrink-0 text-gray-400" />
                                                <span>{store.phone_number}</span>
                                            </div>
                                        )}
                                        <div className="mt-2">
                                            <div className="h-8">
                                                {store.instagram_url && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full text-xs h-8 gap-2 text-pink-600 border-pink-200 hover:bg-pink-50 dark:text-pink-400 dark:border-pink-900 dark:hover:bg-pink-950/30"
                                                        onClick={(e) => toggleInstagram(store.id, e)}
                                                    >
                                                        <Instagram className="w-3 h-3" />
                                                        {expandedInstagramStoreIds.has(store.id) ? "隱藏 Instagram" : "查看 Instagram"}
                                                    </Button>
                                                )}
                                            </div>
                                            {store.instagram_url && expandedInstagramStoreIds.has(store.id) && (
                                                <div className="mt-2 -mx-2 overflow-hidden rounded-lg border border-border" onClick={(e) => e.stopPropagation()}>
                                                    <InstagramEmbed url={store.instagram_url} width="100%" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                variant="secondary"
                size="icon"
                className="absolute top-[-40px] right-4 pointer-events-auto shadow-md rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
                onClick={() => setRecommendationPanelOpen(false)}
            >
                <X className="w-4 h-4" />
            </Button>
        </div>
    );
};
