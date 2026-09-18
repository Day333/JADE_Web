import { cn } from "@/lib/utils";

/** A titled card section used across the career pages. */
export function Panel({
  title,
  icon: Icon,
  description,
  actions,
  className,
  children,
  id,
}: {
  title: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("rounded-xl border bg-card p-5 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {Icon && <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
