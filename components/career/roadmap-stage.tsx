"use client";

import { useEffect, useId, useOptimistic, useState, useTransition } from "react";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ExternalLink,
  FolderGit2,
  GraduationCap,
  Hammer,
  Loader2,
  Send,
  SlidersHorizontal,
  Trophy,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { SkillLevelControl } from "@/components/career/skill-level-control";
import { useProgressToast } from "@/components/career/use-progress-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { addStageProject, saveStageOutcome, toggleTask } from "@/lib/actions/career";
import { cn } from "@/lib/utils";

export type StageKind = "skill" | "project" | "portfolio" | "apply";

export interface StageTaskView {
  id: string;
  title: string;
  isDone: boolean;
  targetLabel: string | null;
}

export interface StageView {
  id: string;
  index: number;
  periodLabel: string;
  title: string;
  description: string | null;
  kind: StageKind;
  completedAt: string | null;
  evidenceNote: string | null;
  evidenceUrl: string | null;
  tasks: StageTaskView[];
  /** The skill this stage builds, with the user's current level. */
  skill: { id: string; name: string; level: number } | null;
  /** Skills offered when uploading a project; `selected` ones are prefilled. */
  projectSkills: { id: string; name: string; selected: boolean }[];
  projects: { id: string; name: string; url: string | null }[];
}

export const KIND_META: Record<StageKind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  skill: { label: "Skill", icon: GraduationCap },
  project: { label: "Project", icon: Hammer },
  portfolio: { label: "Portfolio", icon: BriefcaseBusiness },
  apply: { label: "Apply", icon: Send },
};

const dialogClass = "max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl sm:max-w-lg";

