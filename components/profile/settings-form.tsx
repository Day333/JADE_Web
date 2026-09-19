"use client";

import { APP_NAME } from "@/lib/config";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Radar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { updateAccount, updatePrivacy } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { PrivacyKey } from "@/components/profile/model";

export type DmPolicy = "everyone" | "followers" | "none";

export type PrivacySettings = Record<PrivacyKey, boolean> & { dm_policy: DmPolicy };

const SWITCHES: { key: Exclude<PrivacyKey, "open_to_opportunities">; label: string; description: string }[] = [
  {
    key: "profile_public",
    label: "Career Profile visible to other users",
    description: "Education, experience, projects and skills are visible to people who view your profile.",
  },
  {
    key: "resume_public",
    label: "Resume visible to others",
    description: "People who can see your Career Profile can also open your resume file. Recruiters you apply to can always see it.",
  },
  {
    key: "goal_public",
    label: "Show my career goal",
    description: "Display the career you're working towards on your public profile.",
  },
  {
    key: "allow_recruiter_contact",
    label: "Allow recruiters to message me",
    description: "Recruiters can start a conversation with you when you're open to opportunities or have applied to their jobs.",
  },
  {
    key: "show_status_to_recruiters",
    label: "Show my job-search status to recruiters",
    description: "Let recruiters see your status (e.g. actively looking) when they view your profile.",
  },
];

const DM_OPTIONS: { value: DmPolicy; label: string; description: string }[] = [
  { value: "everyone", label: "Everyone", description: `Anyone on ${APP_NAME} can send you a message.` },
  { value: "followers", label: "Only people I follow", description: "Only people you follow can start a conversation with you." },
  { value: "none", label: "Nobody", description: "No one can start a new conversation with you. Existing chats stay open." },
];

function SwitchRow({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p id={`${id}-desc`} className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-describedby={`${id}-desc`} className="mt-0.5" />
    </div>
  );
}

export function PrivacySettingsForm({ initial, isSeeker }: { initial: PrivacySettings; isSeeker: boolean }) {
  const id = useId();
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);

  const save = async <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    const previous = settings[key];
    setSettings((s) => ({ ...s, [key]: value }));
    setSaving(key);
    try {
      const result = await updatePrivacy({ [key]: value });
      if ("error" in result) {
        setSettings((s) => ({ ...s, [key]: previous }));
        toast.error(result.error);
      } else {
        toast.success("Saved");
      }
    } catch {
      setSettings((s) => ({ ...s, [key]: previous }));
      toast.error("We couldn't save that setting. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      {isSeeker && (
        <section
          aria-labelledby={`${id}-open-title`}
          className={cn(
            "rounded-xl border p-5 shadow-sm transition-colors sm:p-6",
            settings.open_to_opportunities
              ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10"
              : "bg-card",
          )}
        >
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                settings.open_to_opportunities ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              <Radar className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`${id}-open`} id={`${id}-open-title`} className="text-base font-semibold">
                  Open to Opportunities
                </Label>
                <Switch
                  id={`${id}-open`}
                  checked={settings.open_to_opportunities}
                  onCheckedChange={(v) => void save("open_to_opportunities", v)}
                  disabled={saving === "open_to_opportunities"}
                  aria-describedby={`${id}-open-desc`}
                />
              </div>
              <p id={`${id}-open-desc`} className="text-sm text-muted-foreground">
                Recruiters can find you and contact you first <strong className="font-semibold text-foreground">only when this is ON</strong>.
                When it&apos;s off, only recruiters for jobs you&apos;ve applied to can see your full profile.
              </p>
              <p className="pt-1 text-xs font-medium">
                {settings.open_to_opportunities ? (
                  <span className="text-emerald-700 dark:text-emerald-300">You&apos;re visible in recruiter searches.</span>
                ) : (
                  <span className="text-muted-foreground">You&apos;re hidden from recruiter searches.</span>
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {isSeeker && (
        <section aria-labelledby={`${id}-privacy`} className="rounded-xl border bg-card px-5 shadow-sm sm:px-6">
          <h2 id={`${id}-privacy`} className="pt-5 font-semibold">
            Privacy &amp; visibility
          </h2>
          <div className="divide-y">
            {SWITCHES.map((s) => (
              <SwitchRow
                key={s.key}
                id={`${id}-${s.key}`}
                label={s.label}
                description={s.description}
                checked={settings[s.key]}
                disabled={saving === s.key}
                onChange={(v) => void save(s.key, v)}
              />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby={`${id}-dm`} className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 id={`${id}-dm`} className="font-semibold">
          Who can message me
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {isSeeker
            ? "Applies to other members. Recruiter messages are controlled by the setting above."
            : "Controls who can start a new conversation with you."}
        </p>
        <RadioGroup
          value={settings.dm_policy}
          onValueChange={(v) => void save("dm_policy", v as DmPolicy)}
          disabled={saving === "dm_policy"}
          className="gap-3"
          aria-labelledby={`${id}-dm`}
        >
          {DM_OPTIONS.map((o) => (
            <Label
              key={o.value}
              htmlFor={`${id}-dm-${o.value}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal transition-colors hover:bg-accent/50",
                settings.dm_policy === o.value && "border-emerald-500/50 bg-emerald-500/5",
              )}
            >
              <RadioGroupItem id={`${id}-dm-${o.value}`} value={o.value} className="mt-0.5" />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-sm text-muted-foreground">{o.description}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </section>
    </div>
  );
}

export function AccountForm({
  fullName,
  headline,
  showHeadline,
}: {
  fullName: string;
  headline: string;
  showHeadline: boolean;
}) {
  const id = useId();
  const [name, setName] = useState(fullName);
  const [title, setTitle] = useState(headline);
  const [pending, startTransition] = useTransition();
  const dirty = name.trim() !== fullName || (showHeadline && title.trim() !== headline);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateAccount(showHeadline ? { fullName: name, headline: title } : { fullName: name });
          if ("error" in result) toast.error(result.error);
          else toast.success(result.message ?? "Saved");
        });
      }}
    >
      <div className={cn("grid gap-4", showHeadline && "sm:grid-cols-2")}>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-name`}>Display name</Label>
          <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" />
        </div>
        {showHeadline && (
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-title`}>Your title</Label>
            <Input id={`${id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Talent Acquisition Lead" />
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || !dirty || !name.trim()}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Save
        </Button>
      </div>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      onClick={() =>
        startTransition(async () => {
          const { error } = await createClient().auth.signOut();
          if (error) {
            toast.error("Couldn't sign you out. Please try again.");
            return;
          }
          router.push("/");
          router.refresh();
        })
      }
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
      Sign out
    </Button>
  );
}
