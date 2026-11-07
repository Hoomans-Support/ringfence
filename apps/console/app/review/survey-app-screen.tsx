"use client";

import { useState } from "react";

type Decision = { sender_item_id: string; decision: "PAY" | "HOLD" | "BLOCK"; reasons: string[]; ring_id?: string };
type ScreenResult = { run_id: string; summary: { pay: number; hold: number; block: number }; decisions: Decision[] };

export function SurveyAppScreen() {
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

  const held = result?.decisions.filter((decision) => decision.decision === "HOLD") ?? [];
  return (
    <div className="mt-3">
      <button type="button" onClick={runScreen} disabled={loading} className="min-h-11 rounded-full border border-rf-ink bg-rf-ink px-5 text-[15px] font-medium text-rf-white hover:opacity-85 disabled:opacity-60">
        {loading ? "Screening 120 payees…" : "Run live network screening"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-rf-spark-text">{error}</p>}
      {result && <div className="mt-3 rounded-[12px] bg-rf-mist p-3">
        <p className="text-xs text-rf-slate">API run <code className="font-mono text-rf-ink">{result.run_id}</code></p>
        <p className="mt-1 text-sm">{result.summary.pay} paid · {result.summary.hold} held · {result.summary.block} blocked</p>
        {held.length > 0 && <p className="mt-1 text-xs text-rf-slate">Network matches: {held.filter((item) => item.reasons.includes("network_match")).length} · {held.map((item) => item.sender_item_id).join(", ")}</p>}
      </div>}
    </div>
  );
}
