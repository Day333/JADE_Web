"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
import { deleteJob } from "@/lib/actions/employer";

export function DeleteJobButton({ jobId, title, applicants }: { jobId: string; title: string; applicants: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive dark:text-red-400">
          <Trash2 />
          Delete job
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{title}”?</DialogTitle>
          <DialogDescription>
            {applicants > 0
              ? `This permanently removes the listing and its ${applicants} application${applicants === 1 ? "" : "s"}. To stop new applications but keep the history, set the status to Closed instead.`
              : "This permanently removes the listing. To hide it but keep it for later, set the status to Draft or Closed instead."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteJob(jobId);
                if (result && !result.ok) toast.error(result.error);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
