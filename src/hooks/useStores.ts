import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Store } from '@/types/store';

export function useStores() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                setLoading(true);
                // we might just want all stores. Sorting might not be strictly necessary for map,
                // but good for the list.
                const q = query(collection(db, "stores"), orderBy("lastEditedAt", "desc"));
                const querySnapshot = await getDocs(q);

                const storeData: Store[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Map coordinates from nested location object or direct fields
                    // Firebase data has coordinates in 'location' object with 'latitude' and 'longitude'
                    const lat = data.location?.latitude || data.lat || data.latitude;
                    const lng = data.location?.longitude || data.lng || data.longitude;

                    storeData.push({
                        id: doc.id,
                        ...data,
                        lat,
                        lng
                    } as Store);
                });

                setStores(storeData);
            } catch (err) {
                console.error("Error fetching stores:", err);
                const error = err as Error;
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, []);

    return { stores, loading, error };
}
