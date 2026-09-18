"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, CalendarCheck, Loader2, Star, XCircle } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inviteCandidate, setApplicationStatus, setShortlisted, toggleSaveCandidate } from "@/lib/actions/employer";
import { cn } from "@/lib/utils";

/** Star toggle for the job's shortlist. */
export function ShortlistButton({
  applicationId,
  initial,
  withLabel = false,
}: {
  applicationId: string;
  initial: boolean;
  withLabel?: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size={withLabel ? "sm" : "icon"}
      variant={withLabel ? (on ? "secondary" : "outline") : "ghost"}
      aria-pressed={on}
      aria-label={on ? "Remove from shortlist" : "Add to shortlist"}
      title={on ? "Shortlisted — click to remove" : "Shortlist"}
      disabled={pending}
      className={cn(!withLabel && "h-8 w-8")}
      onClick={() =>
        startTransition(async () => {
          setOn(!on);
          const result = await setShortlisted(applicationId, !on);
          if (!result.ok) {
            setOn(on);
            toast.error(result.error);
          } else toast.success(result.message);
        })
      }
    >
      <Star className={cn(on ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
      {withLabel && (on ? "Shortlisted" : "Shortlist")}
    </Button>
  );
}

/** Save / unsave a candidate to the recruiter's talent list. */
export function SaveCandidateButton({
  candidateId,
  initialSaved,
  size = "sm",
}: {
  candidateId: string;
  initialSaved: boolean;
  size?: ButtonProps["size"];
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size={size}
      variant={saved ? "secondary" : "outline"}
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setSaved(!saved);
          const result = await toggleSaveCandidate(candidateId);
          setSaved(result.saved);
          if (result.error) toast.error(result.error);
          else toast.success(result.saved ? "Candidate saved." : "Removed from saved candidates.");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : saved ? <BookmarkCheck /> : <Bookmark />}
      {saved ? "Saved" : "Save candidate"}
    </Button>
  );
}

/** Reject with a confirmation and an optional note for the candidate's timeline. */
export function RejectButton({ applicationId, candidateName, size = "sm" }: { applicationId: string; candidateName: string; size?: ButtonProps["size"] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={size} variant="ghost" className="text-muted-foreground hover:text-destructive">
          <XCircle />
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {candidateName}?</DialogTitle>
          <DialogDescription>
            They&apos;ll be notified that their application status changed to Rejected.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`reject-note-${applicationId}`}>Note to the candidate (optional)</Label>
          <Textarea
            id={`reject-note-${applicationId}`}
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thank you for applying. We've decided to move forward with other candidates…"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setApplicationStatus(applicationId, "rejected", note);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Application rejected.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Reject application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Invite an applicant to interview: sends an invitation and moves the application to Interview. */
export function InviteInterviewButton({
  candidateId,
  jobId,
  size = "sm",
  disabled,
}: {
  candidateId: string;
  jobId: string;
  size?: ButtonProps["size"];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size={size} disabled={disabled}>
          <CalendarCheck />
          Invite to interview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to interview</DialogTitle>
          <DialogDescription>
            The candidate gets a notification and can accept or decline. Their application moves to Interview.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`interview-msg-${candidateId}`}>Message (optional)</Label>
          <Textarea
            id={`interview-msg-${candidateId}`}
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="We'd love to meet you. Are you free for a 30-minute video call next week?"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await inviteCandidate(candidateId, jobId, "interview", message);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(result.message ?? "Interview invitation sent.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
