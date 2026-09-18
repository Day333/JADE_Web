import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SEEKER_STEPS = [
  { key: "role", label: "Your role" },
  { key: "resume", label: "Resume" },
  { key: "review", label: "Review profile" },
  { key: "preferences", label: "Preferences" },
  { key: "done", label: "Career Profile" },
] as const;

const RECRUITER_STEPS = [
  { key: "role", label: "Your role" },
  { key: "company", label: "Your company" },
] as const;

type SeekerKey = (typeof SEEKER_STEPS)[number]["key"];
type RecruiterKey = (typeof RECRUITER_STEPS)[number]["key"];

/** Progress indicator shown across the onboarding steps. */
export function OnboardingSteps({
  current,
  flow = "seeker",
  className,
}: {
  current: SeekerKey | RecruiterKey;
  flow?: "seeker" | "recruiter";
  className?: string;
}) {
  const steps: readonly { key: string; label: string }[] = flow === "seeker" ? SEEKER_STEPS : RECRUITER_STEPS;
  const index = Math.max(
    0,
    steps.findIndex((s) => s.key === current),
  );
  return (
    <nav aria-label="Setup progress" className={cn("mx-auto w-full max-w-3xl", className)}>
      <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground sm:hidden">
        Step {index + 1} of {steps.length} · {steps[index].label}
      </p>
      <ol className="flex items-center">
        {steps.map((step, i) => {
          const done = i < index;
          const active = i === index;
          return (
            <li key={step.key} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
              <div className="flex flex-col items-center gap-1.5">
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    done && "border-emerald-500 bg-emerald-500 text-white",
                    active && "border-emerald-500 bg-emerald-500/10 text-emerald-700 ring-4 ring-emerald-500/15 dark:text-emerald-300",
                    !done && !active && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                  <span className="sr-only">
                    {step.label}
                    {done ? " (completed)" : active ? " (current step)" : ""}
                  </span>
                </span>
                <span
                  className={cn(
                    "hidden whitespace-nowrap text-xs sm:block",
                    active ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full sm:mb-5",
                    i < index ? "bg-emerald-500" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
