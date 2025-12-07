
import ThemeSwitch from "@/components/ui/ThemeSwitch";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose, Crosshair } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export const Navbar = () => {
    const {
        isStoreListPanelOpen,
        setStoreListPanelOpen,
        userLocation,
        triggerLocateUser
    } = useAppStore();

    // Added handleLocateMe function
    const handleLocateMe = () => {
        if (userLocation) {
            triggerLocateUser();
        } else {
            // Optional: Show a toast or alert if location is not available
            console.warn("User location not available");
        }
    };

    return (
        <div className="h-16 border-b bg-white dark:bg-gray-950 px-4 flex items-center justify-between shrink-0 z-20 relative shadow-sm">
            <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="咩呷啥 Logo" className="h-10 w-auto" />
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-primary leading-none">咩呷啥</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-1">今天吃什麼？</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="[&_svg]:grayscale [&:hover_svg]:grayscale-0 transition-colors"
                >
                    <a
                        href="https://instagram.com/mei.jia.sha"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="追蹤我們的 Instagram"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="w-5 h-5 transition-all duration-300"
                        >
                            <defs>
                                <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f09433" />
                                    <stop offset="25%" stopColor="#e6683c" />
                                    <stop offset="50%" stopColor="#dc2743" />
                                    <stop offset="75%" stopColor="#cc2366" />
                                    <stop offset="100%" stopColor="#bc1888" />
                                </linearGradient>
                            </defs>
                            <path
                                fill="url(#instagram-gradient)"
                                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                            />
                        </svg>
                    </a>
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStoreListPanelOpen(!isStoreListPanelOpen)}
                    title={isStoreListPanelOpen ? "關閉店家列表" : "開啟店家列表"}
                    className="flex" // Show on both mobile and desktop
                >
                    {isStoreListPanelOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLocateMe}
                    title="顯示我的位置"
                    className="text-muted-foreground hover:text-primary"
                >
                    <Crosshair className="w-5 h-5" />
                </Button>
                <ThemeSwitch />
            </div>
        </div>
    );
};
