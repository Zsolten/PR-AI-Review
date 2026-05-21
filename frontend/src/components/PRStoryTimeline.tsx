import type { StoryStep } from "../types";

const LAYER_STYLES: Record<string, string> = {
  Database: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Business Logic": "border-violet-500/30 bg-violet-500/10 text-violet-300",
  API: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  UI: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Config: "border-zinc-500/40 bg-zinc-800/60 text-zinc-300",
  Tests: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  Docs: "border-teal-500/30 bg-teal-500/10 text-teal-300",
  Infrastructure: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
};

interface PRStoryTimelineProps {
  storySteps: StoryStep[];
}

export function PRStoryTimeline({ storySteps }: PRStoryTimelineProps) {
  const steps = [...storySteps].sort((a, b) => a.orderIndex - b.orderIndex);

  if (steps.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">
        No story walkthrough available for this review yet.
      </p>
    );
  }

  return (
    <div className="relative">
      <div
        className="absolute bottom-4 left-[11px] top-4 w-px bg-gradient-to-b from-[var(--color-accent)]/60 via-zinc-700/80 to-transparent"
        aria-hidden
      />

      <ol className="space-y-6">
        {steps.map((step, index) => {
          const layerStyle =
            LAYER_STYLES[step.logicalLayer] ??
            "border-zinc-600 bg-zinc-800/50 text-zinc-300";

          return (
            <li key={`${step.filename}-${step.orderIndex}`} className="relative pl-10">
              <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center">
                <span className="absolute h-6 w-6 rounded-full bg-[var(--color-accent)]/20 blur-sm" />
                <span className="relative h-3 w-3 rounded-full border border-[var(--color-accent)] bg-zinc-950 shadow-[0_0_12px_rgba(163,230,53,0.45)]" />
              </div>

              <article className="rounded-xl border border-[var(--color-border)] bg-zinc-950/40 p-4 transition hover:border-zinc-600/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Step {index + 1}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${layerStyle}`}
                  >
                    {step.logicalLayer}
                  </span>
                </div>

                <h4 
                  className="mt-2 block w-full truncate font-mono text-sm font-medium text-zinc-100"
                  title={step.filename}
                >
                  {step.filename}
                </h4>

                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.narrative}</p>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
