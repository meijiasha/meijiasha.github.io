import { useMemo, useEffect } from 'react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useAppStore } from '@/store/useAppStore';
import { StoreMarker } from './StoreMarker';
import { RecommendationCards } from './RecommendationCards';
import type { Store } from '@/types/store';

interface MapContainerProps {
    stores: Store[];
}

export const MapContainer = ({ stores }: MapContainerProps) => {
    const {
        mapCenter,
        mapZoom,
        setMapCenter,
        setMapZoom,
        setSelectedStore,
        selectedDistrict,
        selectedCategory,
        isRecommendationPanelOpen,
        recommendationResults,
        userLocation,
        setUserLocation
    } = useAppStore();

    // Get user location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    console.warn("Error getting location:", error);
                }
            );
        }
    }, [setUserLocation]);

    const storesToDisplay = useMemo(() => {
        let results: Store[] = [];
        if (isRecommendationPanelOpen && recommendationResults.length > 0) {
            console.log("MapContainer: Displaying recommendation results:", recommendationResults.length);
            results = recommendationResults;
        } else {
            console.log("MapContainer: Filtering stores. Total:", stores.length, "District:", selectedDistrict, "Category:", selectedCategory);
            results = stores.filter((store) => {
                const matchDistrict = selectedDistrict === '全部' || store.district === selectedDistrict;
                const matchCategory = selectedCategory === '全部' || store.category === selectedCategory;
                return matchDistrict && matchCategory;
            });
        }

        // Filter out invalid coordinates to prevent map crash
        const validStores = results.filter(s => {
            const isValid = typeof s.lat === 'number' && !isNaN(s.lat) &&
                typeof s.lng === 'number' && !isNaN(s.lng);
            if (!isValid) {
                console.warn("MapContainer: Invalid coordinates for store:", s.name, s.lat, s.lng);
            }
            return isValid;
        });

        console.log("MapContainer: Final stores to display:", validStores.length);
        return validStores;
    }, [stores, selectedDistrict, selectedCategory, isRecommendationPanelOpen, recommendationResults]);

    return (
        <div className="w-full h-full relative">
            <Map
                center={mapCenter}
                zoom={mapZoom}
                onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
                onZoomChanged={(ev) => setMapZoom(ev.detail.zoom)}
                disableDefaultUI={false}
                mapId={"bf51a910020fa25a"} // Required for AdvancedMarker. Using a demo ID or user should provide one.
                style={{ width: '100%', height: '100%' }}
                gestureHandling={'greedy'}
            >
                {storesToDisplay.map((store) => (
                    <StoreMarker
                        key={store.id}
                        store={store}
                        onClick={setSelectedStore}
                    />
                ))}

                {userLocation &&
                    typeof userLocation.lat === 'number' && !isNaN(userLocation.lat) &&
                    typeof userLocation.lng === 'number' && !isNaN(userLocation.lng) && (
                        <AdvancedMarker position={userLocation} title="您的位置">
                            <Pin background={'#4285F4'} glyphColor={'#FFF'} borderColor={'#FFF'} />
                        </AdvancedMarker>
                    )}
            </Map>

            <RecommendationCards />
        </div>
    );
};
