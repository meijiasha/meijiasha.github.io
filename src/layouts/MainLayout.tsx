import { useStores } from '@/hooks/useStores';
import { ControlPanel } from '@/components/sidebar/ControlPanel';
import { StoreListPanel } from '@/components/sidebar/StoreListPanel';
import { MapContainer } from '@/components/map/MapContainer';
import { Button } from '@/components/ui/button';
import { Menu, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAppStore } from '@/store/useAppStore';

export default function MainLayout() {
    const { stores, loading, error } = useStores();
    const { isStoreListPanelOpen } = useAppStore();

    // Handle loading and error states if needed, for now just render
    if (loading) return <div className="flex items-center justify-center h-screen">Loading map data...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;

    return (
        <div className="flex h-screen w-full overflow-hidden relative">
            {/* Left Panel: Control Panel (Desktop) */}
            <div className="hidden md:block h-full w-80 shrink-0 z-10 shadow-xl">
                <ControlPanel stores={stores} />
            </div>

            {/* Center: Map Area */}
            <div className="flex-1 h-full relative">
                <MapContainer stores={stores} />
            </div>

            {/* Right Panel: Store List (Desktop) */}
            <div className={`hidden md:block h-full shrink-0 z-10 transition-all duration-300 py-2 pr-2 pl-2 ${isStoreListPanelOpen ? 'w-96' : 'w-20'}`}>
                <StoreListPanel stores={stores} />
            </div>

            {/* Mobile Controls (Floating Buttons) */}
            <div className="md:hidden absolute top-4 left-4 z-50 flex gap-2">
                {/* Left Sheet: Control Panel */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="secondary" size="icon" className="shadow-md">
                            <Filter className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-80">
                        <ControlPanel stores={stores} />
                    </SheetContent>
                </Sheet>
            </div>

            <div className="md:hidden absolute top-4 right-4 z-50">
                {/* Right Sheet: Store List */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="secondary" size="icon" className="shadow-md">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="p-0 w-80">
                        <StoreListPanel stores={stores} />
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
}
