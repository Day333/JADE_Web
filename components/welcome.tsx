export function Welcome() {
  return (
    <section className="relative isolate w-full overflow-hidden rounded-3xl border border-foreground/10 px-6 py-24 text-center sm:py-32">
      {/* Grid backdrop, faded out towards the edges */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      {/* Drifting jade-coloured glow orbs */}
      <div
        aria-hidden
        className="absolute -left-16 -top-24 -z-10 h-72 w-72 rounded-full bg-emerald-400/40 blur-3xl motion-safe:animate-float"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-10 -z-10 h-80 w-80 rounded-full bg-cyan-400/30 blur-3xl motion-safe:animate-float [animation-delay:-5s]"
      />
      <div
        aria-hidden
        className="absolute left-[38%] top-1/3 -z-10 h-64 w-64 rounded-full bg-teal-300/30 blur-3xl motion-safe:animate-float [animation-delay:-9s]"
      />

      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-700 backdrop-blur dark:text-emerald-300 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live on Vercel
      </div>

      <h1 className="mt-8">
        <span className="block text-lg font-medium uppercase tracking-[0.4em] text-foreground/60 sm:text-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-both motion-safe:delay-150 motion-safe:duration-700">
          Welcome
        </span>
        <span className="mt-3 block motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-6 motion-safe:fill-mode-both motion-safe:delay-300 motion-safe:duration-1000">
          <span className="inline-block bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-600 bg-[length:200%_auto] bg-clip-text pb-2 text-5xl font-black tracking-tight text-transparent drop-shadow-[0_0_24px_rgba(16,185,129,0.35)] sm:text-7xl lg:text-8xl motion-safe:animate-gradient-x">
            JADE Team!
          </span>
        </span>
      </h1>

      <p className="mx-auto mt-6 max-w-md text-sm text-foreground/60 sm:text-base motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:delay-700 motion-safe:duration-1000">
        Pushed to GitHub, deployed by Vercel, powered by Supabase.
      </p>
    </section>
  );
}
