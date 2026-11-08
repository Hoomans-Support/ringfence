import type { Metadata } from "next";
import { connection } from "next/server";
import { scoreRun } from "@ringfence/engine";
import { buildDemo } from "@/lib/demo";
import { buildInsightRows } from "@/lib/insights-data";
import { loadWeekRun, loadWeekTruth, parseDemoWeek } from "@/lib/fixtures";
import { studioAiModels } from "@/lib/studio-ai";
import { Insights, type InsightsData } from "./insights";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string }> }) {
  await connection();
  const { week: rawWeek, adjusted: rawAdjusted } = await searchParams;
  const week = parseDemoWeek(rawWeek);
  const adjusted = rawAdjusted === "1";
  const demo = buildDemo(week, adjusted);
  const rows = buildInsightRows(week, adjusted);

  // Ring Watch keeps an eye on the ring the walkthrough confirms, Group 12 in Week 45's run, on the
  // live API: from week 1 on, it's the ring that would come back. Its story label (R-12) is what the
  // API knows it by.
  const run = loadWeekRun(1);
  const ring = week >= 1 ? scoreRun(run).rings.find((r) => r.size >= 3) : undefined;
  const ringAccounts = new Set(run.items.filter((it) => ring?.member_sender_item_ids.includes(it.sender_item_id)).map((it) => it.context.account_id));
  const ringLabel = ring ? (loadWeekTruth(1).find((t) => ringAccounts.has(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id) : "No active ring";
  const ringRows = rows.filter((r) => r.order === 45 && r.byEngine);
  const amountOf = new Map(run.items.map((it) => [it.sender_item_id, Number(it.amount.value)] as const));
  const rawThreshold = Number(process.env.RINGFENCE_RING_WATCH_THRESHOLD_USD ?? 500);
  const ringWatch: InsightsData["ringWatch"] = {
    runId: run.sender_batch_header.sender_batch_id,
    runName: buildDemo(1, false).runName,
    ringId: ringLabel,
    thresholdUsd: Number.isFinite(rawThreshold) && rawThreshold > 0 ? rawThreshold : 500,
    keptUsd: ringRows.reduce((a, r) => a + r.kept, 0),
    leakedUsd: ringRows.reduce((a, r) => a + r.leaked, 0),
    memberAmounts: Object.fromEntries((ring?.member_sender_item_ids ?? []).map((id) => [id, amountOf.get(id) ?? 0])),
    enabled: Boolean(process.env.RINGFENCE_API_URL && process.env.RINGFENCE_MCP_KEY && ring),
  };

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-8 px-8 pt-12 pb-20 max-[720px]:px-4">
      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">{demo.kicker} · EVERY PAYOUT RUN SO FAR</div>
        <h1 className="text-[48px] leading-[1.05] font-semibold tracking-[-0.035em] max-[720px]:text-[36px]">Insights</h1>
        <p className="max-w-[60ch] text-[17px] leading-[1.55] text-rf-slate">
          Every payout Ringfence has screened, run by run: what it kept from fraud, which part of it did the catching, what still got through, and who was paused by mistake. Filter any slice, rearrange it yourself, or just ask.
        </p>
      </section>
      {/* No card around AG Studio's own canvas, which is the page's white (studio/theme.ts); this div
          only gives it a definite height, and -mx-6/-mt-6 cancel the canvas's 16px padding plus the
          cards' 8px inset (globals.css) so the cards line up with the page. The layout runs 85 rows
          of 16px plus that padding and the Ask bar, so the page, not Studio, does the scrolling. */}
      <div className="-mx-6 -mt-6 h-380">
        {/* key={week}: AG Studio reads its widgets and data once, at mount; a new week remounts it. */}
        <Insights key={`${week}${adjusted}`} licenseKey={process.env.AG_STUDIO} aiEnabled={studioAiModels().length > 0} ringWatch={ringWatch} rows={rows} />
      </div>
    </main>
  );
}
