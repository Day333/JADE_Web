import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

/** A lighthouse: amber light, two beams and a striped tower — "Your light. Your path." */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-7 w-7", className)}>
      <defs>
        <linearGradient id="lighthouse-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="60%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* light beams */}
      <path d="M12.6 8.8 1 5.2v7.2Z" fill="#22d3ee" opacity=".45" />
      <path d="M19.4 8.8 31 5.2v7.2Z" fill="#22d3ee" opacity=".45" />
      {/* roof, lamp and tower */}
      <path d="M16 2.2 20.2 6.6H11.8Z" fill="url(#lighthouse-mark)" />
      <rect x="13.1" y="6.6" width="5.8" height="4.6" rx=".8" fill="#fbbf24" />
      <path d="M13 11.2h6L21.4 28H10.6Z" fill="url(#lighthouse-mark)" />
      <path d="M12.4 16.6h7.2M11.8 21.6h8.4" stroke="white" strokeOpacity=".45" strokeWidth="1.5" />
      <rect x="8.6" y="28" width="14.8" height="2.4" rx="1.2" fill="url(#lighthouse-mark)" />
    </svg>
  );
}

export function Logo({ href = "/", className, wordmarkClassName }: { href?: string; className?: string; wordmarkClassName?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-black tracking-tight", className)} aria-label={APP_NAME}>
      <LogoMark className="shrink-0" />
      <span className={cn("whitespace-nowrap text-lg", wordmarkClassName)}>{APP_NAME}</span>
    </Link>
  );
}
