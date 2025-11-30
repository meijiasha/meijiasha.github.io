import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SponsorWidget = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has closed the sponsor widget in this session
        const hasClosed = sessionStorage.getItem('hasClosedSponsorWidget');
        if (!hasClosed) {
            // Delay showing it slightly for better UX
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        sessionStorage.setItem('hasClosedSponsorWidget', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[40] animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="relative group">
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10 transition-opacity bg-white hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-800 dark:text-white"
                    onClick={handleClose}
                >
                    <X className="h-3 w-3" />
                    <span className="sr-only">關閉贊助</span>
                </Button>
                <div className="overflow-hidden rounded-lg shadow-lg border-2 border-white/20 bg-white/10 backdrop-blur-sm">
                    <a href="https://www.god-dice.com/" target="_blank" rel="noopener noreferrer" className="block">
                        <img
                            src="/banner-sponsor.jpg"
                            alt="Sponsor"
                            className="max-w-[150px] h-auto md:max-w-[250px] object-cover hover:scale-105 transition-transform duration-300"
                        />
                    </a>
                    <div className="bg-white/60 text-black text-[10px] py-1 px-2 text-center backdrop-blur-md">
                        感謝 <a href="https://www.god-dice.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">上帝骰</a> 贊助
                    </div>
                </div>
            </div>
        </div>
    );
};
