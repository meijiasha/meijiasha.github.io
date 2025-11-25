import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCategoryColor(category: string) {
  const colors = [
    "bg-red-100 text-red-800 hover:bg-red-200",
    "bg-orange-100 text-orange-800 hover:bg-orange-200",
    "bg-amber-100 text-amber-800 hover:bg-amber-200",
    "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    "bg-lime-100 text-lime-800 hover:bg-lime-200",
    "bg-green-100 text-green-800 hover:bg-green-200",
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
    "bg-teal-100 text-teal-800 hover:bg-teal-200",
    "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
    "bg-sky-100 text-sky-800 hover:bg-sky-200",
    "bg-blue-100 text-blue-800 hover:bg-blue-200",
    "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
    "bg-violet-100 text-violet-800 hover:bg-violet-200",
    "bg-purple-100 text-purple-800 hover:bg-purple-200",
    "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200",
    "bg-pink-100 text-pink-800 hover:bg-pink-200",
    "bg-rose-100 text-rose-800 hover:bg-rose-200",
  ];

  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
