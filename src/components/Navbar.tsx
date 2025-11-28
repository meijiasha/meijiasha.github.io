import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export const Navbar = () => {
    const { isStoreListPanelOpen, setStoreListPanelOpen } = useAppStore();

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
                    variant="outline"
                    size="icon"
                    onClick={() => setStoreListPanelOpen(!isStoreListPanelOpen)}
                    title={isStoreListPanelOpen ? "關閉店家列表" : "開啟店家列表"}
                    className="flex" // Show on both mobile and desktop
                >
                    {isStoreListPanelOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
                </Button>
                <ModeToggle />
            </div>
        </div>
    );
};
