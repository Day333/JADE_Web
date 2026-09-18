"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Route } from "lucide-react";
import { SubmitButton } from "@/components/app/submit-button";
import { COMMUNITY_KINDS, COMMUNITY_KIND_LABELS, POST_TYPES, POST_TYPE_HINTS, POST_TYPE_ICONS } from "@/components/community/post-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPost, type PostFormState } from "@/lib/actions/community";
import { POST_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Community, PostType } from "@/lib/types";

const PLACEHOLDERS: Record<PostType, { title: string; body: string }> = {
  experience: {
    title: "What I wish I knew before my first data role",
    body: "Share what happened, what you learned and what you would do differently…",
  },
  career_journey: {
    title: "From Statistics undergrad to Graduate Data Scientist",
    body: "2024 — Bachelor of …\n2025 — Data Analyst Intern at …\n2026 — …\n\nWhat helped most along the way?",
  },
  interview: {
    title: "Graduate Data Scientist interview — 3 rounds",
    body: "Round 1: online assessment (SQL + statistics)…\nRound 2: technical interview…\nRound 3: behavioural…\n\nHow I prepared:",
  },
  company_review: {
    title: "My internship at … — honest review",
    body: "Team, mentoring, workload, what you actually worked on, and who it suits…",
  },
  graduate_program: {
    title: "Graduate program timeline and assessments",
    body: "When applications opened, the stages, and tips for each one…",
  },
  internship: {
    title: "How I landed a summer internship with no experience",
    body: "Where I found it, how I applied and what made the difference…",
  },
  question: {
    title: "Is a portfolio more important than a Master's for data roles?",
    body: "Give some context so people can give you useful advice…",
  },
  resource: {
    title: "Free resources that helped me learn SQL",
    body: "Links and why each one is worth your time…",
  },
};

export function PostForm({
  communities,
  initialCommunity,
  initialType,
}: {
  communities: Pick<Community, "id" | "slug" | "name" | "kind">[];
  initialCommunity: string | null;
  initialType: PostType;
}) {
  const [state, formAction] = useActionState<PostFormState, FormData>(createPost, {});
  const [type, setType] = useState<PostType>((state.values?.type as PostType) || initialType);
  const [community, setCommunity] = useState(state.values?.community || initialCommunity || "none");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium">What kind of post is this?</legend>
        <input type="hidden" name="type" value={type} />
        <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {POST_TYPES.map((t) => {
            const Icon = POST_TYPE_ICONS[t];
            const selected = t === type;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setType(t)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  selected
                    ? "border-emerald-600 bg-emerald-500/10 font-medium text-emerald-800 dark:text-emerald-200"
                    : "hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="leading-tight">{POST_TYPE_LABELS[t]}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{POST_TYPE_HINTS[type]}</p>
        {errors.type && <p className="mt-1 text-sm text-destructive">{errors.type}</p>}
      </fieldset>

      {type === "career_journey" && (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center">
          <Route className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <p className="flex-1 text-sm">
            <span className="font-medium">Also add these milestones to your Career Journey.</span>{" "}
            <span className="text-muted-foreground">
              It appears as a timeline on your profile, so students one step behind can see how you got there.
            </span>
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/journey" target="_blank">
              Open Career Journey
            </Link>
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="community">Community</Label>
        <input type="hidden" name="community" value={community} />
        <Select value={community} onValueChange={setCommunity}>
          <SelectTrigger id="community" className="sm:max-w-md">
            <SelectValue placeholder="Choose a community" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No specific community</SelectItem>
            {COMMUNITY_KINDS.map((kind) => {
              const list = communities.filter((c) => c.kind === kind);
              if (list.length === 0) return null;
              return (
                <SelectGroup key={kind}>
                  <SelectSeparator />
                  <SelectLabel>{COMMUNITY_KIND_LABELS[kind]}</SelectLabel>
                  {list.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Posting in a community helps the right people find it.</p>
        {errors.community && <p className="text-sm text-destructive">{errors.community}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={200}
          defaultValue={state.values?.title}
          placeholder={PLACEHOLDERS[type].title}
          aria-invalid={!!errors.title}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Post</Label>
        <Textarea
          id="body"
          name="body"
          required
          maxLength={20000}
          rows={12}
          defaultValue={state.values?.body}
          placeholder={PLACEHOLDERS[type].body}
          aria-invalid={!!errors.body}
          className="leading-6"
        />
        {errors.body && <p className="text-sm text-destructive">{errors.body}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input id="tags" name="tags" defaultValue={state.values?.tags} placeholder="e.g. SQL, graduate program, interview tips" />
        <p className="text-xs text-muted-foreground">Separate tags with commas (up to 8).</p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" asChild>
          <Link href="/community">Cancel</Link>
        </Button>
        <SubmitButton pendingText="Publishing…">Publish post</SubmitButton>
      </div>
    </form>
  );
}
