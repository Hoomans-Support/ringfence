import type { Metadata } from "next";
import { connection } from "next/server";
import { checkClaims, investigate, summarizeForAnalyst } from "@ringfence/agents";
import { scoreRun } from "@ringfence/engine";
import { buildControlTowerSources } from "@/lib/control-tower-data";
import { buildDemo } from "@/lib/demo";
import { loadWeekRun, loadWeekTruth, parseDemoWeek, type DemoWeek } from "@/lib/fixtures";
import { ControlTower, type ControlTowerData } from "./control-tower";

export const metadata: Metadata = { title: "Control tower" };

export default async function ControlTowerPage({ searchParams }: { searchParams: Promise<{ week?: string; adjusted?: string }> }) {
  await connection();
  const { week: rawWeek, adjusted: rawAdjusted } = await searchParams;
  const week = parseDemoWeek(rawWeek);
  const adjusted = rawAdjusted === "1";
  const demo = buildDemo(week, adjusted);
  const sources = buildControlTowerSources(week, adjusted);
  const keptUsd = sources.payouts.reduce((a, r) => a + r.kept, 0);
  const leakedUsd = sources.payouts.reduce((a, r) => a + r.leaked, 0);

  // The week's main paused group, drawn exactly as Decisions draws it.
  const graphCase = demo.cases.find((c) => c.kind === "group" && c.verdict === "fraud");
  const ringGraph: ControlTowerData["ringGraph"] = graphCase
    ? { name: graphCase.name ?? graphCase.title, caption: graphCase.headline, members: graphCase.members }
    : { name: "No paused group", caption: "", members: [] };

  // The ring itself (weeks 1-2): its checked case file feeds the analyst's read, and its story label
  // (R-12) is what Ring Watch asks the live API for.
  const outcomeWeek: DemoWeek = week === 2 ? 1 : week;
  const run = loadWeekRun(outcomeWeek);
  const ring = week === 1 || week === 2 ? scoreRun(run).rings.find((r) => r.size >= 3) : undefined;
  const ringAccounts = new Set(run.items.filter((it) => ring?.member_sender_item_ids.includes(it.sender_item_id)).map((it) => it.context.account_id));
  const ringLabel = ring ? (loadWeekTruth(outcomeWeek).find((t) => ringAccounts.has(t.account_id) && t.ring_label)?.ring_label ?? ring.ring_id) : "No active ring";
  const caseFile = ring ? checkClaims(investigate(ring, run), run) : undefined;

  const analystNote = week === 4
    ? "Six survey-app payees reuse a device from BudgetApp's Group 12; their cross-program holds are fixture outcomes until the live screening control is run."
    : caseFile
      ? await summarizeForAnalyst(caseFile, { keptUsd, leakedUsd })
      : "No linked ring is active in this week. Keep watching the payout run for new signals.";
  const amountOf = new Map(run.items.map((it) => [it.sender_item_id, Number(it.amount.value)] as const));
  const rawThreshold = Number(process.env.RINGFENCE_RING_WATCH_THRESHOLD_USD ?? 500);
  const ringWatch: ControlTowerData["ringWatch"] = {
    runId: run.sender_batch_header.sender_batch_id,
    ringId: ringLabel,
    thresholdUsd: Number.isFinite(rawThreshold) && rawThreshold > 0 ? rawThreshold : 500,
    keptUsd,
    leakedUsd,
    memberAmounts: Object.fromEntries((ring?.member_sender_item_ids ?? []).map((id) => [id, amountOf.get(id) ?? 0])),
    enabled: Boolean(process.env.RINGFENCE_API_URL && process.env.RINGFENCE_MCP_KEY && ring),
  };

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-8 px-8 pt-12 pb-20 max-[720px]:px-4">
      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">{demo.kicker} · LIVE VIEW</div>
        <h1 className="text-[48px] leading-[1.05] font-semibold tracking-[-0.035em] max-[720px]:text-[36px]">Control tower</h1>
        <p className="max-w-[60ch] text-[17px] leading-[1.55] text-rf-slate">
          The run as an AG Studio dashboard over the real decisions: headline numbers, where the payees went, kept against leaked across every run so far, the ring, a live Ring Watch on the real API, and every paused account. Edit it to rearrange or add widgets yourself.
        </p>
      </section>
      {/* No card around AG Studio's own canvas, which is the page's white (studio/theme.ts); this div
          only gives it a definite height, and -mx-6/-mt-6 cancel the canvas's 16px padding plus the
          cards' 8px inset (globals.css) so the cards line up with the page. The layout runs 104 rows
          of 16px plus that padding and the edit bar, so the page, not Studio, does the scrolling. */}
      <div className="-mx-6 -mt-6 h-435">
        {/* key={week}: AG Studio reads its widgets and data once, at mount; a new week remounts it. */}
        <ControlTower key={`${week}${adjusted}`} licenseKey={process.env.AG_STUDIO} aiEnabled={Boolean(process.env.OPENROUTER_API_KEY)} ringGraph={ringGraph} ringWatch={ringWatch} analyst={{ note: analystNote }} sources={sources} />
      </div>
    </main>
  );
}
