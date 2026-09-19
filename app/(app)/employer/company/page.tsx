import { APP_NAME } from "@/lib/config";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-parts";
import { CompanyForm } from "@/components/employer/company-form";
import { CompanyMark } from "@/components/jobs/job-parts";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Company Profile" };

export default async function CompanyPage() {
  const profile = await requireProfile({ role: "recruiter" });
  const supabase = await createClient();
  const { data: company } = profile.company_id
    ? await supabase.from("companies").select("*").eq("id", profile.company_id).maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {company && (
        <Link href="/employer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Employer Dashboard
        </Link>
      )}
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Building2 className="h-3.5 w-3.5" />
            {company ? "Company profile" : "Step 1 of 2"}
          </span>
        }
        title={company ? `Edit ${company.name}` : "Set up your company"}
        description={
          company
            ? "This is what candidates see on your job listings."
            : "Your jobs are posted under your company. Once it's set up, you can publish your first job and start discovering talent."
        }
        className="mb-0"
      />

      {!company && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p>
            {APP_NAME} matches candidates to your jobs using their skills, projects and experience, so you see{" "}
            <span className="font-medium">why</span> each person fits, not just a PDF.
          </p>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5 sm:p-7">
        {company && (
          <div className="mb-6 flex items-center gap-3 border-b pb-5">
            <CompanyMark name={company.name} className="h-12 w-12" />
            <div>
              <p className="font-semibold">{company.name}</p>
              <p className="text-sm text-muted-foreground">
                {[company.industry, company.location, company.size ? `${company.size} employees` : null].filter(Boolean).join(" · ") ||
                  "Add details below"}
              </p>
            </div>
          </div>
        )}
        <CompanyForm company={company} />
      </div>
    </div>
  );
}
