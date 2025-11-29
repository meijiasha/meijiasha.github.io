import { GOOGLE_MAPS_API_KEY } from './config';
import { CITIES, DISTRICTS, type CityName } from './locations';

interface GeocodeResult {
    city: string | null;
    district: string | null;
}

export function parseAddress(formatted_address: string, address_components: any[]): GeocodeResult {
    let city: string | null = null;
    let district: string | null = null;

    // Strategy: Look for keywords in ANY component to identify the city
    const fullAddress = formatted_address || '';

    // Helper to check if string contains keyword
    const hasKeyword = (str: string, keywords: string[]) => keywords.some(k => str.includes(k));

    // 1. Check for New Taipei City (新北市)
    if (hasKeyword(fullAddress, ['新北', 'New Taipei']) || address_components.some(c => hasKeyword(c.long_name, ['新北', 'New Taipei']))) {
        city = CITIES.NewTaipei;
    }
    // 2. Check for Taipei City (台北市/臺北市)
    else if (hasKeyword(fullAddress, ['台北', '臺北', 'Taipei City']) || address_components.some(c => hasKeyword(c.long_name, ['台北', '臺北', 'Taipei City']))) {
        city = CITIES.Taipei;
    }
    // 3. Check for Taichung City (台中市/臺中市)
    else if (hasKeyword(fullAddress, ['台中', '臺中', 'Taichung']) || address_components.some(c => hasKeyword(c.long_name, ['台中', '臺中', 'Taichung']))) {
        city = CITIES.Taichung;
    }
    // 4. Check for Kaohsiung City (高雄市)
    else if (hasKeyword(fullAddress, ['高雄', 'Kaohsiung']) || address_components.some(c => hasKeyword(c.long_name, ['高雄', 'Kaohsiung']))) {
        city = CITIES.Kaohsiung;
    }

    // If we found a city, try to find the district
    if (city) {
        const validDistricts = DISTRICTS[city as CityName];

        // Find district in components
        for (const component of address_components) {
            const name = component.long_name;
            const matchedDistrict = validDistricts.find(d => name.includes(d) || d.includes(name));
            if (matchedDistrict) {
                district = matchedDistrict;
                break;
            }
        }

        console.log("Fuzzy Match Result - City:", city, "District:", district);
        return { city, district };
    }

    console.log("No supported city found in address.");
    return { city: null, district: null };
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=zh-TW`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];
            console.log("Geocoding components:", result.address_components);
            return parseAddress(result.formatted_address, result.address_components);
        }
        return { city: null, district: null };
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        return { city: null, district: null };
    }
}
