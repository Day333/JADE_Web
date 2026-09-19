import type { ActivityDay } from "@/lib/data/growth";
import { cn } from "@/lib/utils";

/**
 * GitHub-style activity calendar: one cell per day for the last 12 months,
 * darker green for busier days. Counts applications, interviews and practice
 * questions. Server-rendered; tooltips are plain title attributes.
 */

const WEEKS = 52;
const DAY_MS = 86_400_000;
const LEVELS = [
  "bg-muted",
  "bg-emerald-200 dark:bg-emerald-950",
  "bg-emerald-400 dark:bg-emerald-700",
  "bg-emerald-600 dark:bg-emerald-500",
];

const level = (total: number) => (total === 0 ? 0 : total === 1 ? 1 : total <= 3 ? 2 : 3);

function label(day: ActivityDay | undefined, date: Date) {
  const when = date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  if (!day) return `No activity on ${when}`;
  const parts = [
    day.applications > 0 && `${day.applications} application${day.applications > 1 ? "s" : ""}`,
    day.interviews > 0 && `${day.interviews} interview${day.interviews > 1 ? "s" : ""}`,
    day.questions > 0 && `${day.questions} question${day.questions > 1 ? "s" : ""}`,
  ].filter(Boolean);
  return `${day.total} activit${day.total > 1 ? "ies" : "y"} on ${when}: ${parts.join(" · ")}`;
}

export function ActivityHeatmap({ days }: { days: Map<string, ActivityDay> }) {
  // Columns are Monday-started weeks, ending with the current week.
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dow = (new Date(todayUTC).getUTCDay() + 6) % 7; // Monday = 0
  const firstMonday = todayUTC - dow * DAY_MS - (WEEKS - 1) * 7 * DAY_MS;

  const weeks: { date: Date; key: string; day: ActivityDay | undefined; future: boolean }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const ms = firstMonday + (w * 7 + d) * DAY_MS;
      const date = new Date(ms);
      const key = date.toISOString().slice(0, 10);
      col.push({ date, key, day: days.get(key), future: ms > todayUTC });
    }
    weeks.push(col);
  }

  // A month label above the first week that starts in a new month.
  const months = weeks.map((col, i) => {
    const month = col[0].date.toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" });
    const prev = i > 0 ? weeks[i - 1][0].date.getUTCMonth() : -1;
    return i === 0 || col[0].date.getUTCMonth() !== prev ? month : null;
  });

  const total = [...days.values()].reduce((sum, d) => sum + d.total, 0);

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{total}</span> activit{total === 1 ? "y" : "ies"} in the last 12 months
      </p>
      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          <div className="ml-8 flex gap-[3px] text-[10px] leading-none text-muted-foreground">
            {months.map((m, i) => (
              <span key={i} className="w-[11px] shrink-0 overflow-visible whitespace-nowrap">
                {m ?? ""}
              </span>
            ))}
          </div>
          <div className="mt-1 flex gap-[3px]">
            <div className="flex w-8 shrink-0 flex-col gap-[3px] pr-1 text-[10px] leading-[11px] text-muted-foreground">
              {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
                <span key={i} className="h-[11px]">
                  {d}
                </span>
              ))}
            </div>
            {weeks.map((col, w) => (
              <div key={w} className="flex flex-col gap-[3px]">
                {col.map((cell) =>
                  cell.future ? (
                    <span key={cell.key} className="h-[11px] w-[11px]" />
                  ) : (
                    <span
                      key={cell.key}
                      title={label(cell.day, cell.date)}
                      className={cn("h-[11px] w-[11px] rounded-[3px]", LEVELS[level(cell.day?.total ?? 0)])}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
          <div className="ml-8 mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            Less
            {LEVELS.map((c) => (
              <span key={c} className={cn("h-[11px] w-[11px] rounded-[3px]", c)} />
            ))}
            More
          </div>
        </div>
      </div>
    </div>
  );
}
