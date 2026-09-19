import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Show/Hide label and chevron for a `group/fold` <details>. */
export function FoldToggle({ className }: { className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground", className)}>
      <span className="group-open/fold:hidden">Show</span>
      <span className="hidden group-open/fold:inline">Hide</span>
      <ChevronDown className="h-4 w-4 transition-transform group-open/fold:rotate-180" aria-hidden />
    </span>
  );
}

/** A section that folds away behind its header (a native <details>, so it works without JavaScript). */
export function Fold({
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={cn("group/fold rounded-xl border bg-card", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-4 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">{summary}</div>
        <FoldToggle />
      </summary>
      <div className="border-t p-4 sm:p-5">{children}</div>
    </details>
  );
}
