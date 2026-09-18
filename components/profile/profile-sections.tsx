"use client";

import { useMemo, useState, useTransition, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import {
  Award,
  Briefcase,
  Check,
  Compass,
  ExternalLink,
  FileText,
  FolderGit2,
  Github,
  Globe,
  GraduationCap,
  HeartHandshake,
  Linkedin,
  Loader2,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "@/components/app/page-parts";
import { Pill } from "@/components/profile/pill";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChipMultiSelect } from "@/components/profile/chip-multi-select";
import { EditableList } from "@/components/profile/editable-list";
import {
  BasicsForm,
  CertificationForm,
  CertificationView,
  EducationForm,
  EducationView,
  ExperienceForm,
  ExperienceView,
  FormActions,
  LinksForm,
  PortfolioForm,
  PortfolioView,
  ProjectForm,
  ProjectView,
} from "@/components/profile/item-forms";
import {
  CATEGORY_LABELS,
  displayUrl,
  emptyCertification,
  emptyEducation,
  emptyExperience,
  emptyPortfolio,
  emptyProject,
  levelLabel,
  type ActionResult,
  type BasicsInput,
  type CareerOption,
  type CertificationInput,
  type EducationInput,
  type ExperienceInput,
  type LinksInput,
  type PortfolioInput,
  type ProjectInput,
  type SkillCategory,
  type SkillOption,
} from "@/components/profile/model";
import { SectionCard } from "@/components/profile/section-card";
import { EditableSkillChip, SkillAdder } from "@/components/profile/skill-picker";
import {
  addSkill,
  deleteCertification,
  deleteEducation,
  deleteExperience,
  deletePortfolioItem,
  deleteProject,
  deleteResume,
  removeSkill,
  saveCertification,
  saveEducation,
  saveExperience,
  savePortfolioItem,
  saveProject,
  setPrimaryResume,
  setSkillLevel,
  updateBasics,
  updateLinks,
  updatePreferenceLists,
} from "@/lib/actions/profile";
import { COMPANY_TYPE_OPTIONS, INDUSTRY_OPTIONS, LOCATION_OPTIONS, WORK_TYPE_OPTIONS } from "@/lib/ai/questionnaire";
import { cn } from "@/lib/utils";

/** Run a server action and report the outcome with a toast. */
async function run(action: Promise<ActionResult>): Promise<boolean> {
  try {
    const result = await action;
    if ("error" in result) {
      toast.error(result.error);
      return false;
    }
    if (result.message) toast.success(result.message);
    return true;
  } catch {
    toast.error("Something went wrong. Please try again.");
    return false;
  }
}

function EditToggle({ editing, onClick, label }: { editing: boolean; onClick: () => void; label: string }) {
  return (
    <Button variant={editing ? "secondary" : "ghost"} size="sm" onClick={onClick} aria-label={editing ? `Done editing ${label}` : `Edit ${label}`}>
      {editing ? <Check aria-hidden /> : <Pencil aria-hidden />}
      {editing ? "Done" : "Edit"}
    </Button>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

// ---------------------------------------------------------------------------
// Basic information
// ---------------------------------------------------------------------------

export function BasicsSection({ basics }: { basics: BasicsInput }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const rows: [string, string][] = [
    ["Full name", basics.fullName],
    ["Headline", basics.headline],
    ["Location", basics.location],
    ["University", basics.university],
    ["Degree", basics.degree],
    ["Major", basics.major],
    ["Graduation year", basics.graduationYear],
  ];
  return (
    <SectionCard
      id="basic-information"
      title="Basic Information"
      icon={UserRound}
      action={<EditToggle editing={editing} onClick={() => setEditing((e) => !e)} label="basic information" />}
    >
      {editing ? (
        <BasicsForm
          initial={basics}
          pending={pending}
          onCancel={() => setEditing(false)}
          onSubmit={(value) =>
            startTransition(async () => {
              if (await run(updateBasics(value))) setEditing(false);
            })
          }
        />
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={cn("truncate text-sm", !value && "text-muted-foreground/70")}>{value || "Not added"}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="text-xs text-muted-foreground">About me</p>
            <p className={cn("mt-0.5 whitespace-pre-line text-sm", !basics.bio && "text-muted-foreground/70")}>
              {basics.bio || "Add a short summary so people know what you're about."}
            </p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// List sections
// ---------------------------------------------------------------------------

export function EducationSection({ items }: { items: EducationInput[] }) {
  return (
    <SectionCard id="education" title="Education" icon={GraduationCap}>
      <EditableList
        items={items}
        label={(e) => e.school}
        renderView={(e) => <EducationView item={e} />}
        renderForm={(p) => <EducationForm {...p} />}
        onSave={(item) => run(saveEducation(item))}
        onDelete={(item) => run(deleteEducation(item.id!))}
        newItem={emptyEducation}
        addLabel="Add education"
        empty={<Muted>Add your degree and relevant courses.</Muted>}
      />
    </SectionCard>
  );
}

export function ExperienceSection({ items, skillNames }: { items: ExperienceInput[]; skillNames: Record<string, string> }) {
  const name = (id: string) => skillNames[id] ?? id.replace(/^custom-/, "").replace(/-/g, " ");
  return (
    <SectionCard id="experience" title="Experience" icon={Briefcase} description="Internships, jobs, research and volunteering.">
      <EditableList
        items={items}
        label={(e) => e.title}
        renderView={(e) => <ExperienceView item={e} skillName={name} />}
        renderForm={(p) => <ExperienceForm {...p} />}
        onSave={(item) => run(saveExperience(item))}
        onDelete={(item) => run(deleteExperience(item.id!))}
        newItem={emptyExperience}
        addLabel="Add experience"
        empty={<Muted>Internships, part-time jobs, research and volunteering all count as experience.</Muted>}
      />
    </SectionCard>
  );
}

export function ProjectsSection({ items, skillNames }: { items: ProjectInput[]; skillNames: Record<string, string> }) {
  const name = (id: string) => skillNames[id] ?? id.replace(/^custom-/, "").replace(/-/g, " ");
  return (
    <SectionCard id="projects" title="Projects" icon={FolderGit2} description="Projects are the strongest evidence of your skills.">
      <EditableList
        items={items}
        label={(p) => p.name}
        renderView={(p) => <ProjectView item={p} skillName={name} />}
        renderForm={(p) => <ProjectForm {...p} />}
        onSave={(item) => run(saveProject(item))}
        onDelete={(item) => run(deleteProject(item.id!))}
        newItem={emptyProject}
        addLabel="Add project"
        empty={<Muted>Class, personal and hackathon projects all show what you can do.</Muted>}
      />
    </SectionCard>
  );
}

export function CertificationsSection({ items }: { items: CertificationInput[] }) {
  return (
    <SectionCard id="certifications" title="Certifications" icon={Award}>
      <EditableList
        items={items}
        label={(c) => c.name}
        renderView={(c) => <CertificationView item={c} />}
        renderForm={(p) => <CertificationForm {...p} />}
        onSave={(item) => run(saveCertification(item))}
        onDelete={(item) => run(deleteCertification(item.id!))}
        newItem={emptyCertification}
        addLabel="Add certification"
        empty={<Muted>No certifications yet.</Muted>}
      />
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export interface SkillView {
  skillId: string;
  name: string;
  level: number;
  category: SkillCategory;
  evidence: string[];
}

function LevelDots({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i <= level ? "bg-emerald-500" : "bg-muted-foreground/25")} />
      ))}
    </span>
  );
}

function SkillWithEvidence({ skill }: { skill: SkillView }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-sm transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-emerald-500/60 data-[state=open]:bg-emerald-500/5"
        >
          <span className="font-medium">{skill.name}</span>
          <LevelDots level={skill.level} />
          <span className="sr-only">
            {levelLabel(skill.level)}. Show evidence.
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{skill.name}</p>
          <Pill variant="secondary">{levelLabel(skill.level)}</Pill>
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence</p>
        {skill.evidence.length > 0 ? (
          <ul className="mt-1.5 space-y-1 text-sm">
            {skill.evidence.map((e) => (
              <li key={e} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {e}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">
            No evidence yet. Add a project or experience where you used it.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

const SKILL_SECTIONS: Record<
  "skills" | "soft",
  {
    id: string;
    title: string;
    icon: ComponentType<{ className?: string }>;
    description: string;
    categories: SkillCategory[];
    customCategory: SkillCategory;
    empty: string;
  }
> = {
  skills: {
    id: "skills",
    title: "Skills",
    icon: Sparkles,
    description: "Technical skills, tools and domain knowledge. These drive your career matches.",
    categories: ["technical", "tool", "domain"],
    customCategory: "technical",
    empty: "No skills yet. Add the languages, tools and topics you know.",
  },
  soft: {
    id: "soft-skills",
    title: "Soft Skills",
    icon: HeartHandshake,
    description: "How you work with people — just as important to employers.",
    categories: ["soft"],
    customCategory: "soft",
    empty: "Add soft skills like communication, teamwork or leadership.",
  },
};

export function SkillsSection({ kind, skills, options }: { kind: "skills" | "soft"; skills: SkillView[]; options: SkillOption[] }) {
  const { id, title, icon, description, categories, customCategory, empty } = SKILL_SECTIONS[kind];
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();
  const excludeIds = useMemo(() => new Set(skills.map((s) => s.skillId)), [skills]);
  const groups = categories
    .map((category) => ({ category, skills: skills.filter((s) => s.category === category) }))
    .filter((g) => g.skills.length > 0);

  const withBusy = async (skillId: string, action: Promise<ActionResult>) => {
    setBusy(skillId);
    await run(action);
    setBusy(null);
  };

  return (
    <SectionCard
      id={id}
      title={
        <span className="flex items-center gap-2">
          {title}
          {skills.length > 0 && <Pill variant="secondary">{skills.length}</Pill>}
        </span>
      }
      icon={icon}
      description={description}
      action={<EditToggle editing={editing} onClick={() => setEditing((e) => !e)} label={title.toLowerCase()} />}
    >
      <div className="space-y-4">
        {skills.length === 0 && !editing && <Muted>{empty}</Muted>}
        {groups.map((group) => (
          <div key={group.category} className="space-y-2">
            {categories.length > 1 && (
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[group.category]}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {group.skills.map((skill) =>
                editing ? (
                  <EditableSkillChip
                    key={skill.skillId}
                    name={skill.name}
                    level={skill.level}
                    pending={busy === skill.skillId}
                    onLevel={(level) => void withBusy(skill.skillId, setSkillLevel(skill.skillId, level))}
                    onRemove={() => void withBusy(skill.skillId, removeSkill(skill.skillId))}
                  />
                ) : (
                  <SkillWithEvidence key={skill.skillId} skill={skill} />
                ),
              )}
            </div>
          </div>
        ))}
        {!editing && skills.length > 0 && (
          <p className="text-xs text-muted-foreground">Tap a skill to see where you&apos;ve demonstrated it.</p>
        )}
        {editing && (
          <SkillAdder
            options={options}
            excludeIds={excludeIds}
            categories={categories}
            customCategory={customCategory}
            pending={adding}
            placeholder={customCategory === "soft" ? "e.g. Communication, Leadership…" : undefined}
            onAdd={(s) =>
              new Promise<void>((resolve) =>
                startAdding(async () => {
                  await run(addSkill({ skillId: s.isCustom ? undefined : s.skillId, name: s.name, category: s.category, level: s.level }));
                  resolve();
                }),
              )
            }
          />
        )}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export function PortfolioSection({ links, items }: { links: LinksInput; items: PortfolioInput[] }) {
  const [editingLinks, setEditingLinks] = useState(false);
  const [pending, startTransition] = useTransition();
  const entries = [
    { key: "github", label: "GitHub", icon: Github, url: links.github },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin, url: links.linkedin },
    { key: "website", label: "Website", icon: Globe, url: links.website },
  ];
  return (
    <SectionCard id="portfolio" title="Portfolio" icon={Globe} description="Links recruiters can use to see your work.">
      <div className="space-y-4">
        {editingLinks ? (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.03] p-4">
            <LinksForm
              initial={links}
              pending={pending}
              onCancel={() => setEditingLinks(false)}
              onSubmit={(value) =>
                startTransition(async () => {
                  if (await run(updateLinks(value))) setEditingLinks(false);
                })
              }
            />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/50 p-4">
            <ul className="min-w-0 flex-1 space-y-2">
              {entries.map(({ key, label, icon: Icon, url }) => (
                <li key={key} className="flex min-w-0 items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer noopener" className="truncate text-emerald-700 hover:underline dark:text-emerald-400">
                      {displayUrl(url)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/70">Add your {label}</span>
                  )}
                </li>
              ))}
            </ul>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Edit links" onClick={() => setEditingLinks(true)}>
              <Pencil aria-hidden />
            </Button>
          </div>
        )}
        <EditableList
          items={items}
          label={(p) => p.title}
          renderView={(p) => <PortfolioView item={p} />}
          renderForm={(p) => <PortfolioForm {...p} />}
          onSave={(item) => run(savePortfolioItem(item))}
          onDelete={(item) => run(deletePortfolioItem(item.id!))}
          newItem={emptyPortfolio}
          addLabel="Add portfolio item"
        />
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Career interests & preferences
// ---------------------------------------------------------------------------

function ChipList({ items, empty }: { items: { key: string; label: string; href?: string }[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground/70">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) =>
        i.href ? (
          <Link key={i.key} href={i.href} className="rounded-full border px-2.5 py-0.5 text-sm hover:border-emerald-500/50 hover:bg-emerald-500/5">
            {i.label}
          </Link>
        ) : (
          <span key={i.key} className="rounded-full border bg-secondary/50 px-2.5 py-0.5 text-sm">
            {i.label}
          </span>
        ),
      )}
    </div>
  );
}

export function InterestsSection({
  industries,
  careers,
  careerOptions,
}: {
  industries: string[];
  careers: string[];
  careerOptions: CareerOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draftIndustries, setDraftIndustries] = useState(industries);
  const [draftCareers, setDraftCareers] = useState(careers);
  const title = (id: string) => careerOptions.find((c) => c.id === id)?.title ?? id;

  const open = () => {
    setDraftIndustries(industries);
    setDraftCareers(careers);
    setEditing(true);
  };

  return (
    <SectionCard
      id="interests"
      title="Career Interests"
      icon={Compass}
      action={<EditToggle editing={editing} onClick={() => (editing ? setEditing(false) : open())} label="career interests" />}
    >
      {editing ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const ok = await run(updatePreferenceLists({ interestedIndustries: draftIndustries, interestedCareers: draftCareers }));
              if (ok) setEditing(false);
            });
          }}
        >
          <div className="space-y-2">
            <p className="text-sm font-medium">Industries</p>
            <ChipMultiSelect label="Industries" options={INDUSTRY_OPTIONS.map((o) => ({ value: o, label: o }))} value={draftIndustries} onChange={setDraftIndustries} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Careers you&apos;re curious about</p>
            <ChipMultiSelect
              label="Interested careers"
              options={careerOptions.map((c) => ({ value: c.id, label: c.title }))}
              value={draftCareers}
              onChange={setDraftCareers}
            />
          </div>
          <FormActions pending={pending} onCancel={() => setEditing(false)} />
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Industries</p>
            <ChipList items={industries.map((i) => ({ key: i, label: i }))} empty="No industries selected" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Careers you&apos;re curious about</p>
            <ChipList
              items={careers.map((id) => ({ key: id, label: title(id), href: `/careers/${id}` }))}
              empty="None yet — explore careers to find some"
            />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export function PreferencesSection({
  workTypes,
  companyTypes,
  locations,
  rows,
}: {
  workTypes: string[];
  companyTypes: string[];
  locations: string[];
  rows: { label: string; value: number }[] | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ workTypes, companyTypes, locations });
  const workLabel = (v: string) => WORK_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;

  return (
    <SectionCard
      id="preferences"
      title="Career Preferences"
      icon={SlidersHorizontal}
      action={
        <EditToggle
          editing={editing}
          onClick={() => {
            if (!editing) setDraft({ workTypes, companyTypes, locations });
            setEditing((e) => !e);
          }}
          label="career preferences"
        />
      }
    >
      <div className="space-y-5">
        {rows ? (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <StarRating value={row.value} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Take the 3-minute questionnaire so we can match careers to how you like to work.
          </p>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href="/onboarding/preferences?retake=1">
            <RotateCcw aria-hidden /> {rows ? "Retake questionnaire" : "Take the questionnaire"}
          </Link>
        </Button>

        <div className="border-t pt-4">
          {editing ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const ok = await run(
                    updatePreferenceLists({
                      workTypes: draft.workTypes,
                      companyTypes: draft.companyTypes,
                      preferredLocations: draft.locations,
                    }),
                  );
                  if (ok) setEditing(false);
                });
              }}
            >
              <div className="space-y-2">
                <p className="text-sm font-medium">Work types</p>
                <ChipMultiSelect label="Work types" options={WORK_TYPE_OPTIONS} value={draft.workTypes} onChange={(v) => setDraft((d) => ({ ...d, workTypes: v }))} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Company types</p>
                <ChipMultiSelect
                  label="Company types"
                  options={COMPANY_TYPE_OPTIONS.map((o) => ({ value: o, label: o }))}
                  value={draft.companyTypes}
                  onChange={(v) => setDraft((d) => ({ ...d, companyTypes: v }))}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Preferred locations</p>
                <ChipMultiSelect
                  label="Preferred locations"
                  options={LOCATION_OPTIONS.map((o) => ({ value: o, label: o }))}
                  value={draft.locations}
                  onChange={(v) => setDraft((d) => ({ ...d, locations: v }))}
                />
              </div>
              <FormActions pending={pending} onCancel={() => setEditing(false)} />
            </form>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Work types</p>
                <ChipList items={workTypes.map((w) => ({ key: w, label: workLabel(w) }))} empty="Any" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Company types</p>
                <ChipList items={companyTypes.map((c) => ({ key: c, label: c }))} empty="Any" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Preferred locations</p>
                <ChipList items={locations.map((l) => ({ key: l, label: l }))} empty="Anywhere" />
              </div>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------

export interface ResumeView {
  id: string;
  fileName: string;
  uploaded: string;
  isPrimary: boolean;
}

export function ResumesSection({ resumes }: { resumes: ResumeView[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const act = async (id: string, action: Promise<ActionResult>) => {
    setBusy(id);
    const ok = await run(action);
    setBusy(null);
    if (ok) setConfirming(null);
  };

  return (
    <SectionCard id="resume" title="Resume" icon={FileText}>
      <div className="space-y-3">
        {resumes.length === 0 && <Muted>No resume uploaded yet. Upload one and we&apos;ll pick out anything new for your profile.</Muted>}
        {resumes.map((r) => (
          <div key={r.id} className="rounded-lg border bg-background/50 p-3">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <a
                  href={`/resume/${r.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  <span className="truncate">{r.fileName}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                </a>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  Uploaded {r.uploaded}
                  {r.isPrimary && (
                    <Pill className="h-5 gap-1 border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[11px] text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                      <Star className="h-3 w-3" aria-hidden /> Primary
                    </Pill>
                  )}
                </p>
              </div>
              {confirming !== r.id && (
                <div className="flex shrink-0 items-center">
                  {!r.isPrimary && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={busy === r.id}
                      aria-label={`Make ${r.fileName} my primary resume`}
                      title="Make primary"
                      onClick={() => void act(r.id, setPrimaryResume(r.id))}
                    >
                      {busy === r.id ? <Loader2 className="animate-spin" aria-hidden /> : <Star aria-hidden />}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${r.fileName}`}
                    title="Delete"
                    onClick={() => setConfirming(r.id)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              )}
            </div>
            {confirming === r.id && (
              <div className="mt-2 flex flex-wrap items-center justify-end gap-1 border-t pt-2">
                <span className="mr-auto text-xs text-muted-foreground">Delete this file?</span>
                <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => void act(r.id, deleteResume(r.id))}>
                  {busy === r.id && <Loader2 className="animate-spin" aria-hidden />} Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/onboarding/resume?update=1">
            <Upload aria-hidden /> {resumes.length ? "Upload a newer resume" : "Upload a resume"}
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Mark the version you want to share by default as primary. Recruiters only see your resume through your
          applications,{" "}
          <Link href="/settings" className="underline-offset-4 hover:underline">
            unless you make it public
          </Link>
          .
        </p>
      </div>
    </SectionCard>
  );
}
