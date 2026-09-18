"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { inviteCandidate } from "@/lib/actions/employer";

/** One invitation button ("Invite to apply" or "Invite to interview"). */
export function InviteButton({
  candidateId,
  jobId,
  kind,
  label,
  size = "sm",
  variant = "outline",
  initiallyInvited = false,
  disabled,
  className,
}: {
  candidateId: string;
  jobId: string;
  kind: "apply" | "interview";
  label?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  initiallyInvited?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [invited, setInvited] = useState(initiallyInvited);
  const [pending, startTransition] = useTransition();
  const Icon = kind === "apply" ? Send : CalendarCheck;
  const text = label ?? (kind === "apply" ? "Invite to apply" : "Invite to interview");

  return (
    <Button
      type="button"
      size={size}
      variant={invited ? "secondary" : variant}
      className={className}
      disabled={pending || invited || disabled}
      onClick={() =>
        startTransition(async () => {
          const result = await inviteCandidate(candidateId, jobId, kind);
          if (result.ok) {
            setInvited(true);
            toast.success(result.message ?? "Invitation sent.");
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : invited ? <Check /> : <Icon />}
      {invited ? (kind === "apply" ? "Invited to apply" : "Interview invited") : text}
    </Button>
  );
}

/**
 * "Invite to apply" and "Invite to interview" for one candidate and one job.
 * Used in recruiter chats and candidate views.
 */
export function InviteActions({ candidateId, jobId }: { candidateId: string; jobId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <InviteButton candidateId={candidateId} jobId={jobId} kind="apply" />
      <InviteButton candidateId={candidateId} jobId={jobId} kind="interview" />
    </div>
  );
}
