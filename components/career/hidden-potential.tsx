import Link from "next/link";
import { ArrowRight, Check, Telescope } from "lucide-react";
import { MatchBadge } from "@/components/app/match";
import { Button } from "@/components/ui/button";
import type { HiddenPotential } from "@/lib/ai/matching";
import { cn } from "@/lib/utils";

/**
 * Hidden Career Potential: careers outside the user's main field that their
 * combination of strengths fits. Rendered as a dark "spotlight" panel in both
 * themes (the `dark` class switches the design tokens inside it).
 */
export function HiddenPotentialSection({ items, className }: { items: HiddenPotential[]; className?: string }) {
  return (
    <section
      aria-labelledby="hidden-potential-heading"
      className={cn(
        "dark relative isolate overflow-hidden rounded-2xl border border-emerald-400/25 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.28),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.16),transparent_50%),linear-gradient(135deg,#022c22,#0b1120_55%,#042f2e)] p-6 text-foreground shadow-xl shadow-emerald-950/20 sm:p-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Telescope className="h-3.5 w-3.5" aria-hidden /> Hidden Career Potential
          </span>
          <h2 id="hidden-potential-heading" className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Careers you may not have considered
          </h2>
          <p className="max-w-2xl text-sm text-slate-300">
            Unlike the recommendations above, these come from your <strong className="font-semibold text-white">combination of strengths</strong>, not
            just your degree or job titles.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300">
          We have not spotted a hidden fit yet. Add more skills, projects and your career preferences so we can look for careers outside
          your main field.{" "}
          <Link href="/profile" className="font-medium text-emerald-300 underline-offset-4 hover:underline">
            Update your Career Profile
          </Link>
        </div>
      ) : (
        <div className={cn("mt-6 grid gap-4", items.length > 1 && "md:grid-cols-2", items.length > 2 && "lg:grid-cols-3")}>
          {items.map(({ match, reasons, explanation }) => (
            <article
              key={match.career.id}
              className="flex flex-col rounded-xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-sm transition-colors hover:border-emerald-400/40 hover:bg-white/[0.08]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{match.career.field}</p>
                  <h3 className="text-lg font-semibold leading-snug text-white">{match.career.title}</h3>
                </div>
                <MatchBadge score={match.score} className="shrink-0 whitespace-nowrap" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-300">Why?</p>
              <ul className="mt-2 space-y-1.5">
                {reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-slate-100">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-l-2 border-emerald-400/50 pl-3 text-sm leading-relaxed text-slate-300">{explanation}</p>
              <div className="mt-5 pt-1 sm:mt-auto sm:pt-5">
                <Button
                  asChild
                  size="sm"
                  className="w-full bg-emerald-400 text-emerald-950 hover:bg-emerald-300 sm:w-auto"
                >
                  <Link href={`/careers/${match.career.id}`} aria-label={`Explore ${match.career.title}`}>
                    Explore Career <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
