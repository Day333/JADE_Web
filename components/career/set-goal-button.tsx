"use client";

import { useState, useTransition } from "react";
import { Loader2, Target } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setCareerGoal } from "@/lib/actions/career";

/**
 * "Set as Career Goal". Creates the roadmap and continues to the Skill Gap.
 * When another goal is already set, asks for confirmation first.
 */
export function SetGoalButton({
  careerId,
  careerTitle,
  currentGoalTitle,
  size = "lg",
  className,
}: {
  careerId: string;
  careerTitle: string;
  currentGoalTitle?: string | null;
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = () =>
    startTransition(async () => {
      const result = await setCareerGoal(careerId);
      // On success the action redirects to /skill-gap and never returns.
      if (result && !result.ok) {
        setConfirmOpen(false);
        toast.error(result.error);
      }
    });

  const label = pending ? "Building your roadmap…" : "Set as Career Goal";

  return (
    <>
      <Button
        size={size}
        className={className}
        disabled={pending}
        onClick={() => (currentGoalTitle ? setConfirmOpen(true) : run())}
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Target aria-hidden />}
        {label}
      </Button>
      {currentGoalTitle && (
        <Dialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
          <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change your career goal?</DialogTitle>
              <DialogDescription>
                Your goal will change from <strong className="text-foreground">{currentGoalTitle}</strong> to{" "}
                <strong className="text-foreground">{careerTitle}</strong>. We will analyse your new skill gap and build a new Career
                Roadmap. Skills you have gained stay on your profile.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
                Keep {currentGoalTitle}
              </Button>
              <Button onClick={run} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Target aria-hidden />}
                {pending ? "Building your roadmap…" : `Switch to ${careerTitle}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
