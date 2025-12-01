
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, X, Instagram, Clock, ExternalLink } from "lucide-react";
import { InstagramEmbed } from 'react-social-media-embed';
import type { Store } from "@/types/store";
import { useAppStore } from "@/store/useAppStore";
import { useMap } from '@vis.gl/react-google-maps';
import { GOOGLE_MAPS_API_KEY } from "@/lib/config";
import { cn, getCategoryColor } from "@/lib/utils";
import { getStoreStatus } from "@/lib/time";

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

    const map = useMap();

    const handleStoreClick = (store: Store) => {
        setSelectedStore(store);

        if (map) {
            // Calculate offset to center store in top 1/3 of screen
            // We want the store to be at y = window.innerHeight / 3
            // Map center is at y = window.innerHeight / 2
            // So we need to shift the map center DOWN by (window.innerHeight / 2 - window.innerHeight / 3) = window.innerHeight / 6
            // Shifting map center down means panning by (0, window.innerHeight / 6)

            // First set center to store
            map.panTo({ lat: store.lat, lng: store.lng });

            // Then pan by offset
            // Note: panBy takes x, y in pixels. Positive y moves the map content UP (so the center moves DOWN relative to content? No.)
            // panBy(x, y): "Changes the center of the map by the given distance in pixels."
            // If y is positive, the center moves down.
            // If center moves down, the map content moves up.
            // We want the store (content) to move UP to the top 1/3.
            // So we need the center to move DOWN.
            // So y should be positive.

            // Wait, let's verify direction.
            // Center is (0,0). Store is at (0,0).
            // We want store at (0, -H/6) relative to center? No, screen coordinates.
            // Center is H/2. Target is H/3.
            // Target is ABOVE center.
            // So we need to move the map DOWN? No, move the map UP so the point moves UP?
            // If I drag the map UP, the content moves UP.
            // Dragging UP means the center latitude decreases (moves South).
            // Wait.
            // If I want the store to be higher on the screen, I need to look at a point SOUTH of the store.
            // So the new center should be SOUTH of the store.
            // To move center South, y pixel coordinate increases.
            // So panBy(0, positive) moves center South (down).
            // Yes.

            // Use a timeout to allow the first pan to complete/start? 
            // Actually panTo is smooth. panBy might interrupt or queue.
            // Better to calculate the target LatLng directly if possible, but panBy is easier for pixel offsets.
            // Let's try chaining.

            setTimeout(() => {
                map.panBy(0, window.innerHeight / 6);
            }, 100);
        } else {
            setMapCenter({ lat: store.lat, lng: store.lng });
        }
    };

    const getPhotoUrl = (store: Store) => {
        if (store.photo_url) {
            return store.photo_url;
        }
        if (store.photo_reference) {
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${store.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
        }
        // Fallback to Static Map
        if (store.lat && store.lng) {
            return `https://maps.googleapis.com/maps/api/staticmap?center=${store.lat},${store.lng}&zoom=15&size=400x300&markers=color:red%7C${store.lat},${store.lng}&key=${GOOGLE_MAPS_API_KEY}`;
        }
        return "/placeholder.svg";
    };

    if (!isRecommendationPanelOpen || recommendationResults.length === 0) {
        return null;
    }

    return (
        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center items-end pointer-events-none px-4 pb-4">
            <div className="flex gap-4 overflow-x-auto max-w-full pb-2 pointer-events-auto snap-x snap-mandatory px-4 items-end">
                {recommendationResults.map((store, index) => {
                    const { isOpen, nextTime } = getStoreStatus(store.opening_hours_periods);

                    return (
                        <div
                            key={store.id}
                            className="w-[350px] h-[50vh] md:h-[450px] shrink-0 snap-center perspective-1000 group animate-in zoom-in-50 fade-in slide-in-from-bottom-12 duration-700 ease-out fill-mode-backwards"
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
                                    style={{
                                        backgroundImage: "url('/bowl-25trans.svg')",
                                        backgroundRepeat: "repeat",
                                        backgroundSize: "50px" // Adjust size if needed, but default might be fine. Let's start without size or maybe a reasonable size.
                                    }}
                                >
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img src="/meijiasha.svg" alt="Logo" className="w-32 h-32 opacity-90" />
                                        {/* Open/Closed Badge on Back Face */}
                                        <div className="absolute top-2 left-2">
                                            {isOpen ? (
                                                <Badge className="bg-green-500 hover:bg-green-600 text-white shadow-sm gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    營業中
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-gray-500/80 text-white hover:bg-gray-600/80 shadow-sm gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    休息中
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2 w-full text-center">
                                        <p className="text-[10px] text-white/80 px-2">
                                            * 營業時間資訊抓取自 Google Maps ，
                                            <strong>還請確認營業時間</strong>。
                                        </p>
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
                                        {/* Open/Closed Badge */}
                                        <div className="absolute top-2 left-2">
                                            {isOpen ? (
                                                <Badge className="bg-green-500 hover:bg-green-600 text-white shadow-sm gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    營業中 {nextTime && `• 營業至 ${nextTime}`}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-gray-500/80 text-white hover:bg-gray-600/80 shadow-sm gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    休息中 {nextTime && `• ${nextTime} 開店`}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <CardContent className="p-4 flex-1 overflow-y-auto relative">
                                        <div className="flex flex-col items-start gap-1 mb-2">
                                            <div className="h-14 flex items-center w-full">
                                                <h3 className="font-bold text-lg line-clamp-2 leading-tight w-full dark:text-primary">{store.name}</h3>
                                            </div>
                                            <Badge variant="secondary" className={cn("text-xs", getCategoryColor(store.category))}>
                                                {store.category}
                                            </Badge>
                                            {store.dishes && (
                                                <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                                                    <span className="shrink-0">👍</span>
                                                    <span className="line-clamp-1">{store.dishes}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600 pb-6">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                                                <a
                                                    href={store.google_maps_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="line-clamp-2 min-h-[2.5rem] hover:underline hover:text-primary flex items-center gap-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {store.address}
                                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                                </a>
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
                                        <div className="absolute bottom-2 left-0 right-0 text-center">
                                            <p className="text-[10px] text-muted-foreground">
                                                * 營業時間資訊抓取自 Google Maps ，
                                                <strong>還請確認營業時間</strong>。
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )
                })}
            </div >

            <Button
                variant="secondary"
                size="icon"
                className="absolute top-[-40px] right-4 pointer-events-auto shadow-md rounded-full bg-white/80 backdrop-blur-sm hover:bg-white dark:bg-black dark:text-white dark:hover:bg-gray-800"
                onClick={() => setRecommendationPanelOpen(false)}
            >
                <X className="w-4 h-4" />
            </Button>
        </div >
    );
};
