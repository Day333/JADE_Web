"use client";

import { useSyncExternalStore } from "react";
import { timeAgo } from "@/lib/format";

const noopSubscribe = () => () => {};

/**
 * The viewer's time zone. During server rendering and hydration we use the
 * product's home time zone so markup matches, then switch to the browser's.
 */
export function useTimeZone() {
  return useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "Australia/Sydney",
  );
}

export function dayKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function clockTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-AU", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function dayLabel(iso: string, timeZone: string) {
  const key = dayKey(iso, timeZone);
  const today = dayKey(new Date().toISOString(), timeZone);
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString(), timeZone);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Intl.DateTimeFormat("en-AU", { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

/** "5m ago" — relative to now, so the server and browser may differ by a moment. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}

