"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toggleSaveJob } from "@/lib/actions/jobs";
import { cn } from "@/lib/utils";

export function SaveJobButton({
  jobId,
  initialSaved,
  compact = false,
  size = "sm",
  className,
}: {
  jobId: string;
  initialSaved: boolean;
  /** Icon-only button (for job cards). */
  compact?: boolean;
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const label = saved ? "Saved" : "Save Job";

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size={compact ? "icon" : size}
      aria-pressed={saved}
      aria-label={compact ? (saved ? "Remove from saved jobs" : "Save job") : undefined}
      title={compact ? (saved ? "Saved — click to remove" : "Save job") : undefined}
      disabled={pending}
      className={cn(compact && "h-8 w-8", saved && "text-emerald-700 dark:text-emerald-300", className)}
      onClick={() =>
        startTransition(async () => {
          const previous = saved;
          setSaved(!previous);
          const result = await toggleSaveJob(jobId);
          setSaved(result.saved);
          if (result.error) toast.error(result.error);
          else toast.success(result.saved ? "Saved to your Application Tracker." : "Removed from saved jobs.");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : saved ? <BookmarkCheck /> : <Bookmark />}
      {!compact && label}
    </Button>
  );
}
