import { Marker } from '@vis.gl/react-google-maps';
import type { Store } from '@/types/store';

interface StoreMarkerProps {
    store: Store;
    onClick: (store: Store) => void;
}

export const StoreMarker = ({ store, onClick }: StoreMarkerProps) => {
    return (
        <Marker
            position={{ lat: store.lat, lng: store.lng }}
            onClick={() => onClick(store)}
            title={store.name}
        />
    );
};
