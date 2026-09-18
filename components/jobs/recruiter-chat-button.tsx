import { MessageSquare } from "lucide-react";
import { MessageButton } from "@/components/app/social-buttons";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SAMPLE_NOTE = "Sample listing — no recruiter to chat with";

/** "Chat with Recruiter" — disabled with an explanation for sample listings without a recruiter. */
export function RecruiterChatButton({
  recruiterId,
  jobId,
  size = "default",
  className,
}: {
  recruiterId: string | null;
  jobId: string;
  size?: ButtonProps["size"];
  className?: string;
}) {
  if (recruiterId) {
    return (
      <span className={className}>
        <MessageButton userId={recruiterId} jobId={jobId} label="Chat with Recruiter" size={size} variant="outline" />
      </span>
    );
  }
  // A CSS tooltip: disabled buttons don't receive pointer events, so the wrapper carries hover/focus.
  return (
    <span tabIndex={0} aria-label={SAMPLE_NOTE} className={cn("group relative inline-flex rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring", className)}>
      <Button variant="outline" size={size} disabled aria-hidden tabIndex={-1}>
        <MessageSquare />
        Chat with Recruiter
      </Button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {SAMPLE_NOTE}
      </span>
    </span>
  );
}
