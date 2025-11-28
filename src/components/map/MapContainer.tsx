import { useMemo, useEffect, useState } from 'react';
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useAppStore } from '@/store/useAppStore';
import { StoreMarker } from './StoreMarker';
import { RecommendationCards } from './RecommendationCards';
import type { Store } from '@/types/store';

interface MapContainerProps {
    stores: Store[];
}

import { DEFAULT_CITY } from "@/lib/locations";

import { darkModeStyles } from './mapStyles';
import { useTheme } from '@/components/theme-provider';

export const MapContainer = ({ stores }: MapContainerProps) => {
    const { theme } = useTheme();
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (theme === 'system') {
            const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setIsDark(systemIsDark);
        } else {
            setIsDark(theme === 'dark');
        }
    }, [theme]);

    const {
        selectedCity,
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
        setUserLocation,
        isUserLocationInfoOpen,
        setUserLocationInfoOpen,
        locateUserTrigger
    } = useAppStore();

    const map = useMap();
    const coreLib = useMapsLibrary('core');

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

    // Auto-fit bounds when selectedCity changes
    useEffect(() => {
        // If recommendation panel is open, we let the other effect handle bounds
        if (!map || !coreLib || !stores.length || isRecommendationPanelOpen) return;

        const cityStores = stores.filter(store => {
            const storeCity = store.city || DEFAULT_CITY;
            return storeCity === selectedCity;
        });

        if (cityStores.length > 0) {
            const bounds = new coreLib.LatLngBounds();
            cityStores.forEach(store => {
                if (typeof store.lat === 'number' && typeof store.lng === 'number') {
                    bounds.extend({ lat: store.lat, lng: store.lng });
                }
            });
            map.fitBounds(bounds);
        }
    }, [map, coreLib, selectedCity, stores, isRecommendationPanelOpen]);

    // Auto-fit bounds for recommendations
    useEffect(() => {
        if (!map || !coreLib) return;

        if (isRecommendationPanelOpen && recommendationResults.length > 0) {
            console.log("MapContainer: Fitting bounds for recommendations");
            const bounds = new coreLib.LatLngBounds();
            let hasValidCoords = false;
            recommendationResults.forEach(store => {
                if (typeof store.lat === 'number' && typeof store.lng === 'number') {
                    bounds.extend({ lat: store.lat, lng: store.lng });
                    hasValidCoords = true;
                }
            });

            if (hasValidCoords) {
                // Fit bounds with padding to position markers in the top area
                // We want the markers to be in the top 1/3 of the screen
                // So we add padding to the bottom equal to 2/3 of the screen height
                const bottomPadding = window.innerHeight * 0.65;

                map.fitBounds(bounds, {
                    top: 50,
                    right: 50,
                    left: 50,
                    bottom: bottomPadding
                });
            }
        }
    }, [map, coreLib, isRecommendationPanelOpen, recommendationResults]);

    // Handle Locate Me trigger
    useEffect(() => {
        if (!map || !userLocation || locateUserTrigger === 0) return;

        console.log("MapContainer: Locate user triggered");

        // Always open the info window
        setUserLocationInfoOpen(true);
        setMapZoom(16);

        if (isRecommendationPanelOpen) {
            // If recommendation panel is open, center with offset
            console.log("MapContainer: Centering user with offset (panel open)");
            map.panTo(userLocation);

            // Pan down to move user up
            setTimeout(() => {
                map.panBy(0, window.innerHeight / 6);
            }, 100);
        } else {
            // Normal centering
            console.log("MapContainer: Centering user normally");
            map.panTo(userLocation);
        }
    }, [locateUserTrigger, map, userLocation, isRecommendationPanelOpen, setUserLocationInfoOpen, setMapZoom]);

    const storesToDisplay = useMemo(() => {
        let results: Store[] = [];
        if (isRecommendationPanelOpen && recommendationResults.length > 0) {
            console.log("MapContainer: Displaying recommendation results:", recommendationResults.length);
            results = recommendationResults;
        } else {
            console.log("MapContainer: Filtering stores. Total:", stores.length, "City:", selectedCity, "District:", selectedDistrict, "Category:", selectedCategory);
            results = stores.filter((store) => {
                // Show all cities, but filter by district/category if selected
                // Note: District filtering usually implies a specific city, but if 'All' is selected, we show everything.
                // If a specific district is selected (e.g. 'Xinyi'), it will only show stores in that district (likely only in the selected city).

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
                disableDefaultUI={true}
                mapId={"bf51a910020fa25a"} // Required for AdvancedMarker. Using a demo ID or user should provide one.
                style={{ width: '100%', height: '100%' }}
                styles={isDark ? darkModeStyles : []}
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
                        <>
                            <AdvancedMarker position={userLocation} onClick={() => setUserLocationInfoOpen(true)}>
                                <Pin background={'#4285F4'} glyphColor={'#FFF'} borderColor={'#FFF'} />
                                {isUserLocationInfoOpen && (
                                    <div className="absolute left-1/2 bottom-full mb-10 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-md whitespace-nowrap shadow-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 z-50">
                                        <span>你在這裡</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setUserLocationInfoOpen(false);
                                            }}
                                            className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M18 6 6 18" />
                                                <path d="m6 6 12 12" />
                                            </svg>
                                        </button>
                                        <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-primary"></div>
                                    </div>
                                )}
                            </AdvancedMarker>
                        </>
                    )}
            </Map>

            <RecommendationCards />
        </div>
    );
};
