"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CloudUpload, FileText, Loader2, PenLine, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { processResume, skipResume } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;

const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

const ANALYSIS_STEPS = [
  "Uploading your file securely",
  "Reading your resume",
  "Finding your skills and experience",
  "Preparing your draft Career Profile",
];

type Phase = "idle" | "working" | "empty" | "error";

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (cleaned || "resume").slice(-100);
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResumeUpload({ userId, update = false }: { userId: string; update?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [skipping, startSkip] = useTransition();
  const [, startProcess] = useTransition();
  const router = useRouter();

  // Walk through the analysis messages while the server works.
  useEffect(() => {
    if (phase !== "working") return;
    const timer = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1));
    }, 1400);
    return () => window.clearInterval(timer);
  }, [phase]);

  const fail = (message: string) => {
    setError(message);
    setPhase("error");
    toast.error(message);
  };

  const handleFile = async (picked: File | undefined) => {
    if (!picked || phase === "working") return;
    const ext = picked.name.split(".").pop()?.toLowerCase() ?? "";
    const contentType = TYPES[ext];
    setFile(picked);
    setError(null);
    if (!contentType) {
      fail(ext === "doc" ? "Old .doc files aren't supported. Please save it as .docx or PDF." : "Please upload a PDF, DOCX or TXT file.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      fail("That file is larger than 10 MB. Please upload a smaller file.");
      return;
    }
    if (picked.size === 0) {
      fail("That file is empty.");
      return;
    }

    setStepIndex(0);
    setPhase("working");
    const path = `${userId}/${crypto.randomUUID()}-${safeFileName(picked.name)}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, picked, { contentType, upsert: false });
    if (uploadError) {
      fail("Upload failed. Please check your connection and try again.");
      return;
    }
    setStepIndex(1);
    startProcess(async () => {
      const result = await processResume({ path, fileName: picked.name, mimeType: contentType, update });
      if (!result) return; // redirected to the review step
      if ("error" in result) fail(result.error);
      else setPhase("empty");
    });
  };

  const continueManually = () =>
    startSkip(async () => {
      if (update) {
        router.push("/profile");
        return;
      }
      const result = await skipResume();
      if (result?.error) toast.error(result.error);
    });

  const reset = () => {
    setPhase("idle");
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (phase === "working") {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-12" role="status" aria-live="polite">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" aria-hidden />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg">
            <Sparkles className="h-9 w-9" aria-hidden />
          </span>
        </div>
        <h2 className="text-xl font-semibold">Analysing your resume…</h2>
        <p className="mt-1 text-sm text-muted-foreground">{file?.name}</p>
        <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm">
          {ANALYSIS_STEPS.map((label, i) => (
            <li key={label} className={cn("flex items-center gap-2", i > stepIndex && "text-muted-foreground/60")}>
              {i < stepIndex ? (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
              ) : i === stepIndex ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden />
              ) : (
                <span className="h-4 w-4 rounded-full border" aria-hidden />
              )}
              {label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 sm:p-8" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="space-y-1">
            <h2 className="font-semibold">We couldn&apos;t read any text in this file</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{file?.name}</span> looks like a scanned image or a photo,
              so there&apos;s no text for us to analyse. Your file has been saved and can still be shared with
              recruiters. You can fill in your Career Profile yourself, or try a text-based PDF or DOCX export.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={reset}>
            <RefreshCw aria-hidden /> Try another file
          </Button>
          <Button onClick={continueManually} disabled={skipping}>
            {skipping ? <Loader2 className="animate-spin" aria-hidden /> : <PenLine aria-hidden />}
            {update ? "Back to my Career Profile" : "Continue and fill in manually"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-6 py-12 text-center transition-colors sm:py-16",
          dragging ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:border-emerald-500/60",
        )}
      >
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CloudUpload className="h-7 w-7" aria-hidden />
        </span>
        <p className="text-lg font-semibold">Drag &amp; drop your resume here</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX or TXT · up to 10 MB</p>
        <Button className="mt-5" size="lg" onClick={() => inputRef.current?.click()}>
          <FileText aria-hidden /> Choose a file
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-label="Upload your resume"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {phase === "error" && error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {file ? <span className="font-medium">{file.name}:</span> : null} {error}
          {file && <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">{formatSize(file.size)}</span>}
        </p>
      )}

      <div className="flex flex-col items-center gap-1 pt-2 text-center">
        <Button variant="ghost" onClick={continueManually} disabled={skipping} className="text-muted-foreground">
          {skipping ? <Loader2 className="animate-spin" aria-hidden /> : <PenLine aria-hidden />}
          {update ? "Cancel and go back to my Career Profile" : "I don't have a resume — fill in manually"}
        </Button>
      </div>
    </div>
  );
}
