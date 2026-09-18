import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ForYouLabel, MeterRow, ReadinessRing } from "@/components/app/match";
import type { Readiness } from "@/lib/ai/matching";
import { cn } from "@/lib/utils";

/**
 * Career Readiness summary: a ring with the overall score and the Skills /
 * Projects / Experience / Portfolio breakdown. Server-friendly (no hooks).
 */
export function ReadinessCard({
  careerTitle,
  readiness,
  href,
  linkLabel = "View your roadmap",
  size = "default",
  className,
  children,
}: {
  careerTitle: string;
  readiness: Readiness;
  /** Optional link shown at the bottom, e.g. "/roadmap". */
  href?: string;
  linkLabel?: string;
  size?: "default" | "lg";
  className?: string;
  children?: React.ReactNode;
}) {
  const large = size === "lg";
  return (
    <section
      aria-label={`Career Readiness for ${careerTitle}`}
      className={cn("flex flex-col justify-center rounded-xl border bg-card p-5 sm:p-6", className)}
    >
      <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-center", large && "sm:gap-8")}>
        <ReadinessRing
          value={readiness.overall}
          size={large ? 152 : 116}
          stroke={large ? 12 : 10}
          className="shrink-0 self-center sm:self-auto"
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1">
            <ForYouLabel>Career Readiness</ForYouLabel>
            <p className={cn("font-semibold leading-tight", large ? "text-xl sm:text-2xl" : "text-lg")}>
              {readiness.overall}% ready for {careerTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              {readiness.overall >= 80
                ? `You are getting closer to ${careerTitle}. You are ready to start applying.`
                : `You are getting closer to ${careerTitle}.`}
            </p>
          </div>
          <div className={cn("grid gap-3", large ? "sm:grid-cols-2 sm:gap-x-8" : "sm:grid-cols-2 sm:gap-x-6")}>
            <MeterRow label="Skills" value={readiness.skills} />
            <MeterRow label="Projects" value={readiness.projects} />
            <MeterRow label="Experience" value={readiness.experience} />
            <MeterRow label="Portfolio" value={readiness.portfolio} />
          </div>
        </div>
      </div>
      {children}
      {href && (
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-1 self-start text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {linkLabel} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </section>
  );
}
