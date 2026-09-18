/**
 * Rule-based Career Roadmap planner: turns a skill gap into monthly stages
 * of concrete tasks, followed by a project, portfolio and application stage.
 */
import { computeSkillGap, type SkillGapItem } from "@/lib/ai/matching";
import type { CareerProfileData, Catalog } from "@/lib/types";

export type StageKind = "skill" | "project" | "portfolio" | "apply";

export interface PlannedTask {
  title: string;
  skillId?: string;
  /** Completing the task raises the skill to at least this level. */
  targetLevel?: number;
}

export interface PlannedStage {
  periodLabel: string;
  title: string;
  description: string;
  kind: StageKind;
  skillId?: string;
  tasks: PlannedTask[];
}

const MAX_SKILL_STAGES = 4;

function monthLabel(start: Date, offset: number) {
  const d = new Date(start.getFullYear(), start.getMonth() + offset, 1);
  return d.toLocaleString("en-AU", { month: "long", year: "numeric" });
}

function tasksForSkill(item: SkillGapItem): PlannedTask[] {
  if (item.status === "missing") {
    const tasks: PlannedTask[] = [
      { title: `Learn ${item.name} fundamentals`, skillId: item.skillId, targetLevel: 1 },
      { title: `Apply ${item.name} in a small hands-on exercise`, skillId: item.skillId, targetLevel: 2 },
    ];
    if (item.target >= 3) {
      tasks.push({ title: `Go deeper: ${item.nextStep}`, skillId: item.skillId, targetLevel: 3 });
    }
    return tasks;
  }
  return [{ title: `Strengthen ${item.name}: ${item.nextStep}`, skillId: item.skillId, targetLevel: item.target }];
}

export function planRoadmap(
  data: CareerProfileData,
  catalog: Catalog,
  careerId: string,
  start: Date = new Date(),
): PlannedStage[] {
  const gap = computeSkillGap(data, catalog, careerId);
  if (!gap) return [];
  const career = gap.career;

  // Core gaps first, missing before improving, then alphabetical so the plan is stable.
  const statusRank = (s: SkillGapItem["status"]) => (s === "missing" ? 0 : 1);
  const queue = [...gap.missing, ...gap.improving].sort(
    (a, b) => b.importance - a.importance || statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name),
  );

  // Up to four monthly skill stages; low-importance skills are paired up.
  const groups: SkillGapItem[][] = [];
  for (const item of queue) {
    const last = groups[groups.length - 1];
    if (groups.length >= MAX_SKILL_STAGES) {
      if (last.length < 2) last.push(item);
      continue;
    }
    if (last && last.length === 1 && item.importance === 1 && last[0].importance === 1) last.push(item);
    else groups.push([item]);
  }

  const stages: PlannedStage[] = groups.map((group) => {
    const [first, second] = group;
    const verb = group.every((g) => g.status === "improving") ? "Strengthen" : "Learn";
    return {
      periodLabel: "",
      title: second ? `${verb} ${first.name} & ${second.name}` : `${verb} ${first.name}`,
      description: second ? `${first.why} ${second.why}` : first.why,
      kind: "skill",
      skillId: first.skillId,
      tasks: group.flatMap(tasksForSkill),
    };
  });

  const showcase = [...gap.missing, ...gap.improving, ...gap.ready]
    .filter((i) => i.importance >= 2)
    .slice(0, 3)
    .map((i) => i.name);
  stages.push({
    periodLabel: "",
    title: `Build a ${career.title} project`,
    description: `Combine ${showcase.join(", ") || "your new skills"} in one project you can show employers.`,
    kind: "project",
    tasks: [
      { title: "Pick a real problem and define the project scope" },
      { title: `Build it using ${showcase.slice(0, 2).join(" and ") || "your target skills"}` },
      { title: "Publish the code on GitHub with a clear README" },
      { title: "Add the project to your Career Profile" },
    ],
  });

  const portfolioTasks: PlannedTask[] = [];
  if (!data.profile.github_url) portfolioTasks.push({ title: "Add your GitHub link to your profile" });
  if (!data.profile.linkedin_url) portfolioTasks.push({ title: "Add your LinkedIn link to your profile" });
  portfolioTasks.push(
    { title: "Update your resume with your new skills and projects" },
    { title: "Ask for feedback on your profile in the community" },
  );
  stages.push({
    periodLabel: "",
    title: "Improve your portfolio",
    description: "Make it easy for recruiters to see what you can do.",
    kind: "portfolio",
    tasks: portfolioTasks,
  });

  stages.push({
    periodLabel: "",
    title: `Apply for ${career.title} roles`,
    description: `Apply for ${career.career_path[0] ?? "entry-level"} and graduate roles that match your profile.`,
    kind: "apply",
    tasks: [
      { title: "Save five opportunities that match your profile" },
      { title: "Submit three applications" },
      { title: "Reach out to one recruiter or professional in the field" },
    ],
  });

  return stages.map((s, i) => ({ ...s, periodLabel: monthLabel(start, i) }));
}
