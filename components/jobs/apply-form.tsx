"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CircleAlert, ExternalLink, FileText, Send, Upload } from "lucide-react";
import { SubmitButton } from "@/components/app/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitApplication, type ApplyState } from "@/lib/actions/jobs";
import { cn } from "@/lib/utils";

export interface ResumeOption {
  id: string;
  fileName: string;
  uploaded: string;
  isPrimary: boolean;
}

function Step({ n, title, description, children }: { n: number; title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {n}
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ApplyForm({
  jobId,
  companyName,
  resumes,
  profileSummary,
  portfolioSummary,
  hasPortfolio,
  initialCoverLetter,
}: {
  jobId: string;
  companyName: string;
  resumes: ResumeOption[];
  profileSummary: React.ReactNode;
  portfolioSummary: React.ReactNode;
  hasPortfolio: boolean;
  initialCoverLetter?: string;
}) {
  const [state, formAction] = useActionState<ApplyState, FormData>(submitApplication.bind(null, jobId), {});
  const primary = resumes.find((r) => r.isPrimary) ?? resumes[0];
  const [resumeId, setResumeId] = useState(primary?.id ?? "none");
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter ?? "");

  return (
    <form action={formAction} className="space-y-5">
      <Step
        n={1}
        title="Resume"
        description={`Choose the resume ${companyName} will see.`}
      >
        {resumes.length > 0 ? (
          <div className="space-y-2" role="radiogroup" aria-label="Resume">
            {resumes.map((r) => (
              <label
                key={r.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition hover:bg-accent/50",
                  resumeId === r.id && "border-emerald-500/60 bg-emerald-500/5",
                )}
              >
                <input
                  type="radio"
                  name="resume_id"
                  value={r.id}
                  checked={resumeId === r.id}
                  onChange={() => setResumeId(r.id)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    Uploaded {r.uploaded}
                    {r.isPrimary && " · Primary"}
                  </span>
                </span>
                <a
                  href={`/resume/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </a>
              </label>
            ))}
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground transition hover:bg-accent/50",
                resumeId === "none" && "border-foreground/30",
              )}
            >
              <input
                type="radio"
                name="resume_id"
                value="none"
                checked={resumeId === "none"}
                onChange={() => setResumeId("none")}
                className="h-4 w-4 accent-emerald-600"
              />
              Apply without a resume (your Career Profile only)
            </label>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-dashed p-4">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
            <div className="text-sm">
              <p className="font-medium">You haven&apos;t uploaded a resume yet.</p>
              <p className="text-muted-foreground">
                You can still apply with your Career Profile, but most employers expect a resume.
              </p>
              <input type="hidden" name="resume_id" value="none" />
            </div>
          </div>
        )}
        <Button asChild variant="link" size="sm" className="mt-2 h-auto px-0">
          <Link href="/onboarding/resume?update=1">
            <Upload />
            Upload a newer resume
          </Link>
        </Button>
      </Step>

      <Step n={2} title="Career Profile" description="Your skills, education, experience and projects, beyond the PDF.">
        {profileSummary}
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-muted/40 p-3">
          <Checkbox id="share_profile" name="share_profile" defaultChecked className="mt-0.5" />
          <div className="space-y-0.5">
            <Label htmlFor="share_profile" className="cursor-pointer">
              Share my Career Profile
            </Label>
            <p className="text-xs text-muted-foreground">
              {companyName} will see your full profile, including skill evidence from your projects and experience.
            </p>
          </div>
        </div>
      </Step>

      <Step n={3} title="Portfolio" description="Links that show your work.">
        {portfolioSummary}
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-muted/40 p-3">
          <Checkbox id="share_portfolio" name="share_portfolio" defaultChecked={hasPortfolio} className="mt-0.5" />
          <div className="space-y-0.5">
            <Label htmlFor="share_portfolio" className="cursor-pointer">
              Share portfolio
            </Label>
            <p className="text-xs text-muted-foreground">Include your portfolio and project links with this application.</p>
          </div>
        </div>
      </Step>

      <Step n={4} title="Cover Letter" description="Optional. A few sentences on why this role, and why you.">
        <Textarea
          name="cover_letter"
          rows={7}
          maxLength={5000}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          placeholder={`Dear ${companyName} team,\n\nI'm excited to apply because…`}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">{coverLetter.length} / 5,000</p>
      </Step>

      {state.error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive dark:text-red-300">
          <CircleAlert className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Nothing is sent until you press Submit Application.</p>
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href={`/jobs/${jobId}`}>Cancel</Link>
          </Button>
          <SubmitButton size="lg" pendingText="Submitting…">
            <Send />
            Submit Application
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
