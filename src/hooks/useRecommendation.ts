import { useState, useCallback } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useAppStore } from '@/store/useAppStore';
import { getDistance } from '@/lib/distanceUtils';
import type { Store } from '@/types/store';

import { DEFAULT_CITY } from '@/lib/locations';

export function useRecommendation() {
    const map = useMap();
    const placesLib = useMapsLibrary('places');
    const {
        userLocation,
        setRecommendationResults,
        setRecommendationPanelOpen,
        setMapCenter
    } = useAppStore();

    const [isRecommending, setIsRecommending] = useState(false);

    const recommendRandom = useCallback(async (
        stores: Store[],
        city: string,
        district: string,
        category: string,
        isOpenNow: boolean
    ) => {
        if (!stores || stores.length === 0) {
            alert("目前列表無店家可供推薦");
            return;
        }

        setIsRecommending(true);
        setRecommendationResults([]); // Clear previous

        try {
            // 1. Filter by City, District & Category (Client-side)
            let candidates = stores.filter(s => {
                const storeCity = s.city || DEFAULT_CITY;
                const matchCity = storeCity === city;
                const matchDistrict = district === '全部' || s.district === district;
                const matchCategory = category === '全部' || s.category === category;
                return matchCity && matchDistrict && matchCategory;
            });

            if (candidates.length === 0) {
                alert("此條件下無店家可供推薦");
                setIsRecommending(false);
                return;
            }

            // 2. Shuffle
            candidates = candidates.sort(() => 0.5 - Math.random());

            // 3. Filter by "Open Now" if requested, and fetch photos
            const results: Store[] = [];
            const service = (map && placesLib) ? new placesLib.PlacesService(map) : null;

            // Helper to fetch details (photo)
            const fetchDetails = (store: Store): Promise<Store> => {
                if (!service || !store.place_id || !placesLib) {
                    console.log(`useRecommendation: Skipping photo fetch for ${store.name} (No service or place_id)`);
                    return Promise.resolve(store);
                }
                return new Promise((resolve) => {
                    service.getDetails(
                        { placeId: store.place_id, fields: ['photos'] },
                        (place: any, status: any) => {
                            if (status === placesLib.PlacesServiceStatus.OK && place?.photos && place.photos.length > 0) {
                                const photoUrl = place.photos[0].getUrl({ maxWidth: 400 });
                                console.log(`useRecommendation: Fetched photo for ${store.name}`);
                                resolve({ ...store, photo_url: photoUrl });
                            } else {
                                console.warn(`useRecommendation: No photo found for ${store.name}, status: ${status}`);
                                resolve(store);
                            }
                        }
                    );
                });
            };

            if (isOpenNow && service && placesLib) {
                console.log("useRecommendation: Checking Open Now and fetching photos...");
                // Check open status AND fetch photo
                for (const store of candidates) {
                    if (results.length >= 3) break;
                    if (!store.place_id) continue;

                    try {
                        const details = await new Promise<{ isOpen: boolean, photoUrl?: string }>((resolve) => {
                            service.getDetails(
                                { placeId: store.place_id, fields: ['opening_hours', 'photos'] },
                                (place: any, status: any) => {
                                    let isOpen = false;
                                    let photoUrl = undefined;

                                    if (status === placesLib.PlacesServiceStatus.OK) {
                                        if (place?.opening_hours) {
                                            isOpen = place.opening_hours.isOpen() || false;
                                        }
                                        if (place?.photos && place.photos.length > 0) {
                                            photoUrl = place.photos[0].getUrl({ maxWidth: 400 });
                                        }
                                    } else {
                                        console.warn(`useRecommendation: Places API error for ${store.name}: ${status}`);
                                    }
                                    resolve({ isOpen, photoUrl });
                                }
                            );
                        });

                        if (details.isOpen) {
                            console.log(`useRecommendation: ${store.name} is OPEN`);
                            results.push({ ...store, photo_url: details.photoUrl });
                        } else {
                            console.log(`useRecommendation: ${store.name} is CLOSED`);
                        }
                    } catch (e) {
                        console.error(`Error checking details for ${store.name}`, e);
                    }
                }
            } else {
                console.log("useRecommendation: Fetching photos for top 3 candidates...");
                // Just take top 3, but fetch photos for them
                const top3 = candidates.slice(0, 3);
                if (service) {
                    for (const store of top3) {
                        const updatedStore = await fetchDetails(store);
                        results.push(updatedStore);
                    }
                } else {
                    console.warn("useRecommendation: Places Service not available, skipping photo fetch.");
                    results.push(...top3);
                }
            }

            if (results.length === 0 && isOpenNow) {
                alert("找不到目前營業中的店家");
            } else {
                setRecommendationResults(results);
                setRecommendationPanelOpen(true);

                // Center and zoom map on the first result (the random pick)
                if (results.length > 0) {
                    const targetStore = results[0];
                    setMapCenter({ lat: targetStore.lat, lng: targetStore.lng });
                    useAppStore.getState().setMapZoom(16); // Access store directly or add setMapZoom to destructuring
                }
            }

        } catch (error) {
            console.error("Recommendation error:", error);
            alert("推薦過程中發生錯誤");
        } finally {
            setIsRecommending(false);
        }
    }, [map, placesLib, setRecommendationResults, setRecommendationPanelOpen]);

    const recommendNearby = useCallback(async (allStores: Store[]) => {
        if (!userLocation) {
            alert("請先允許存取您的位置");
            return;
        }

        setIsRecommending(true);
        setRecommendationResults([]);

        try {
            const nearbyStores = allStores
                .map(store => {
                    const dist = getDistance(
                        userLocation.lat,
                        userLocation.lng,
                        store.lat,
                        store.lng
                    );
                    return { ...store, distance: dist }; // Store type doesn't have distance, but we can add it temporarily or extend type
                })
                .filter(s => s.distance <= 2) // 2km radius
                .sort(() => 0.5 - Math.random()) // Shuffle randomly
                .slice(0, 3);

            if (nearbyStores.length === 0) {
                alert("附近 2 公里內無收錄店家");
            } else {
                // Fetch photos for nearby stores
                const results: Store[] = [];
                const service = (map && placesLib) ? new placesLib.PlacesService(map) : null;

                if (service && placesLib) {
                    for (const store of nearbyStores) {
                        try {
                            const photoUrl = await new Promise<string | undefined>((resolve) => {
                                if (!store.place_id) {
                                    resolve(undefined);
                                    return;
                                }
                                service.getDetails(
                                    { placeId: store.place_id, fields: ['photos'] },
                                    (place: any, status: any) => {
                                        if (status === placesLib.PlacesServiceStatus.OK && place?.photos && place.photos.length > 0) {
                                            resolve(place.photos[0].getUrl({ maxWidth: 400 }));
                                        } else {
                                            resolve(undefined);
                                        }
                                    }
                                );
                            });
                            results.push({ ...store, photo_url: photoUrl });
                        } catch (e) {
                            results.push(store);
                        }
                    }
                } else {
                    results.push(...nearbyStores);
                }

                setRecommendationResults(results);
                setRecommendationPanelOpen(true);
            }
        } catch (error) {
            console.error("Nearby recommendation error:", error);
            alert("搜尋附近店家時發生錯誤");
        } finally {
            setIsRecommending(false);
        }
    }, [userLocation, map, placesLib, setRecommendationResults, setRecommendationPanelOpen]);

    return {
        recommendRandom,
        recommendNearby,
        isRecommending
    };
}
