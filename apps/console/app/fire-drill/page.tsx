import type { Metadata } from "next";
import Link from "next/link";
import { headlineRows, loadFireDrillData } from "@/lib/fire-drill-data";
import { money, pct2 } from "@/lib/format";
import { GateBarChart, GateLineSweep } from "./charts";

export const metadata: Metadata = { title: "Fire drill" };

export default function FireDrillPage() {
  const data = loadFireDrillData();
  const [noGate, perRequestGate, ringfence] = headlineRows(data);
  const reductionPct = !noGate || !ringfence || noGate.leakedPer1000Usd === 0
    ? 0
    : (1 - ringfence.leakedPer1000Usd / noGate.leakedPer1000Usd) * 100;

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-8 px-8 pt-12 pb-20 max-[720px]:px-4">
      <section className="flex flex-col gap-4">
        <Link href="/rules#compare" className="text-sm font-medium text-rf-slate hover:text-rf-ink">← Learned rules</Link>
        <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">PRACTICE RUN · 1,000 TEST PAYOUTS · 5 SEEDS</div>
        <h1 className="text-[48px] leading-[1.05] font-semibold tracking-[-0.035em] max-[720px]:text-[36px]">Fire drill</h1>
        <p className="max-w-[60ch] text-[17px] leading-[1.55] text-rf-slate">
          One made-up referral program of 1,000 payees, run three ways and scored against its own ground truth, averaged
          over 5 seeds (<code className="font-mono">npm run fire-drill</code>, written to{" "}
          <code className="font-mono">docs/fire-drill.md</code>).
        </p>
      </section>
      <div className="flex max-w-4xl flex-col gap-8">

      <section className="rounded-[20px] border border-rf-hairline bg-rf-white p-6">
        <p className="font-mono text-xs uppercase tracking-wide text-rf-slate">At an assumed 5% ring share</p>
        <p className="mt-2 font-semibold tracking-[-0.02em]" style={{ fontSize: 48, lineHeight: 1.05 }}>
          {reductionPct.toFixed(0)}% less leaked
        </p>
        <p className="mt-2 max-w-xl text-[15px] leading-[1.55] text-rf-slate">
          Ringfence leaks {ringfence ? money(ringfence.leakedPer1000Usd) : "—"} per 1,000 payouts against{" "}
          {noGate ? money(noGate.leakedPer1000Usd) : "—"} with no gate, while holding only{" "}
          <span className="font-medium text-rf-ink">{ringfence ? pct2(ringfence.honestHeldPct) : "—"}</span> of honest
          members. The per-request gate leaks the same amount at this ring share, but holds{" "}
          <span className="font-medium text-rf-ink">{perRequestGate ? pct2(perRequestGate.honestHeldPct) : "—"}</span> of
          them — the sweeps below show why that gap is the real story.
        </p>
        <div className="mt-5">
          <GateBarChart
            rows={[noGate, perRequestGate, ringfence]
              .filter((r): r is NonNullable<typeof r> => Boolean(r))
              .map((r) => ({ gate: r.gate, value: r.leakedPer1000Usd }))}
            format="money"
          />
        </div>
      </section>

      <section className="rounded-[20px] border border-rf-hairline bg-rf-white p-6">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em]">Honest members held, by assumed ring share</h2>
        <p className="mt-1 text-sm text-rf-slate">
          A bigger ring share doesn't change how many honest members each gate holds — the per-request gate holds roughly
          14% of them no matter what; Ringfence holds a tenth of a percent.
        </p>
        <div className="mt-4">
          <GateLineSweep rows={data.ringShareSweep} metric="honestHeldPct" format="pct2" xLabel="Ring share" />
        </div>
        <details className="mt-4 text-sm text-rf-slate">
          <summary className="cursor-pointer">See the full numbers</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-rf-hairline text-left text-rf-slate">
                  <th className="py-1.5 pr-3 font-medium">Ring share</th>
                  <th className="py-1.5 pr-3 font-medium">Gate</th>
                  <th className="py-1.5 pr-3 text-right font-medium">$ leaked / 1,000</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Honest held</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Precision</th>
                  <th className="py-1.5 text-right font-medium">Recall</th>
                </tr>
              </thead>
              <tbody>
                {data.ringShareSweep.map((r, i) => (
                  <tr key={i} className="border-b border-rf-hairline text-rf-ink">
                    <td className="py-1.5 pr-3">{r.label}</td>
                    <td className="py-1.5 pr-3">{r.gate}</td>
                    <td className="py-1.5 pr-3 text-right">{money(r.leakedPer1000Usd)}</td>
                    <td className="py-1.5 pr-3 text-right">{pct2(r.honestHeldPct)}</td>
                    <td className="py-1.5 pr-3 text-right">{r.precisionPct.toFixed(1)}%</td>
                    <td className="py-1.5 text-right">{r.recallPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="rounded-[20px] border border-rf-hairline bg-rf-white p-6">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em]">Dollars leaked, as rings disguise themselves</h2>
        <p className="mt-1 text-sm text-rf-slate">
          Evasion is the share of ring accounts that also fake activity and slow down onboarding, so no individual risk
          flag shows on them at all. The per-request gate has nothing left to catch; Ringfence's graph signals still do.
        </p>
        <div className="mt-4">
          <GateLineSweep rows={data.evasionSweep} metric="leakedPer1000Usd" format="money" xLabel="Evading accounts" />
        </div>
        <details className="mt-4 text-sm text-rf-slate">
          <summary className="cursor-pointer">See the full numbers</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-rf-hairline text-left text-rf-slate">
                  <th className="py-1.5 pr-3 font-medium">Evading accounts</th>
                  <th className="py-1.5 pr-3 font-medium">Gate</th>
                  <th className="py-1.5 pr-3 text-right font-medium">$ leaked / 1,000</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Honest held</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Precision</th>
                  <th className="py-1.5 text-right font-medium">Recall</th>
                </tr>
              </thead>
              <tbody>
                {data.evasionSweep.map((r, i) => (
                  <tr key={i} className="border-b border-rf-hairline text-rf-ink">
                    <td className="py-1.5 pr-3">{r.label}</td>
                    <td className="py-1.5 pr-3">{r.gate}</td>
                    <td className="py-1.5 pr-3 text-right">{money(r.leakedPer1000Usd)}</td>
                    <td className="py-1.5 pr-3 text-right">{pct2(r.honestHeldPct)}</td>
                    <td className="py-1.5 pr-3 text-right">{r.precisionPct.toFixed(1)}%</td>
                    <td className="py-1.5 text-right">{r.recallPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <p className="text-xs text-rf-slate">
        Numbers are read from <code className="font-mono">docs/fire-drill.md</code>, committed by{" "}
        <code className="font-mono">npm run fire-drill</code> — this page doesn't re-run the simulation itself.
      </p>
      </div>
    </main>
  );
}
