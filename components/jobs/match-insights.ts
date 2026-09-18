import { matchCareer, skillEvidence, type JobMatch } from "@/lib/ai/matching";
import { skillName } from "@/lib/data/catalog";
import { JOB_TYPE_LABELS } from "@/lib/format";
import type { CareerProfileData, Catalog, Job } from "@/lib/types";

type JobLike = Pick<Job, "required_skills" | "preferred_skills" | "job_type" | "location" | "career_id" | "grad_years">;

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Plain-language reasons why this person fits this job (second person, for the candidate). */
export function whyYouMatch(data: CareerProfileData, catalog: Catalog, job: JobLike, match: JobMatch): string[] {
  const reasons: string[] = [];
  const levels = new Map(data.skills.map((s) => [s.skill_id, s.level]));
  const total = job.required_skills.length + job.preferred_skills.length;
  const requiredHave = job.required_skills.filter((id) => (levels.get(id) ?? 0) > 0);

  if (job.required_skills.length > 0 && requiredHave.length === job.required_skills.length) {
    reasons.push(`You have every required skill: ${list(requiredHave.map((id) => skillName(catalog, id)))}.`);
  } else if (match.strengths.length > 0) {
    reasons.push(
      `You already have ${match.strengths.length} of the ${total} skills this role asks for, including ${list(
        match.strengths.slice(0, 2).map((id) => skillName(catalog, id)),
      )}.`,
    );
  }

  const evidenceSkill = match.strengths.find((id) => skillEvidence(data, catalog, id).some((e) => !e.startsWith("Listed") && !e.startsWith("Added")));
  if (evidenceSkill) {
    const evidence = skillEvidence(data, catalog, evidenceSkill)
      .filter((e) => !e.startsWith("Listed") && !e.startsWith("Added"))
      .slice(0, 2);
    reasons.push(`You've put ${skillName(catalog, evidenceSkill)} into practice (${evidence.join("; ")}).`);
  }

  if (job.career_id) {
    const career = catalog.careerById.get(job.career_id);
    if (career) {
      if (data.goal?.career_id === job.career_id) {
        reasons.push(`It's on the path to your goal of becoming ${/^[aeiou]/i.test(career.title) ? "an" : "a"} ${career.title}.`);
      } else {
        const careerMatch = matchCareer(data, catalog, job.career_id);
        if (careerMatch && careerMatch.score >= 50) {
          reasons.push(`Your profile is a ${careerMatch.score}% match for ${career.title} careers, the path this role belongs to.`);
        }
      }
    }
  }

  const gradYear = data.profile.graduation_year;
  if (gradYear && job.grad_years.includes(gradYear)) {
    reasons.push(`It's open to ${gradYear} graduates, which fits your graduation year.`);
  }
  const prefs = data.preferences;
  if (prefs?.work_types.includes(job.job_type)) {
    reasons.push(`It's ${job.job_type === "internship" ? "an" : "a"} ${JOB_TYPE_LABELS[job.job_type]}, one of the work types you're looking for.`);
  }
  const location = (job.location ?? "").toLowerCase();
  const preferredLocation = prefs?.preferred_locations.find((l) => location.includes(l.toLowerCase()));
  if (preferredLocation) reasons.push(`It's in ${job.location}, one of your preferred locations.`);

  if (reasons.length === 0) {
    reasons.push("This is a stretch role for you today, but the skills below would change that.");
  }
  return reasons;
}

/** Things worth knowing that lower the match (grad year, location). */
export function matchCaveats(data: CareerProfileData, job: JobLike): string[] {
  const caveats: string[] = [];
  const gradYear = data.profile.graduation_year;
  if (gradYear && job.grad_years.length > 0 && !job.grad_years.includes(gradYear)) {
    caveats.push(`It targets ${list(job.grad_years.map(String))} graduates; you graduate in ${gradYear}.`);
  }
  const prefs = data.preferences;
  if (prefs && prefs.work_types.length > 0 && !prefs.work_types.includes(job.job_type)) {
    caveats.push(`It's a ${JOB_TYPE_LABELS[job.job_type]} role, which isn't one of your preferred work types.`);
  }
  if (prefs && prefs.preferred_locations.length > 0 && job.location) {
    const location = job.location.toLowerCase();
    if (!prefs.preferred_locations.some((l) => location.includes(l.toLowerCase()))) {
      caveats.push(`It's based in ${job.location}, outside your preferred locations.`);
    }
  }
  return caveats;
}

export interface GapAdvice {
  skillId: string;
  name: string;
  required: boolean;
  improving: boolean;
  hint: string;
  href: string;
  hrefLabel: string;
}

/** For each gap: how to close it and where to go next. */
export function recommendedBeforeApplying(data: CareerProfileData, catalog: Catalog, job: JobLike, match: JobMatch, limit = 4): GapAdvice[] {
  const levels = new Map(data.skills.map((s) => [s.skill_id, s.level]));
  const isGoal = Boolean(job.career_id && data.goal?.career_id === job.career_id);
  const career = job.career_id ? catalog.careerById.get(job.career_id) : null;
  return match.gaps.slice(0, limit).map((gap) => {
    const skill = catalog.skillById.get(gap.skillId);
    const name = skillName(catalog, gap.skillId);
    return {
      skillId: gap.skillId,
      name,
      required: gap.required,
      improving: (levels.get(gap.skillId) ?? 0) > 0,
      hint: skill?.learn_hint ?? `Practise ${name} in a small, focused project.`,
      href: isGoal ? "/skill-gap" : career ? `/careers/${career.id}` : "/careers",
      hrefLabel: isGoal ? "See it in Your Skill Gap" : career ? `Explore the ${career.title} path` : "Explore careers",
    };
  });
}
