"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Award,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EditableList } from "@/components/profile/editable-list";
import {
  BasicsFields,
  CertificationForm,
  CertificationView,
  EducationForm,
  EducationView,
  ExperienceForm,
  ExperienceView,
  LinksFields,
  ProjectForm,
  ProjectView,
} from "@/components/profile/item-forms";
import {
  CATEGORY_LABELS,
  customSkillId,
  emptyCertification,
  emptyEducation,
  emptyExperience,
  emptyProject,
  findSkillByName,
  type DraftSkill,
  type ProfileDraft,
  type SkillCategory,
  type SkillOption,
} from "@/components/profile/model";
import { SectionCard } from "@/components/profile/section-card";
import { EditableSkillChip, SkillAdder } from "@/components/profile/skill-picker";
import { confirmProfile } from "@/lib/actions/onboarding";

const CATEGORY_ORDER: SkillCategory[] = ["technical", "tool", "domain", "soft"];

let nextId = 0;
const tmpId = (prefix: string) => `${prefix}-new-${++nextId}`;

export function ReviewForm({
  initialDraft,
  mode,
  foundSkills,
  otherSkills: initialOther,
  hidden,
  fileName,
  options,
}: {
  initialDraft: ProfileDraft;
  mode: "onboarding" | "update";
  foundSkills: number;
  otherSkills: string[];
  hidden: number;
  fileName: string | null;
  options: SkillOption[];
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [otherSkills, setOtherSkills] = useState(initialOther);
  const [pending, startTransition] = useTransition();
  const fromResume = fileName !== null;

  const names = useMemo(() => new Map(options.map((o) => [o.id, o.name])), [options]);
  const skillName = (id: string) =>
    names.get(id) ?? draft.skills.find((s) => s.skillId === id)?.name ?? id.replace(/^custom-/, "").replace(/-/g, " ");
  const skillIds = useMemo(() => new Set(draft.skills.map((s) => s.skillId)), [draft.skills]);

  const update = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const listHandlers = <K extends "educations" | "experiences" | "projects" | "certifications">(key: K, prefix: string) => ({
    onSave: (item: ProfileDraft[K][number], isNew: boolean) => {
      setDraft((d) => {
        const items = d[key] as ProfileDraft[K][number][];
        const next = isNew ? [...items, { ...item, id: tmpId(prefix) }] : items.map((i) => (i.id === item.id ? item : i));
        return { ...d, [key]: next };
      });
      return true;
    },
    onDelete: (item: ProfileDraft[K][number]) => {
      setDraft((d) => ({ ...d, [key]: (d[key] as ProfileDraft[K][number][]).filter((i) => i.id !== item.id) }));
      return true;
    },
  });

  const addSkill = (skill: DraftSkill) => {
    if (skillIds.has(skill.skillId)) {
      toast.info(`${skill.name} is already in your list`);
      return;
    }
    update("skills", [...draft.skills, skill]);
  };

  const addSuggested = (name: string) => {
    const known = findSkillByName(options, name);
    addSkill(
      known
        ? { skillId: known.id, name: known.name, level: 2, source: "resume", category: known.category }
        : { skillId: customSkillId(name), name, level: 2, source: "resume", category: "technical", isCustom: true },
    );
    setOtherSkills((list) => list.filter((n) => n !== name));
  };

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    skills: draft.skills.filter((s) => (s.category ?? "technical") === category),
  })).filter((g) => g.skills.length > 0);

  const confirm = () => {
    if (!draft.basics.fullName.trim()) {
      toast.error("Please enter your name in Basic information.");
      document.getElementById("basics")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    startTransition(async () => {
      const result = await confirmProfile(draft, mode);
      if (result?.error) toast.error(result.error);
    });
  };

  const counts = [
    draft.educations.length && `${draft.educations.length} education entr${draft.educations.length === 1 ? "y" : "ies"}`,
    draft.experiences.length && `${draft.experiences.length} experience${draft.experiences.length === 1 ? "" : "s"}`,
    draft.projects.length && `${draft.projects.length} project${draft.projects.length === 1 ? "" : "s"}`,
    draft.certifications.length && `${draft.certifications.length} certification${draft.certifications.length === 1 ? "" : "s"}`,
  ].filter(Boolean);

  return (
    <div className="space-y-6 pb-28">
      {/* Summary banner */}
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm">
            {fromResume ? <Sparkles className="h-5 w-5" aria-hidden /> : <Wand2 className="h-5 w-5" aria-hidden />}
          </span>
          <div className="space-y-1">
            {fromResume ? (
              <>
                <p className="text-lg font-semibold">
                  We found <span className="text-emerald-700 dark:text-emerald-400">{foundSkills} skill{foundSkills === 1 ? "" : "s"}</span>{" "}
                  in your resume
                  {mode === "update" && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      — {initialDraft.skills.length} new or stronger than on your profile
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  From <span className="font-medium text-foreground">{fileName}</span>
                  {counts.length > 0 ? ` we also drafted ${counts.join(", ")}.` : "."} Review each section below.
                  {hidden > 0 && ` ${hidden} item${hidden === 1 ? " is" : "s are"} already on your Career Profile, so we left ${hidden === 1 ? "it" : "them"} out.`}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">Let&apos;s build your Career Profile</p>
                <p className="text-sm text-muted-foreground">
                  Add your education, experience, projects and skills. The more you add, the better your career matches
                  will be — you can always come back and update it.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <SectionCard id="basics" title="Basic information" icon={UserRound}>
        <div className="space-y-5">
          <BasicsFields value={draft.basics} onChange={(basics) => update("basics", basics)} />
          <div className="border-t pt-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
              <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden /> Links
            </p>
            <LinksFields value={draft.links} onChange={(links) => update("links", links)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard id="education" title="Education" icon={GraduationCap}>
        <EditableList
          items={draft.educations}
          label={(e) => e.school}
          renderView={(e) => <EducationView item={e} />}
          renderForm={(p) => <EducationForm {...p} />}
          newItem={emptyEducation}
          addLabel="Add education"
          empty={<p className="text-sm text-muted-foreground">No education yet.</p>}
          {...listHandlers("educations", "edu")}
        />
      </SectionCard>

      <SectionCard id="experience" title="Experience" icon={Briefcase} description="Internships, jobs, research and volunteering.">
        <EditableList
          items={draft.experiences}
          label={(e) => e.title}
          renderView={(e) => <ExperienceView item={e} skillName={skillName} />}
          renderForm={(p) => <ExperienceForm {...p} />}
          newItem={emptyExperience}
          addLabel="Add experience"
          empty={<p className="text-sm text-muted-foreground">No experience yet — internships, part-time work and volunteering all count.</p>}
          {...listHandlers("experiences", "exp")}
        />
      </SectionCard>

      <SectionCard id="projects" title="Projects" icon={FolderGit2}>
        <EditableList
          items={draft.projects}
          label={(p) => p.name}
          renderView={(p) => <ProjectView item={p} skillName={skillName} />}
          renderForm={(p) => <ProjectForm {...p} />}
          newItem={emptyProject}
          addLabel="Add project"
          empty={<p className="text-sm text-muted-foreground">No projects yet — class, personal and hackathon projects are great evidence.</p>}
          {...listHandlers("projects", "proj")}
        />
      </SectionCard>

      <SectionCard
        id="skills"
        title="Skills"
        icon={Sparkles}
        description="Set how confident you are with each one. These drive your career matches and skill gaps."
      >
        <div className="space-y-5">
          {grouped.length === 0 && <p className="text-sm text-muted-foreground">No skills yet. Add a few below.</p>}
          {grouped.map((group) => (
            <div key={group.category} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[group.category]}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <EditableSkillChip
                    key={skill.skillId}
                    name={skill.name}
                    level={skill.level}
                    badge={skill.isCustom ? "custom" : undefined}
                    onLevel={(level) =>
                      update(
                        "skills",
                        draft.skills.map((s) => (s.skillId === skill.skillId ? { ...s, level } : s)),
                      )
                    }
                    onRemove={() => update("skills", draft.skills.filter((s) => s.skillId !== skill.skillId))}
                  />
                ))}
              </div>
            </div>
          ))}

          {otherSkills.length > 0 && (
            <div className="rounded-lg border border-dashed p-3">
              <p className="mb-2 text-sm">
                <span className="font-medium">We also found:</span>{" "}
                <span className="text-muted-foreground">{otherSkills.join(", ")} — add?</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {otherSkills.map((name) => (
                  <Button key={name} type="button" size="sm" variant="secondary" className="h-7" onClick={() => addSuggested(name)}>
                    <Plus aria-hidden /> {name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <SkillAdder
            options={options}
            excludeIds={skillIds}
            onAdd={(s) =>
              addSkill({ skillId: s.skillId, name: s.name, level: s.level, source: "manual", category: s.category, isCustom: s.isCustom })
            }
          />
        </div>
      </SectionCard>

      <SectionCard id="certifications" title="Certifications" icon={Award}>
        <EditableList
          items={draft.certifications}
          label={(c) => c.name}
          renderView={(c) => <CertificationView item={c} />}
          renderForm={(p) => <CertificationForm {...p} />}
          newItem={emptyCertification}
          addLabel="Add certification"
          empty={<p className="text-sm text-muted-foreground">No certifications yet.</p>}
          {...listHandlers("certifications", "cert")}
        />
      </SectionCard>

      {/* Sticky confirm bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex max-w-4xl flex-col-reverse items-stretch gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href={mode === "update" ? "/profile" : "/onboarding/resume"}
            className="text-center text-sm text-muted-foreground hover:text-foreground sm:text-left"
          >
            {mode === "update" ? "Cancel" : fromResume ? "Upload a different resume" : "Back to resume upload"}
          </Link>
          <div className="flex items-center justify-end gap-3">
            <span className="hidden text-xs text-muted-foreground md:inline">
              {draft.skills.length} skill{draft.skills.length === 1 ? "" : "s"} · {counts.length > 0 ? counts.join(" · ") : "no items yet"}
            </span>
            <Button size="lg" onClick={confirm} disabled={pending} className="w-full shrink-0 sm:w-auto">
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              {pending
                ? "Saving…"
                : mode === "update"
                  ? "Add to my Career Profile"
                  : "Confirm & build my Career Profile"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
