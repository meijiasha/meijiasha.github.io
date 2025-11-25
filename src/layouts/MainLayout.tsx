import { useStores } from '@/hooks/useStores';
import { ControlPanel } from '@/components/sidebar/ControlPanel';
import { StoreListPanel } from '@/components/sidebar/StoreListPanel';
import { MapContainer } from '@/components/map/MapContainer';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAppStore } from '@/store/useAppStore';
import { Navbar } from '@/components/Navbar';

import { LoadingScreen } from '@/components/LoadingScreen';

export default function MainLayout() {
    const { stores, loading, error } = useStores();
    const { isStoreListPanelOpen } = useAppStore();

    // Handle error state
    if (error) return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
            <LoadingScreen isLoading={loading} />
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
                                <div className="relative"> {/* Wrapper for TooltipTrigger if needed, but Button is fine */}
                                    <TooltipProvider>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <Button variant="secondary" size="icon" className="shadow-md w-12 h-12 rounded-full p-2 bg-white/90 backdrop-blur-sm hover:bg-white border-2 border-primary/20">
                                                    <img src="/bowl.svg" alt="開啟篩選" className="w-full h-full object-contain" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <p>請按此</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
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

                    {/* Desktop Store List Panel (Absolute Overlay) */}
                    <div className={`hidden md:block absolute top-0 right-0 bottom-0 z-10 transition-all duration-300 py-2 pr-2 pl-2 ${isStoreListPanelOpen ? 'w-96' : 'w-20'}`}>
                        <StoreListPanel stores={stores} />
                    </div>
                </div>

                {/* Right Panel: Store List (Desktop) - REMOVED from flex flow */}
            </div>
        </div>
    );
}
