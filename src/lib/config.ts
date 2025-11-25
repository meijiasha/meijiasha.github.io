export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDSQZ7B7N4HHTWx_EDC72v9-1rmV1K1srk";
export const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA4sQav5EeZowQKRya14xeG9Lj3TyMQdM4";

console.log("Google Maps API Key used:", GOOGLE_MAPS_API_KEY.substring(0, 10) + "...");

