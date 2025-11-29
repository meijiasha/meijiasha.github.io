import type { OpeningHoursPeriod } from "@/types/store";

export const getStoreStatus = (periods?: OpeningHoursPeriod[]): { isOpen: boolean; nextTime?: string } => {
    if (!periods || periods.length === 0) {
        return { isOpen: false }; // No data, assume closed or unknown (UI can handle this)
    }

    const now = new Date();
    const day = now.getDay(); // 0 (Sun) - 6 (Sat)
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}${minutes}`;

    // Find period for today
    // Note: A store might have multiple periods in a day (e.g. lunch and dinner)
    // Or a period might span across midnight (e.g. open 1800 close 0200 next day)

    // Check if currently open
    for (const period of periods) {
        const openDay = period.open.day;
        const openTime = period.open.time;
        const closeDay = period.close?.day;
        const closeTime = period.close?.time;

        if (closeDay === undefined || closeTime === undefined) {
            // 24 hours open? Google Maps represents 24/7 as open day 0 time 0000 and no close
            if (openDay === 0 && openTime === "0000") return { isOpen: true };
            continue;
        }

        if (openDay === day) {
            // Opens today
            if (openDay === closeDay) {
                // Closes today
                if (currentTime >= openTime && currentTime < closeTime) {
                    return { isOpen: true, nextTime: formatTime(closeTime) };
                }
            } else {
                // Closes tomorrow (spans midnight)
                if (currentTime >= openTime) {
                    return { isOpen: true, nextTime: formatTime(closeTime) };
                }
            }
        } else if (closeDay === day) {
            // Opened yesterday, closes today (spans midnight)
            if (currentTime < closeTime) {
                return { isOpen: true, nextTime: formatTime(closeTime) };
            }
        }
    }

    return { isOpen: false };
};


const formatTime = (time: string): string => {
    const h = time.slice(0, 2);
    const m = time.slice(2);
    return `${h}:${m}`;
};

export const formatOpeningHours = (periods?: OpeningHoursPeriod[]): string[] => {
    if (!periods || periods.length === 0) return ["無營業時間資料"];

    const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    const result: string[] = [];

    // Group periods by day
    const periodsByDay = new Map<number, OpeningHoursPeriod[]>();
    periods.forEach(p => {
        const day = p.open.day;
        if (!periodsByDay.has(day)) {
            periodsByDay.set(day, []);
        }
        periodsByDay.get(day)?.push(p);
    });

    // Sort days starting from Monday (1) to Sunday (0)
    const sortedDays = [1, 2, 3, 4, 5, 6, 0];

    sortedDays.forEach(day => {
        const dayPeriods = periodsByDay.get(day);
        if (dayPeriods) {
            const timeStr = dayPeriods.map(p => {
                if (p.open.day === 0 && p.open.time === "0000" && !p.close) {
                    return "24 小時營業";
                }
                const open = formatTime(p.open.time);
                const close = p.close ? formatTime(p.close.time) : "???";
                return `${open} - ${close}`;
            }).join(", ");
            result.push(`${days[day]}: ${timeStr}`);
        } else {
            result.push(`${days[day]}: 休息`);
        }
    });

    return result;
};
