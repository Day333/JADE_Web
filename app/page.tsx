import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Compass,
  FileText,
  Map,
  MessagesSquare,
  Route,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { ForYouLabel, MatchBadge, MeterRow, ReadinessRing, SkillChip } from "@/components/app/match";
import { Slogan } from "@/components/app/slogan";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { getMyProfile, homePathFor } from "@/lib/auth";
import { APP_NAME } from "@/lib/config";

const JOURNEY = [
  { icon: Compass, title: "Discover", text: "Find careers that fit your skills and personality, including ones you never considered." },
  { icon: Map, title: "Plan", text: "See your skill gap and get a month-by-month Career Roadmap." },
  { icon: TrendingUp, title: "Grow", text: "Complete tasks and projects, and watch your Career Readiness climb." },
  { icon: Users, title: "Connect", text: "Learn from people like you in career, company and university communities." },
  { icon: BriefcaseBusiness, title: "Apply", text: "Get matched to roles, chat with recruiters and track every application." },
];

const FEATURES = [
  { icon: FileText, title: "Career Profile from your resume", text: "Upload a resume and we extract your education, experience, projects and skills. You review everything before it is saved." },
  { icon: Sparkles, title: "Hidden Career Potential", text: "Beyond the obvious matches, we surface careers that suit your unique mix of strengths, and explain why." },
  { icon: Route, title: "Skill Gap & Roadmap", text: "Every target career is broken into Ready, Improving and Missing skills, turned into a staged plan you can tick off." },
  { icon: Users, title: "Career Journeys", text: "See how real people got from where you are to where you want to be, step by step." },
  { icon: BriefcaseBusiness, title: "Jobs matched to you", text: "Every job shows your match, your strengths and your gaps, plus what to improve before applying." },
  { icon: MessagesSquare, title: "Talk to recruiters", text: "Message recruiters directly, share your profile and projects, and follow your applications in one tracker." },
];

function ProductPreview() {
  return (
    <div className="relative rounded-2xl border bg-card/80 p-5 shadow-2xl shadow-emerald-500/10 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Alex Chen</p>
          <p className="text-xs text-muted-foreground">Master of Data Science · Goal: ML Engineer</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Example</span>
      </div>
      <div className="flex items-center gap-5">
        <ReadinessRing value={72} size={104} />
        <div className="flex-1 space-y-2">
          <MeterRow label="Skills" value={80} />
          <MeterRow label="Projects" value={70} />
          <MeterRow label="Portfolio" value={55} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <SkillChip name="Python" status="ready" />
        <SkillChip name="PyTorch" status="ready" />
        <SkillChip name="SQL" status="improving" />
        <SkillChip name="Docker" status="missing" />
        <SkillChip name="MLOps" status="missing" />
      </div>
      <div className="mt-4 rounded-xl border bg-background/60 p-3">
        <ForYouLabel>Recommended for you</ForYouLabel>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Machine Learning Intern</p>
            <p className="text-xs text-muted-foreground">Quokka Labs · Sydney</p>
          </div>
          <MatchBadge score={86} />
        </div>
      </div>
    </div>
  );
}

export default async function Landing() {
  const profile = await getMyProfile();
  const home = profile ? homePathFor(profile) : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          {home ? (
            <Button asChild size="sm">
              <Link href={home}>
                Go to {profile?.role === "recruiter" ? "Employer Dashboard" : "My Dashboard"} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <section className="relative isolate mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:pt-20">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
        />
        <div aria-hidden className="absolute -left-24 top-0 -z-10 h-80 w-80 rounded-full bg-emerald-400/30 blur-3xl motion-safe:animate-float" />
        <div aria-hidden className="absolute -right-10 top-40 -z-10 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl motion-safe:animate-float [animation-delay:-6s]" />

        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" /> AI Career Platform
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
              You don&apos;t need to know
              <br />
              <span className="bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-600 bg-[length:200%_auto] bg-clip-text text-transparent motion-safe:animate-gradient-x">
                what job you want yet.
              </span>
            </h1>
            <Slogan animated className="mt-6 text-2xl sm:text-3xl" />
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Upload your resume. {APP_NAME} builds your Career Profile, shows careers that fit you, maps the skills you
              are missing, connects you with people who have been there, and matches you to real opportunities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={home ?? "/auth/sign-up"}>
                  {home ? "Continue" : "Build my Career Profile"} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {!home && (
                <Button asChild size="lg" variant="outline">
                  <Link href="/auth/sign-up">I&apos;m hiring</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-1000 motion-safe:fill-mode-both motion-safe:delay-200">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">One platform for your whole career journey</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {JOURNEY.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-xl border bg-card p-5">
                <span className="text-xs font-semibold text-muted-foreground">0{i + 1}</span>
                <Icon className="mt-2 h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-3 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <ForYouLabel>Built around you</ForYouLabel>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Not another list of job cards</h2>
          <p className="mt-3 text-muted-foreground">
            Every page answers three questions: where am I now, what should I do next, and what opportunities are open to
            me today?
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-emerald-500/5">
              <div className="inline-flex rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-14 text-white sm:px-12">
          <div aria-hidden className="absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Hiring early-career talent?</h2>
              <p className="mt-3 text-emerald-50/90">
                Post roles, see candidates with verified skill evidence, not just PDFs, discover people who are open to
                opportunities, and invite them to apply or interview.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button asChild size="lg" variant="secondary">
                <Link href={home ?? "/auth/sign-up"}>Start hiring</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Companies and jobs marked as samples are fictional.
          </p>
          <ThemeSwitcher />
        </div>
      </footer>
    </div>
  );
}
