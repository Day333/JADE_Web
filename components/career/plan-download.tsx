"use client";

import { APP_NAME } from "@/lib/config";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, FileDown, Loader2 } from "lucide-react";
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
import { upgradeToPro } from "@/lib/actions/pro";

const PRO_PERKS = [
  "Download your full AI Career Plan as a polished PDF",
  "Keep, print or share it with a mentor",
  "Every regenerated plan can be downloaded again",
];

async function fetchPdf(careerTitle: string): Promise<"ok" | "pro_required" | "error"> {
  const res = await fetch("/plan/pdf");
  if (res.status === 403) return "pro_required";
  if (!res.ok) return "error";
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${APP_NAME.replace(/\s+/g, "-")}-Plan-${careerTitle.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "ok";
}

/**
 * Downloads the full plan as a PDF. For non-Pro users it opens the Pro
 * dialog instead; upgrading is free during the beta, and the download
 * starts right after the upgrade.
 */
export function DownloadPlanButton({
  isPro,
  careerTitle,
  variant = "outline",
  size,
  className,
  children,
}: {
  isPro: boolean;
  careerTitle: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [upgrading, startUpgrade] = useTransition();

  const download = async () => {
    setDownloading(true);
    try {
      const result = await fetchPdf(careerTitle);
      if (result === "pro_required") setDialogOpen(true);
      else if (result === "error") toast.error("Could not build the PDF. Please try again.");
      else toast.success("Your Career Plan PDF is downloading");
    } catch {
      toast.error("Could not build the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const upgrade = () =>
    startUpgrade(async () => {
      const result = await upgradeToPro();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Welcome to ${APP_NAME} Pro!`);
      setDialogOpen(false);
      router.refresh();
      await download();
    });

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={downloading}
        onClick={() => (isPro ? download() : setDialogOpen(true))}
      >
        {downloading ? <Loader2 className="animate-spin" aria-hidden /> : <FileDown aria-hidden />}
        {children ?? (downloading ? "Preparing your PDF…" : "Download PDF")}
        {!isPro && (
          <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
            <Crown className="h-3 w-3" aria-hidden /> Pro
          </span>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(o) => !upgrading && setDialogOpen(o)}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-xl sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-1 inline-flex rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-3 text-amber-950 shadow-lg shadow-amber-500/20">
              <Crown className="h-6 w-6" aria-hidden />
            </div>
            <DialogTitle className="text-center">Download your plan with {APP_NAME} Pro</DialogTitle>
            <DialogDescription className="text-center">
              The web page shows your plan at a glance; the PDF is the complete version with every action, milestone and
              recommendation.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 py-1">
            {PRO_PERKS.map((perk) => (
              <li key={perk} className="flex gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {perk}
              </li>
            ))}
          </ul>
          <p className="rounded-lg bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {APP_NAME} Pro is free during the beta.
          </p>
          <DialogFooter className="sm:justify-center">
            <Button onClick={upgrade} disabled={upgrading} size="lg" className="w-full sm:w-auto">
              {upgrading ? <Loader2 className="animate-spin" aria-hidden /> : <Crown aria-hidden />}
              {upgrading ? "Upgrading…" : "Upgrade to Pro — free"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
