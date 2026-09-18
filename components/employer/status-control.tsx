"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { setApplicationStatus } from "@/lib/actions/employer";
import { APPLICATION_STATUS_LABELS } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/types";

const OPTIONS: ApplicationStatus[] = ["screening", "interview", "offer", "rejected"];

/** Move an application to Screening / Interview / Offer / Rejected with an optional note. */
export function StatusControl({ applicationId, current }: { applicationId: string; current: ApplicationStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus | "">(OPTIONS.includes(current) ? current : "");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const locked = current === "withdrawn";

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!status || status === current) return;
        startTransition(async () => {
          const result = await setApplicationStatus(applicationId, status, note);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(result.message ?? "Status updated.");
          setNote("");
          router.refresh();
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`status-${applicationId}`}>Move application to</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)} disabled={locked || pending}>
          <SelectTrigger id={`status-${applicationId}`}>
            <SelectValue placeholder="Choose a stage" />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {APPLICATION_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`status-note-${applicationId}`}>Note for the candidate (optional)</Label>
        <Textarea
          id={`status-note-${applicationId}`}
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={locked || pending}
          placeholder="Shown on the candidate's application timeline"
        />
      </div>
      <Button type="submit" className="w-full" disabled={locked || pending || !status || status === current}>
        {pending && <Loader2 className="animate-spin" />}
        {locked ? "The candidate withdrew" : "Update status"}
      </Button>
    </form>
  );
}
