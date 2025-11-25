import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { Store } from '@/types/store';
import { useAppStore } from '@/store/useAppStore';

interface StoreMarkerProps {
    store: Store;
    onClick: (store: Store) => void;
}

export const StoreMarker = ({ store, onClick }: StoreMarkerProps) => {
    const { selectedStore } = useAppStore();
    const isSelected = selectedStore?.id === store.id;

    return (
        <AdvancedMarker
            position={{ lat: store.lat, lng: store.lng }}
            onClick={() => onClick(store)}
            title={store.name}
            zIndex={isSelected ? 100 : 1} // Bring selected marker to front
        >
            <Pin
                background={isSelected ? '#ef962e' : '#EA4335'} // Orange if selected, Red (default) otherwise
                glyphColor={'#FFF'}
                borderColor={'#FFF'}
                scale={isSelected ? 1.2 : 1.0} // Slightly larger if selected
            />
        </AdvancedMarker>
    );
};
