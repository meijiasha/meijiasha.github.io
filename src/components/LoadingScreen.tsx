import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface LoadingScreenProps {
    isLoading: boolean;
}

export const LoadingScreen = ({ isLoading }: LoadingScreenProps) => {
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (isLoading) {
            // Reset progress when loading starts
            setProgress(0);
            setIsVisible(true);

            // Simulate progress up to 90%
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    // Slow down as it gets higher
                    const increment = Math.max(1, (90 - prev) / 10);
                    return prev + increment;
                });
            }, 100);

            return () => clearInterval(interval);
        } else {
            // When loading finishes, go to 100% then hide
            setProgress(100);
            const timeout = setTimeout(() => {
                setIsVisible(false);
            }, 500); // Wait for animation to finish
            return () => clearTimeout(timeout);
        }
    }, [isLoading]);

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${!isLoading && progress === 100 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

            {/* Bowl Fill Effect */}
            <div
                className="absolute bottom-0 left-0 w-full transition-all duration-300 ease-out opacity-20 pointer-events-none"
                style={{
                    height: `${progress}%`,
                    backgroundImage: "url('/bowl.svg')",
                    backgroundRepeat: "repeat",
                    backgroundSize: "60px 60px", // Adjust size as needed
                    backgroundPosition: "bottom center"
                }}
            />

            <div className="flex flex-col items-center space-y-8 w-full max-w-md px-8 z-10 relative">
                <img src="/logo.svg" alt="咩呷啥 Logo" className="h-24 w-auto animate-bounce rounded-full" />
                <div className="space-y-2 text-center w-full">
                    <h1 className="text-2xl font-bold text-primary">咩呷啥</h1>
                    <p className="text-gray-500">正在準備美食地圖...</p>
                </div>
                <Progress value={progress} className="w-full h-2" />
                <p className="text-xs text-gray-400">{Math.round(progress)}%</p>
            </div>
        </div>
    );
};
