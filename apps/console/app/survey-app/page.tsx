"use client";

import Link from "next/link";
import { useState } from "react";

type Decision = { sender_item_id: string; decision: "PAY" | "HOLD" | "BLOCK"; reasons: string[]; ring_id?: string };
type ScreenResult = { run_id: string; summary: { pay: number; hold: number; block: number }; decisions: Decision[] };

export default function SurveyAppPage() {
  const [result, setResult] = useState<ScreenResult>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function runScreen() {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/survey-app/screen", { method: "POST", cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Screening failed.");
      setResult(data as ScreenResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Screening failed.");
    } finally {
      setLoading(false);
    }
  }

  const held = result?.decisions.filter((d) => d.decision === "HOLD") ?? [];
  return (
    <main className="min-h-dvh bg-rf-mist px-8 py-6 text-rf-ink">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Survey app · first payout run</h1>
          <p className="mt-1 text-[17px] text-rf-slate">A second program screens 120 payees against the confirmed Budgeting app ring network.</p>
        </div>
        <Link href="/review" className="text-sm font-medium text-rf-slate hover:text-rf-ink">Review queue →</Link>
      </div>
      <button type="button" onClick={runScreen} disabled={loading} className="mt-6 rounded-full bg-rf-spark px-5 py-2.5 font-medium text-white hover:opacity-85 disabled:opacity-60">
        {loading ? "Screening 120 payees…" : "Run survey-app screening"}
      </button>
      {error && <p role="alert" className="mt-4 text-sm text-rf-spark-text">{error}</p>}
      {result && <section className="mt-6 rounded-[20px] border border-rf-hairline bg-rf-white p-6">
        <p className="text-xs text-rf-slate">Fresh run <code className="font-mono text-rf-ink">{result.run_id}</code></p>
        <div className="mt-3 flex gap-6 text-lg"><span>{result.summary.pay} paid</span><span className="font-medium text-rf-spark-text">{result.summary.hold} held</span><span>{result.summary.block} blocked</span></div>
        <h2 className="mt-6 text-lg font-semibold">Held payees</h2>
        {held.length === 0 ? <p className="mt-2 text-sm text-rf-slate">No payees were held.</p> : <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm"><thead><tr className="border-b border-rf-hairline text-rf-slate"><th className="py-2 pr-4">Item</th><th className="py-2 pr-4">Reason</th><th className="py-2">Confirmed ring</th></tr></thead>
            <tbody>{held.map((item) => <tr key={item.sender_item_id} className="border-b border-rf-hairline/70"><td className="py-2 pr-4 font-mono">{item.sender_item_id}</td><td className="py-2 pr-4">{item.reasons.join(" · ")}</td><td className="py-2">{item.reasons.includes("network_match") ? "Budgeting app · R-12" : item.ring_id ?? "—"}</td></tr>)}</tbody>
          </table>
        </div>}
      </section>}
      <p className="mt-4 text-xs text-rf-slate">Each click sends a fresh sender batch ID to the API, so repeat runs are screened anew.</p>
    </main>
  );
}
