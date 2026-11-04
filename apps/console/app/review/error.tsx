"use client";

export default function ReviewError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-rf-mist px-6 text-rf-ink">
      <section role="alert" className="max-w-lg rounded-[20px] border border-rf-hairline bg-rf-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rf-slate">Review queue unavailable</p>
        <h1 className="mt-2 text-2xl font-semibold">The held items could not be loaded.</h1>
        <p className="mt-3 text-sm leading-6 text-rf-slate">Try again. The demo uses simulated Week 0, 1, and 2 fixture data.</p>
        <button onClick={reset} className="mt-6 rounded-full bg-rf-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-85">
          Try again
        </button>
      </section>
    </main>
  );
}
