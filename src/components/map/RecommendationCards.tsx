import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, X } from "lucide-react";
import type { Store } from "@/types/store";
import { useAppStore } from "@/store/useAppStore";
import { GOOGLE_MAPS_API_KEY } from "@/lib/config";

export const RecommendationCards = () => {
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
            <div className="flex gap-4 overflow-x-auto max-w-full pb-2 pointer-events-auto snap-x snap-mandatory">
                {recommendationResults.map((store) => (
                    <Card
                        key={store.id}
                        className="w-72 shrink-0 snap-center shadow-xl border-2 border-white/50 bg-white/90 backdrop-blur-md hover:bg-white transition-colors cursor-pointer"
                        onClick={() => handleStoreClick(store)}
                    >
                        <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-gray-100">
                            <img
                                src={getPhotoUrl(store)}
                                alt={store.name}
                                className="w-full h-full object-cover transition-transform hover:scale-105"
                                onError={(e) => {
                                    // If photo fails, try static map as backup, or placeholder
                                    const target = e.target as HTMLImageElement;
                                    if (!target.src.includes('staticmap')) {
                                        target.src = `https://maps.googleapis.com/maps/api/staticmap?center=${store.lat},${store.lng}&zoom=17&size=400x300&markers=color:red%7C${store.lat},${store.lng}&key=${GOOGLE_MAPS_API_KEY}`;
                                    } else {
                                        target.src = "https://placehold.co/400x300?text=No+Image";
                                    }
                                }}
                            />
                            <Badge className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white border-none">
                                {store.category}
                            </Badge>
                            {store.distance !== undefined && (
                                <Badge variant="secondary" className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm text-black shadow-sm">
                                    {store.distance.toFixed(1)} km
                                </Badge>
                            )}
                        </div>
                        <CardContent className="p-4">
                            <h3 className="font-bold text-lg truncate mb-1">{store.name}</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                                    <span className="line-clamp-2">{store.address}</span>
                                </div>
                                {store.phone_number && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 shrink-0 text-gray-400" />
                                        <span>{store.phone_number}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
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
