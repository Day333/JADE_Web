"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { withdrawApplication } from "@/lib/actions/jobs";

export function WithdrawButton({ applicationId, jobTitle, companyName }: { applicationId: string; jobTitle: string; companyName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive dark:text-red-400">
          <Undo2 />
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw your application?</DialogTitle>
          <DialogDescription>
            {companyName} will no longer consider you for {jobTitle}. You can apply again later while the job is open.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="withdraw-note">Reason (optional, shown on your timeline)</Label>
          <Textarea
            id="withdraw-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. I accepted another offer"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Keep application
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await withdrawApplication(applicationId, note);
                if (!result.ok) {
                  toast.error(result.error ?? "Could not withdraw the application.");
                  return;
                }
                toast.success("Application withdrawn.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Withdraw application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
