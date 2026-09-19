import { Fragment } from "react";
import { APP_SLOGAN } from "@/lib/config";
import { cn } from "@/lib/utils";

const PHRASES = APP_SLOGAN.split(/(?<=\.)\s+/);
const DELAYS = ["[animation-delay:200ms]", "[animation-delay:450ms]", "[animation-delay:700ms]"];

/** The brand slogan; the last word of each phrase is highlighted. `animated` fades the phrases in one by one. */
export function Slogan({ animated = false, className }: { animated?: boolean; className?: string }) {
  return (
    <p className={cn("font-bold tracking-tight", className)}>
      {PHRASES.map((phrase, i) => {
        const m = phrase.match(/^(.*\s)(\S+?)(\.?)$/);
        const [lead, word, end] = m ? [m[1], m[2], m[3]] : ["", phrase, ""];
        return (
          <Fragment key={phrase}>
            {/* A real space (not margin) so copied and read-aloud text keeps the word breaks. */}
            {i > 0 && " "}
            <span
              className={cn(
                "inline-block",
                animated &&
                  cn(
                    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 motion-safe:fill-mode-both",
                    DELAYS[i % DELAYS.length],
                  ),
              )}
            >
              {lead}
              <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-cyan-300">
                {word}
              </span>
              {end}
            </span>
          </Fragment>
        );
      })}
    </p>
  );
}
