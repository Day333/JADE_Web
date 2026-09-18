"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { respondToInvitation } from "@/lib/actions/jobs";

/** Accept / Decline buttons for a recruiter's invitation. */
export function InvitationActions({ invitationId, kind }: { invitationId: string; kind: "apply" | "interview" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState<"accept" | "decline" | null>(null);

  const respond = (accept: boolean) => {
    setChoice(accept ? "accept" : "decline");
    startTransition(async () => {
      const result = await respondToInvitation(invitationId, accept);
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      if (accept && result.kind === "apply") {
        toast.success("Invitation accepted. Review your application and submit it when you're ready.");
        router.push(`/jobs/${result.jobId}/apply`);
        return;
      }
      toast.success(
        accept
          ? "Interview invitation accepted. The recruiter has been notified. Message them to arrange a time."
          : "Invitation declined. The recruiter has been notified.",
      );
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => respond(true)} disabled={pending}>
        {pending && choice === "accept" ? <Loader2 className="animate-spin" /> : <Check />}
        {kind === "apply" ? "Accept & apply" : "Accept"}
      </Button>
      <Button size="sm" variant="outline" onClick={() => respond(false)} disabled={pending}>
        {pending && choice === "decline" ? <Loader2 className="animate-spin" /> : <X />}
        Decline
      </Button>
    </div>
  );
}
