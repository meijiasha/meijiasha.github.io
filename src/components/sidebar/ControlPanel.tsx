import { useState, useMemo } from "react";
import { cn, getCategoryColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Shuffle, Navigation, X, Loader2, Instagram, Clock } from "lucide-react";
import { InstagramEmbed } from 'react-social-media-embed';
import type { Store } from "@/types/store";
import { useAppStore } from "@/store/useAppStore";
import { useRecommendation } from "@/hooks/useRecommendation";
import { getStoreStatus } from "@/lib/time";

import { CITIES, DISTRICTS, DEFAULT_CITY, type CityName } from "@/lib/locations";

interface ControlPanelProps {
    stores: Store[];
}

export const ControlPanel = ({ stores }: ControlPanelProps) => {
    const {
        selectedCity,
        setCity,
        selectedDistrict,
        setDistrict,
        selectedCategory,
        setCategory,
        isRecommendationPanelOpen,
        setRecommendationPanelOpen,
        recommendationResults,
        setSelectedStore,
        setMapCenter
    } = useAppStore();

    const { recommendRandom, recommendNearby, isRecommending } = useRecommendation();
    const [isOpenNow, setIsOpenNow] = useState(false);
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

    // Get current districts based on selected city
    const currentDistricts = useMemo(() => {
        return DISTRICTS[selectedCity as CityName] || DISTRICTS[DEFAULT_CITY];
    }, [selectedCity]);

    // Reset district when city changes
    // Note: We handle this in the onChange handler to avoid useEffect loops if not careful,
    // but useEffect is also fine. Let's do it in the handler.

    // Derive available categories based on selected city and district
    const availableCategories = useMemo(() => {
        let filteredStores = stores;

        // Filter by City (if store has city field, otherwise assume Taipei for legacy)
        filteredStores = filteredStores.filter(s => {
            const storeCity = s.city || DEFAULT_CITY;
            return storeCity === selectedCity;
        });

        // Filter by District
        if (selectedDistrict !== '全部') {
            filteredStores = filteredStores.filter(s => s.district === selectedDistrict);
        }

        const categories = new Set(filteredStores.map(s => s.category).filter(Boolean));
        return Array.from(categories);
    }, [stores, selectedCity, selectedDistrict]);

    const handleRandomRecommend = () => {
        recommendRandom(stores, selectedCity, selectedDistrict, selectedCategory, isOpenNow);
    };

    const handleNearbyRecommend = () => {
        recommendNearby(stores);
    };

    const handleStoreClick = (store: Store) => {
        setSelectedStore(store);
        setMapCenter({ lat: store.lat, lng: store.lng });
    };

    const handleCityChange = (city: string) => {
        setCity(city);
        setDistrict('全部'); // Reset district when city changes
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-black border-r w-full md:w-80 relative overflow-y-auto">
            <div className="p-4 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>縣市</Label>
                        <Select value={selectedCity} onValueChange={handleCityChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="選擇縣市" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(CITIES).map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>行政區</Label>
                        <Select value={selectedDistrict} onValueChange={setDistrict}>
                            <SelectTrigger>
                                <SelectValue placeholder="選擇行政區" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="全部">全部</SelectItem>
                                {currentDistricts.map(d => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>分類</Label>
                        <Select value={selectedCategory} onValueChange={setCategory} disabled={availableCategories.length === 0}>
                            <SelectTrigger>
                                <SelectValue placeholder="選擇分類" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="全部">全部</SelectItem>
                                {availableCategories.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="openNow"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={isOpenNow}
                            onChange={(e) => setIsOpenNow(e.target.checked)}
                        />
                        <Label htmlFor="openNow" className="cursor-pointer">僅顯示營業中</Label>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleRandomRecommend}
                            disabled={isRecommending}
                        >
                            {isRecommending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shuffle className="mr-2 h-4 w-4" />}
                            隨機推薦
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleNearbyRecommend}
                            disabled={isRecommending}
                        >
                            {isRecommending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
                            推薦附近
                        </Button>
                    </div>
                </div>

                {/* Recommendation Results */}
                {isRecommendationPanelOpen && (
                    <div className="mt-6 border-t pt-4 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-foreground flex items-center">
                                <Shuffle className="w-4 h-4 mr-2" /> 推薦結果
                            </h3>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRecommendationPanelOpen(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {recommendationResults.map(store => (
                                <Card
                                    key={store.id}
                                    className="cursor-pointer hover:shadow-md border-border bg-card text-card-foreground"
                                    onClick={() => handleStoreClick(store)}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="h-12 flex items-center">
                                                    <div className="font-bold line-clamp-2 leading-tight">{store.name}</div>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    <Badge variant="secondary" className={cn("text-xs", getCategoryColor(store.category))}>
                                                        {store.category}
                                                    </Badge>
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
                                            </div>
                                            {store.distance !== undefined && (
                                                <Badge variant="outline" className="text-xs shrink-0 ml-2">
                                                    {store.distance.toFixed(1)} km
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-2">{store.address}</div>
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
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <div className="p-4 text-center text-xs text-muted-foreground border-t border-border/50 mt-4">
                            營業時間資訊抓取自 Google Maps ，
                            <strong>還請確認營業時間</strong>。
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
