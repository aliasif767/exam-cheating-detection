import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to combine and merge Tailwind CSS class names safely.
 * Commonly used in shadcn/ui components.
 */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