function OutcomeDialog({ stage }: { stage: StageView }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const noteId = useId();
  const urlId = useId();
  const hasOutcome = Boolean(stage.evidenceNote || stage.evidenceUrl);

  const submit = (form: FormData) =>
    startTransition(async () => {
      const result = await saveStageOutcome(stage.id, String(form.get("note") ?? ""), String(form.get("url") ?? ""));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Outcome saved", { description: `Recorded for “${stage.title}”.` });
      setOpen(false);
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trophy aria-hidden /> {hasOutcome ? "Edit outcome" : "Add outcome"}
        </Button>
      </DialogTrigger>
      <DialogContent className={dialogClass}>
        <form action={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>What did you achieve?</DialogTitle>
            <DialogDescription>
              Record an outcome for “{stage.title}”: a certificate, a finished course, a write-up or anything you can show.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={noteId}>Outcome</Label>
            <Textarea
              id={noteId}
              name="note"
              rows={4}
              maxLength={1000}
              defaultValue={stage.evidenceNote ?? ""}
              placeholder="e.g. Finished the course and containerised my churn prediction API."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={urlId}>Link (optional)</Label>
            <Input id={urlId} name="url" inputMode="url" defaultValue={stage.evidenceUrl ?? ""} placeholder="https://" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />} Save outcome
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDialog({ stage }: { stage: StageView }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [skills, setSkills] = useState(() => new Set(stage.projectSkills.filter((s) => s.selected).map((s) => s.id)));
  const showProgress = useProgressToast();
  const ids = { name: useId(), description: useId(), url: useId() };

  const submit = (form: FormData) =>
    startTransition(async () => {
      const name = String(form.get("name") ?? "");
      const result = await addStageProject({
        stageId: stage.id,
        name,
        description: String(form.get("description") ?? ""),
        url: String(form.get("url") ?? ""),
        skills: [...skills],
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      showProgress(result, `“${name.trim()}” was added to your Career Profile.`);
      setOpen(false);
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload aria-hidden /> Upload project
        </Button>
      </DialogTrigger>
      <DialogContent className={dialogClass}>
        <form action={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Upload a project</DialogTitle>
            <DialogDescription>Projects show employers what you can do and raise your Career Readiness.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={ids.name}>Project name</Label>
            <Input id={ids.name} name="name" required maxLength={120} placeholder="e.g. Churn model API with Docker" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.description}>Description</Label>
            <Textarea
              id={ids.description}
              name="description"
              rows={3}
              maxLength={2000}
              placeholder="What did you build, how, and what was the result?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={ids.url}>Link (optional)</Label>
            <Input id={ids.url} name="url" inputMode="url" placeholder="https://github.com/you/project" />
          </div>
          {stage.projectSkills.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Skills used</legend>
              <div className="flex flex-wrap gap-2">
                {stage.projectSkills.map((skill) => {
                  const on = skills.has(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSkills((prev) => {
                          const next = new Set(prev);
                          if (on) next.delete(skill.id);
                          else next.add(skill.id);
                          return next;
                        })
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {on && <Check className="h-3 w-3" aria-hidden />}
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />} Add project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** One stage of the Career Roadmap timeline (the whole <li>, node included). */
export function RoadmapStage({ stage, isCurrent }: { stage: StageView; isCurrent: boolean }) {
  const [tasks, setTaskDone] = useOptimistic(stage.tasks, (state, change: { id: string; done: boolean }) =>
    state.map((t) => (t.id === change.id ? { ...t, isDone: change.done } : t)),
  );
  const [pendingTask, setPendingTask] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(isCurrent);
  const showProgress = useProgressToast();

  // Open the stage when it is linked to directly (e.g. from the Skill Gap page).
  useEffect(() => {
    const openIfTarget = () => {
      if (window.location.hash === `#stage-${stage.id}`) setOpen(true);
    };
    openIfTarget();
    window.addEventListener("hashchange", openIfTarget);
    return () => window.removeEventListener("hashchange", openIfTarget);
  }, [stage.id]);

  const done = tasks.filter((t) => t.isDone).length;
  const completed = tasks.length > 0 ? done === tasks.length : Boolean(stage.completedAt);
  const Icon = KIND_META[stage.kind].icon;

  const toggle = (task: StageTaskView, next: boolean) => {
    setPendingTask(task.id);
    startTransition(async () => {
      setTaskDone({ id: task.id, done: next });
      const result = await toggleTask(task.id, next);
      setPendingTask(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      showProgress(result, next ? `Done: ${task.title}` : `Marked as not done: ${task.title}`);
    });
  };

  return (
    <li id={`stage-${stage.id}`} className="relative scroll-mt-24 pb-8 pl-14">
      <span
        aria-hidden
        className={cn("absolute bottom-0 left-[19px] top-10 w-0.5", completed ? "bg-emerald-500" : "bg-border")}
      />
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
          completed
            ? "border-emerald-500 bg-emerald-500 text-white dark:text-emerald-950"
            : isCurrent
              ? "border-emerald-500 bg-background text-emerald-600 shadow-[0_0_0_6px_rgba(16,185,129,0.15)] dark:text-emerald-400"
              : "border-border bg-background text-muted-foreground",
        )}
      >
        {completed ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </span>

      <div
        className={cn(
          "rounded-xl border bg-card p-4 transition-shadow sm:p-5",
          isCurrent && "border-emerald-500/50 shadow-md shadow-emerald-500/5",
          completed && "bg-muted/30",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{stage.periodLabel}</span>
          <span className="text-muted-foreground">· Step {stage.index + 1}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
            <Icon className="h-3 w-3" aria-hidden /> {KIND_META[stage.kind].label}
          </span>
          {completed ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">Completed</span>
          ) : isCurrent ? (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-semibold text-white dark:bg-emerald-500 dark:text-emerald-950">
              In progress
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 text-lg font-semibold leading-snug">{stage.title}</h3>
        {stage.description && <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>}

        {tasks.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-[width] duration-500"
                style={{ width: `${(done / tasks.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {done}/{tasks.length} tasks
            </span>
          </div>
        )}

        {tasks.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={`tasks-${stage.id}`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {open ? "Hide tasks" : "View tasks"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        )}

        {open && tasks.length > 0 && (
          <ul id={`tasks-${stage.id}`} className="mt-3 space-y-1">
            {tasks.map((task) => {
              const id = `task-${task.id}`;
              return (
                <li key={task.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-accent/40">
                  <Checkbox
                    id={id}
                    checked={task.isDone}
                    disabled={pendingTask === task.id}
                    onCheckedChange={(value) => toggle(task, value === true)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <label htmlFor={id} className="flex-1 cursor-pointer text-sm leading-snug">
                    <span className={cn(task.isDone && "text-muted-foreground line-through decoration-emerald-500/60")}>{task.title}</span>
                    {task.targetLabel && (
                      <span className="ml-2 inline-flex items-center rounded bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                        Skill → {task.targetLabel}
                      </span>
                    )}
                  </label>
                  {pendingTask === task.id && <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" />}
                </li>
              );
            })}
          </ul>
        )}

        {(stage.evidenceNote || stage.evidenceUrl || stage.projects.length > 0) && (
          <div className="mt-4 space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
            {(stage.evidenceNote || stage.evidenceUrl) && (
              <div className="flex items-start gap-2">
                <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <div className="min-w-0">
                  <span className="font-medium">Your outcome: </span>
                  {stage.evidenceNote}
                  {stage.evidenceUrl && (
                    <a
                      href={stage.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 break-all font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      {stage.evidenceNote ? "Link" : stage.evidenceUrl}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  )}
                </div>
              </div>
            )}
            {stage.projects.map((project) => (
              <div key={project.id} className="flex items-start gap-2">
                <FolderGit2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <div className="min-w-0">
                  <span className="font-medium">Project: </span>
                  {project.url ? (
                    <a href={project.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {project.name}
                    </a>
                  ) : (
                    project.name
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <OutcomeDialog stage={stage} />
          <ProjectDialog stage={stage} />
          {stage.skill && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal aria-hidden /> Update skill status
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)]">
                <p className="text-sm font-medium">Your level in {stage.skill.name}</p>
                <p className="mb-3 text-xs text-muted-foreground">Raising it completes the matching roadmap tasks.</p>
                <SkillLevelControl skillId={stage.skill.id} skillName={stage.skill.name} level={stage.skill.level} compact />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </li>
  );
}
