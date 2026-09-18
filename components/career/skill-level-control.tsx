"use client";

import { useOptimistic, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useProgressToast } from "@/components/career/use-progress-toast";
import { updateSkillLevel } from "@/lib/actions/career";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { level: 1, label: "Basic" },
  { level: 2, label: "Proficient" },
  { level: 3, label: "Advanced" },
] as const;

/** "Update my level": Basic / Proficient / Advanced / Remove for one skill. */
export function SkillLevelControl({
  skillId,
  skillName,
  level,
  className,
  compact = false,
}: {
  skillId: string;
  skillName: string;
  level: number;
  className?: string;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(level);
  const showProgress = useProgressToast();

  const choose = (next: number) => {
    if (next === current || pending) return;
    startTransition(async () => {
      setCurrent(next);
      const result = await updateSkillLevel(skillId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      showProgress(
        result,
        next === 0 ? `${skillName} removed from your profile.` : `${skillName} set to ${OPTIONS[next - 1].label}.`,
      );
    });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div role="radiogroup" aria-label={`Your level in ${skillName}`} className="inline-flex rounded-lg border bg-muted/40 p-0.5">
        {OPTIONS.map((option) => {
          const active = current === option.level;
          return (
            <button
              key={option.level}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => choose(option.level)}
              className={cn(
                "rounded-md font-medium transition-colors disabled:cursor-wait",
                compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm",
                active
                  ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {current > 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={() => choose(0)}
          className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-wait"
        >
          Remove
        </button>
      )}
      {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" />}
    </div>
  );
}
