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
import { Shuffle, Navigation, X, Loader2 } from "lucide-react";
import type { Store } from "@/types/store";
import { useAppStore } from "@/store/useAppStore";
import { useRecommendation } from "@/hooks/useRecommendation";

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
        <div className="h-full flex flex-col bg-white border-r w-full md:w-80 relative overflow-y-auto">
            <div className="p-4 space-y-6">
                <div className="flex flex-col items-center mb-4">
                    <img src="/logo.svg" alt="咩呷啥 Logo" className="h-16 w-auto mb-2" />
                    <h1 className="text-xl font-bold text-primary">咩呷啥</h1>
                    <p className="text-sm text-gray-500">今天吃什麼？</p>
                </div>

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
                            <h3 className="font-bold text-blue-800 flex items-center">
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
                                    className="cursor-pointer hover:shadow-md border-blue-200"
                                    onClick={() => handleStoreClick(store)}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="h-12 flex items-center">
                                                    <div className="font-bold line-clamp-2 leading-tight">{store.name}</div>
                                                </div>
                                                <Badge variant="secondary" className={cn("mt-1 text-xs", getCategoryColor(store.category))}>
                                                    {store.category}
                                                </Badge>
                                            </div>
                                            {store.distance !== undefined && (
                                                <Badge variant="outline" className="text-xs shrink-0 ml-2">
                                                    {store.distance.toFixed(1)} km
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">{store.address}</div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
