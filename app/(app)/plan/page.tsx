import { APP_NAME } from "@/lib/config";
import Link from "next/link";
import { Compass, Map as MapIcon } from "lucide-react";
import { EmptyState } from "@/components/app/page-parts";
import { GeneratePlanPanel, RegeneratePlanButton } from "@/components/career/generate-plan";
import { DownloadPlanButton } from "@/components/career/plan-download";
import { PlanView } from "@/components/career/plan-view";
import { Button } from "@/components/ui/button";
import { CareerPlanSchema } from "@/lib/ai/career-plan";
import { computeReadiness } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { loadCareerProfile } from "@/lib/data/profile";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "AI Career Plan" };
// Generating a plan with the LLM can take one to two minutes.
export const maxDuration = 300;

export default async function PlanPage() {
  const profile = await requireProfile({ role: "seeker" });
  const [data, catalog] = await Promise.all([loadCareerProfile(profile.id), getCatalog()]);
  const career = data?.goal ? catalog.careerById.get(data.goal.career_id) : undefined;

  if (!data || !career) {
    return (
      <EmptyState
        icon={Compass}
        title="Choose a career goal to get your AI Career Plan"
        description="Your plan turns a target career into a strategy with phases, milestones and next steps. Start by exploring careers that match you."
        action={
          <Button asChild>
            <Link href="/careers">Explore careers</Link>
          </Button>
        }
        className="py-20"
      />
    );
  }

  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("career_plans")
    .select("content, source, model, created_at")
    .eq("user_id", profile.id)
    .eq("career_id", career.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const parsed = latest ? CareerPlanSchema.safeParse(latest.content) : null;

  if (!latest || !parsed?.success) {
    return <GeneratePlanPanel careerTitle={career.title} />;
  }

  const plan = parsed.data;
  const readiness = computeReadiness(data, catalog, career.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="ghost">
          <Link href="/roadmap">
            <MapIcon className="h-4 w-4" /> Roadmap
          </Link>
        </Button>
        <DownloadPlanButton isPro={profile.is_pro} careerTitle={career.title} />
        <RegeneratePlanButton />
      </div>
      <PlanView
        plan={plan}
        readiness={readiness}
        careerTitle={career.title}
        isPro={profile.is_pro}
        meta={
          <>
            Generated {timeAgo(latest.created_at)} ·{" "}
            {latest.source === "ai" ? `by ${latest.model ?? "the AI model"}` : `by ${APP_NAME} Planner (rule-based)`} · regenerate after big
            profile changes
          </>
        }
      />
    </div>
  );
}
