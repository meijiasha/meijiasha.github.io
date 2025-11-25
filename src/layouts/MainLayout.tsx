import { useStores } from '@/hooks/useStores';
import { ControlPanel } from '@/components/sidebar/ControlPanel';
import { StoreListPanel } from '@/components/sidebar/StoreListPanel';
import { MapContainer } from '@/components/map/MapContainer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useAppStore } from '@/store/useAppStore';
import { Navbar } from '@/components/Navbar';

import { LoadingScreen } from '@/components/LoadingScreen';
import { SponsorWidget } from '@/components/SponsorWidget';

import { useState, useEffect } from 'react';

export default function MainLayout() {
    const { stores, loading, error } = useStores();
    const { isStoreListPanelOpen, setStoreListPanelOpen } = useAppStore();
    const [showMobileTooltip, setShowMobileTooltip] = useState(false);

    useEffect(() => {
        const hasClicked = localStorage.getItem('hasClickedMobileSidebar');
        if (!hasClicked) {
            setShowMobileTooltip(true);
        }

        // Close store list panel on mobile by default
        if (window.innerWidth < 768) {
            setStoreListPanelOpen(false);
        }
    }, [setStoreListPanelOpen]);

    const handleMobileSidebarClick = () => {
        setShowMobileTooltip(false);
        localStorage.setItem('hasClickedMobileSidebar', 'true');
    };

    // Handle error state
    if (error) return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
            <LoadingScreen isLoading={loading} />
            <SponsorWidget />
            <Navbar />

            <div className="flex flex-1 w-full overflow-hidden relative">
                {/* Left Panel: Control Panel (Desktop) */}
                <div className="hidden md:block h-full w-80 shrink-0 z-10 shadow-xl border-r">
                    <ControlPanel stores={stores} />
                </div>

                {/* Center: Map Area */}
                <div className="flex-1 h-full relative">
                    <MapContainer stores={stores} />



                    {/* Mobile Controls (Floating Buttons) - Positioned relative to map area */}
                    <div className="md:hidden absolute top-4 left-4 z-50 flex gap-2">
                        {/* Left Sheet: Control Panel */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <div className="relative group" onClick={handleMobileSidebarClick}>
                                    <Button variant="secondary" size="icon" className="shadow-md w-12 h-12 rounded-full p-2 bg-white/90 backdrop-blur-sm hover:bg-white border-2 border-primary/20">
                                        <img src="/bowl.svg" alt="開啟篩選" className="w-full h-full object-contain" />
                                    </Button>
                                    {showMobileTooltip && (
                                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-left-2 duration-500 shadow-md">
                                            請按此開啟側邊選單欄
                                            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-4 border-transparent border-r-primary"></div>
                                        </div>
                                    )}
                                </div>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-80">
                                <ControlPanel stores={stores} />
                                <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary bg-white/50 p-1">
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Close</span>
                                </SheetClose>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div className="md:hidden">
                        {/* Right Sheet: Store List - Controlled by Navbar toggle via store */}
                        <Sheet open={isStoreListPanelOpen} onOpenChange={setStoreListPanelOpen}>
                            <SheetContent side="right" className="p-0 w-80">
                                <StoreListPanel stores={stores} />
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Desktop Store List Panel (Absolute Overlay) */}
                    <div className={`hidden md:block absolute top-0 right-0 bottom-0 z-10 transition-all duration-300 py-2 pr-2 pl-2 ${isStoreListPanelOpen ? 'w-96 translate-x-0 opacity-100' : 'w-0 translate-x-full opacity-0 pointer-events-none'}`}>
                        <StoreListPanel stores={stores} />
                    </div>
                </div>

                {/* Right Panel: Store List (Desktop) - REMOVED from flex flow */}
            </div>
        </div>
    );
}
