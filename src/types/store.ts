export interface Store {
    id: string;
    name: string;
    city: string;
    district: string;
    category: string;
    address: string;
    google_maps_url: string;
    place_id: string;
    lat: number;
    lng: number;
    latitude?: number;
    longitude?: number;
    location?: any; // GeoPoint
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    opening_hours?: string[];
    photo_reference?: string;
    phone_number?: string;
    website?: string;
    createdAt?: any; // Firebase Timestamp
    lastEditedAt?: any;
    description?: string; // Added description field
    dishes?: string; // Recommended dishes
    distance?: number; // Calculated distance from user
    photo_url?: string; // Fetched from Places API
    instagram_url?: string; // Instagram Post/Reel URL
    opening_hours_periods?: OpeningHoursPeriod[]; // Structured opening hours from Google Maps
}

export interface OpeningHoursPeriod {
    open: {
        day: number;
        time: string;
    };
    close?: {
        day: number;
        time: string;
    };
}
