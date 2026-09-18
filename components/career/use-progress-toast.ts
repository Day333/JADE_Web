"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProgressResult } from "@/lib/actions/career";

/**
 * Celebrate progress: "Career Readiness 72% → 76%", completed stages and
 * new strong job matches (the skill → roadmap → readiness → jobs chain).
 */
export function useProgressToast() {
  const router = useRouter();
  return useCallback(
    (result: ProgressResult, message: string) => {
      const { before, after } = result;
      const details = [
        message,
        result.tasksCompleted ? `${result.tasksCompleted} roadmap ${result.tasksCompleted === 1 ? "task" : "tasks"} completed.` : null,
        result.stageCompleted ? "Roadmap stage complete!" : null,
      ]
        .filter(Boolean)
        .join(" ");

      if (before && after && before.overall !== after.overall) {
        const up = after.overall > before.overall;
        (up ? toast.success : toast)(`Career Readiness ${before.overall}% → ${after.overall}%`, { description: details });
      } else {
        toast.success(details);
      }

      if (result.newMatches > 0) {
        toast(`We found ${result.newMatches} new ${result.newMatches === 1 ? "opportunity" : "opportunities"} for you`, {
          description: "Your updated skills make you a strong match for more roles.",
          action: { label: "View jobs", onClick: () => router.push("/jobs") },
          duration: 8000,
        });
      }
    },
    [router],
  );
}
