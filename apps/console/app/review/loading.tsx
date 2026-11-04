export default function ReviewLoading() {
  return (
    <main aria-busy="true" aria-label="Loading review queue" className="flex h-dvh flex-col bg-rf-mist px-8 py-6 text-rf-ink">
      <div className="h-10 w-64 animate-pulse rounded bg-rf-hairline" />
      <div className="mt-4 h-6 w-96 max-w-full animate-pulse rounded bg-rf-hairline" />
      <div className="mt-6 min-h-0 flex-1 animate-pulse rounded-[20px] border border-rf-hairline bg-rf-white" />
      <p className="sr-only">Loading the simulated review queue.</p>
    </main>
  );
}
