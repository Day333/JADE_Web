import { NextResponse } from "next/server";
import { CareerPlanSchema } from "@/lib/ai/career-plan";
import { computeReadiness, matchCareer, matchJob } from "@/lib/ai/matching";
import { getMyProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { loadOpenJobs } from "@/lib/data/jobs";
import { loadCareerProfile } from "@/lib/data/profile";
import { buildCareerPlanPdf } from "@/lib/pdf/career-plan-pdf";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /plan/pdf — the signed-in user's full AI Career Plan as a PDF.
 * Downloading is a JADE Pro feature; the page offers an upgrade when this
 * returns 403 with { error: "pro_required" }.
 */
export async function GET() {
  const profile = await getMyProfile();
  if (!profile || profile.role !== "seeker") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!profile.is_pro) {
    return NextResponse.json({ error: "pro_required" }, { status: 403 });
  }

  const [data, catalog] = await Promise.all([loadCareerProfile(profile.id), getCatalog()]);
  const career = data?.goal ? catalog.careerById.get(data.goal.career_id) : undefined;
  if (!data || !career) return NextResponse.json({ error: "no_plan" }, { status: 404 });

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
  if (!latest || !parsed?.success) return NextResponse.json({ error: "no_plan" }, { status: 404 });

  const plan = parsed.data;
  const jobsById = new Map((await loadOpenJobs()).map((j) => [j.id, j]));
  const jobs = plan.targetOpportunities.flatMap((o) => {
    const job = jobsById.get(o.jobId);
    if (!job) return [];
    return [
      {
        title: job.title,
        company: job.company?.name ?? "",
        location: job.location,
        match: matchJob(data, catalog, job).score,
        why: o.why,
      },
    ];
  });
  const careers = plan.alternativePaths.flatMap((a) => {
    const match = matchCareer(data, catalog, a.careerId);
    return match ? [{ title: match.career.title, match: match.score, why: a.why }] : [];
  });

  const pdf = await buildCareerPlanPdf({
    plan,
    personName: profile.full_name,
    careerTitle: career.title,
    readiness: computeReadiness(data, catalog, career.id).overall,
    generatedOn: new Date(latest.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }),
    model: latest.source === "ai" ? latest.model : null,
    jobs,
    careers,
  });

  const filename = `JADE-Career-Plan-${career.title.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
