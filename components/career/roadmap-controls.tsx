"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { rebuildRoadmap } from "@/lib/actions/career";

function useRebuild(onDone?: () => void) {
  const [pending, startTransition] = useTransition();
  const run = (successMessage: string) =>
    startTransition(async () => {
      const result = await rebuildRoadmap();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      onDone?.();
    });
  return { pending, run };
}

/** "Generate my roadmap" when a goal exists but no active roadmap does. */
export function GenerateRoadmapButton({ size = "lg" }: { size?: ButtonProps["size"] }) {
  const { pending, run } = useRebuild();
  return (
    <Button size={size} disabled={pending} onClick={() => run("Your Career Roadmap is ready")}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
      {pending ? "Building your roadmap…" : "Generate my roadmap"}
    </Button>
  );
}

/** Re-plan the roadmap from the current profile, keeping the goal (with confirmation). */
export function RegenerateRoadmapButton({ careerTitle }: { careerTitle: string }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useRebuild(() => setOpen(false));
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw aria-hidden /> Regenerate roadmap
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate your roadmap?</DialogTitle>
          <DialogDescription>
            We will build a fresh plan for <strong className="text-foreground">{careerTitle}</strong> from your current profile. Skills
            you have gained stay on your profile, so finished work is not planned again. Task ticks and outcomes on this roadmap will
            be replaced.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => run("Your roadmap has been regenerated")} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
            {pending ? "Regenerating…" : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
