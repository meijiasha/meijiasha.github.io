
import { parseAddress } from "@/lib/geocoding";

export interface FetchedStoreData {
    name: string;
    address: string;
    place_id: string;
    phone_number: string;
    latitude: number;
    longitude: number;
    opening_hours_periods: any[];
    city: string;
    district: string;
    google_maps_url: string;
}

export const fetchStoreDataFromUrl = async (
    url: string,
    placesService: google.maps.places.PlacesService
): Promise<FetchedStoreData> => {
    return new Promise((resolve, reject) => {
        // Extract coordinates from URL for location bias
        // Priority 1: Specific store coordinates in data param (!3d...!4d...)
        const dataCoordsMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        // Priority 2: Viewport center coordinates (@...)
        const viewportCoordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

        let locationBias: google.maps.LatLngLiteral | undefined;

        if (dataCoordsMatch && dataCoordsMatch[1] && dataCoordsMatch[2]) {
            locationBias = {
                lat: parseFloat(dataCoordsMatch[1]),
                lng: parseFloat(dataCoordsMatch[2])
            };
            console.log("Parsed specific store coordinates from URL (!3d...!4d):", locationBias);
        } else if (viewportCoordsMatch && viewportCoordsMatch[1] && viewportCoordsMatch[2]) {
            locationBias = {
                lat: parseFloat(viewportCoordsMatch[1]),
                lng: parseFloat(viewportCoordsMatch[2])
            };
            console.log("Parsed viewport coordinates from URL (@...):", locationBias);
        } else {
            console.log("No coordinates found in URL");
        }

        // Extract query from URL
        const nameMatch = url.match(/google\.com\/maps\/place\/([^/]+)/);
        let query: string | null = null;
        if (nameMatch && nameMatch[1]) {
            query = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
        }

        const handlePlaceResult = (place: google.maps.places.PlaceResult) => {
            if (!place) {
                reject(new Error("Place result is empty"));
                return;
            }

            const { city, district } = parseAddress(place.formatted_address || "", place.address_components || []);

            // Extract periods
            let periods: any[] = [];
            if (place.opening_hours && place.opening_hours.periods) {
                periods = place.opening_hours.periods;
            }

            const data: FetchedStoreData = {
                name: place.name || "",
                address: place.formatted_address || "",
                place_id: place.place_id || "",
                phone_number: place.formatted_phone_number || "",
                latitude: place.geometry?.location?.lat() || 0,
                longitude: place.geometry?.location?.lng() || 0,
                opening_hours_periods: periods,
                city: city || "",
                district: district || "",
                google_maps_url: url
            };
            resolve(data);
        };

        const getPlaceDetails = (placeId: string) => {
            placesService.getDetails({
                placeId: placeId,
                fields: ['name', 'formatted_address', 'place_id', 'geometry', 'formatted_phone_number', 'opening_hours', 'address_components']
            }, (place, detailStatus) => {
                if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                    handlePlaceResult(place);
                } else {
                    console.error("GetDetails failed:", detailStatus);
                    reject(new Error(`GetDetails failed: ${detailStatus}`));
                }
            });
        };

        const executeTextSearch = (request: google.maps.places.TextSearchRequest) => {
            console.log("Executing TextSearch with request:", request);
            placesService.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    const firstResult = results[0];
                    console.log("TextSearch result:", firstResult.name, firstResult.formatted_address);

                    if (firstResult.place_id) {
                        getPlaceDetails(firstResult.place_id);
                    } else {
                        handlePlaceResult(firstResult);
                    }
                } else {
                    console.log("TextSearch failed");
                    reject(new Error("找不到店家資訊 (TextSearch failed)"));
                }
            });
        };

        // Main Search Logic
        if (locationBias) {
            console.log("Using location bias for search:", locationBias);

            // Use nearbySearch with RankBy.DISTANCE to find the closest establishment
            const nearbyRequest: google.maps.places.PlaceSearchRequest = {
                location: locationBias,
                rankBy: google.maps.places.RankBy.DISTANCE,
                type: 'establishment',
            };

            placesService.nearbySearch(nearbyRequest, (results, status) => {
                console.log("Nearby search status:", status);

                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    const bestMatch = results[0];
                    console.log("Best match found via NearbySearch (Establishment):", bestMatch.name);

                    if (bestMatch.place_id) {
                        getPlaceDetails(bestMatch.place_id);
                    } else {
                        // Should not happen for nearbySearch results usually have place_id
                        handlePlaceResult(bestMatch);
                    }
                } else {
                    console.log("Nearby search failed, falling back to TextSearch with bias");
                    if (query) {
                        const request: google.maps.places.TextSearchRequest = {
                            query: query,
                            location: locationBias,
                            radius: 100, // 100 meters radius
                        };
                        executeTextSearch(request);
                    } else {
                        reject(new Error("Nearby search failed and no query name found in URL"));
                    }
                }
            });
        } else if (query) {
            // No location bias, use findPlaceFromQuery (legacy behavior) or TextSearch
            // Using TextSearch for consistency
            const request: google.maps.places.TextSearchRequest = {
                query: query,
            };
            executeTextSearch(request);
        } else {
            reject(new Error("無法解析 Google Maps 網址 (無座標且無店名)"));
        }
    });
};
