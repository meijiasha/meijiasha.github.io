import { create } from 'zustand';
import type { Store } from '@/types/store';

interface AppState {
    selectedCity: string;
    selectedDistrict: string;
    selectedCategory: string;
    selectedStore: Store | null;
    mapCenter: { lat: number; lng: number };
    mapZoom: number;
    isSidebarOpen: boolean;
    userLocation: { lat: number; lng: number } | null;
    isRecommendationPanelOpen: boolean;
    recommendationResults: Store[];
    isStoreListPanelOpen: boolean;

    setCity: (city: string) => void;
    setDistrict: (district: string) => void;
    setCategory: (category: string) => void;
    setSelectedStore: (store: Store | null) => void;
    setMapCenter: (center: { lat: number; lng: number }) => void;
    setMapZoom: (zoom: number) => void;
    setSidebarOpen: (isOpen: boolean) => void;
    setUserLocation: (location: { lat: number; lng: number } | null) => void;
    setRecommendationPanelOpen: (isOpen: boolean) => void;
    setRecommendationResults: (results: Store[]) => void;
    setStoreListPanelOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    selectedCity: '台北市',
    selectedDistrict: '全部',
    selectedCategory: '全部',
    selectedStore: null,
    mapCenter: { lat: 25.0330, lng: 121.5654 }, // Default to Taipei
    mapZoom: 13,
    isSidebarOpen: true, // Default open on desktop
    userLocation: null,
    isRecommendationPanelOpen: false,
    recommendationResults: [],
    isStoreListPanelOpen: true,

    setCity: (city) => set({ selectedCity: city }),
    setDistrict: (district) => set({ selectedDistrict: district }),
    setCategory: (category) => set({ selectedCategory: category }),
    setSelectedStore: (store) => set({ selectedStore: store }),
    setMapCenter: (center) => set({ mapCenter: center }),
    setMapZoom: (zoom) => set({ mapZoom: zoom }),
    setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    setUserLocation: (location) => set({ userLocation: location }),
    setRecommendationPanelOpen: (isOpen) => set({ isRecommendationPanelOpen: isOpen }),
    setRecommendationResults: (results) => set({ recommendationResults: results }),
    setStoreListPanelOpen: (isOpen) => set({ isStoreListPanelOpen: isOpen }),
}));
