"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Compass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { chooseSeekerRole } from "@/lib/actions/onboarding";

const card =
  "group relative flex h-full flex-col rounded-2xl border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-70 sm:p-8";

export function RoleChoice() {
  const [pending, startTransition] = useTransition();

  const chooseSeeker = () =>
    startTransition(async () => {
      const result = await chooseSeekerRole();
      if (result?.error) toast.error(result.error);
    });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button type="button" onClick={chooseSeeker} disabled={pending} className={card}>
        <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm">
          {pending ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <Compass className="h-6 w-6" aria-hidden />}
        </span>
        <span className="text-lg font-semibold">I&apos;m exploring careers &amp; opportunities</span>
        <span className="mt-2 text-sm text-muted-foreground">
          Students, graduates and early-career people. Discover careers that fit you, see your skill gaps, plan your
          growth and find jobs.
        </span>
        <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Build my Career Profile
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </button>

      <Link href="/onboarding/company" className={card} aria-disabled={pending}>
        <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white shadow-sm">
          <Building2 className="h-6 w-6" aria-hidden />
        </span>
        <span className="text-lg font-semibold">I&apos;m hiring</span>
        <span className="mt-2 text-sm text-muted-foreground">
          Recruiters and hiring managers. Post jobs, see how well candidates match, and reach people who are open to
          opportunities.
        </span>
        <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-sky-700 dark:text-sky-400">
          Set up my company
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
