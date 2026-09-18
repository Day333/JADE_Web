import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-7 w-7", className)}>
      <defs>
        <linearGradient id="jade-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="55%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <path d="M16 2 29 10v12L16 30 3 22V10Z" fill="url(#jade-mark)" />
      <path d="M16 2v28M3 10l13 8 13-8" fill="none" stroke="white" strokeOpacity=".45" strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-black tracking-tight", className)}>
      <LogoMark />
      <span className="text-lg">{APP_NAME}</span>
    </Link>
  );
}
