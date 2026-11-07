"use client";

// Learned rules (the designer's third screen). Rule switches are walkthrough state in demo-store.tsx,
// like every other decision here, except week 2's "Turn on" for the wider rule, which is the
// walkthrough's real `adjusted` URL state (it changes what week 3 holds).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { RulesPageData } from "@/lib/rules";
import { decisionKey, ruleStatus, useDemo, type DemoRule } from "../demo-store";
import { DecideButtons, Glyph } from "../overview";

const STATUS_TEXT = { on: "On", off: "Off", queued: "Queued after version 1", waiting: "Waiting for you" } as const;
const BADGE = { on: "On", off: "Off", queued: "After version 1", waiting: "Waiting for you" } as const;

export function LearnedRules({ page }: { page: RulesPageData }) {
  const { data, views, starter, practice, nextRun } = page;
  const router = useRouter();
  const { store, setRule } = useDemo();
  const q = `week=${data.week}${data.adjusted ? "&adjusted=1" : ""}`;
  const exists = (r: DemoRule) => !r.fromCase || store.dec[decisionKey(data.runId, r.fromCase)] === "fraud";
  const all = [starter, ...data.rules];
  const visible = [...data.rules.filter((r) => exists(r) && views[r.key]), starter];
  const locked = data.rules.find((r) => r.fromCase && !exists(r));
  const status = (r: DemoRule) => ruleStatus(r, all, store);
  const [sel, setSel] = useState<string>();
  const [confirming, setConfirming] = useState<DemoRule>();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (confirming) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirming]);

  const rule = visible.find((r) => r.key === sel) ?? visible[0]!;
  const v = views[rule.key]!;
  const s = status(rule);
  const changed = store.rules[rule.key] !== undefined;
  const turnOn = (r: DemoRule) => (r.onQuery ? router.push(`/rules?${r.onQuery}`) : setRule(r, "on"));
  const counts = { on: 0, off: 0, waiting: 0, queued: 0 };
  for (const r of visible) counts[status(r)]++;
  const summary = `${counts.on} on · ${counts.off ? `${counts.off} off · ` : ""}${counts.waiting} waiting for you${counts.queued ? ` · ${counts.queued} queued` : ""}`;
  const origin = [
    ...(s === "on" ? v.origin.map((o) => (o.k === "Needs" ? { k: "Approved", v: "It runs from the next payout run" } : o)) : v.origin),
    ...(changed ? [{ k: "Last change", v: `Turned ${store.rules[rule.key]} by you · Just now` }] : []),
  ];

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-8 px-8 pt-12 pb-20 max-[720px]:px-4">
      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">NEXT PAYOUT RUN · {nextRun.toUpperCase()}</div>
        <h1 className="text-[48px] leading-[1.05] font-semibold tracking-[-0.035em] max-[720px]:text-[36px]">Learned rules</h1>
        <p className="max-w-[60ch] text-[17px] leading-[1.55] text-rf-slate">
          Each time you mark a group as fraud, Ringfence writes a rule from it and attacks it with 200 disguised copies before you see it. Nothing new runs until you turn it on.
        </p>
      </section>

      <section id="compare" aria-label="How Ringfence compares" className="flex scroll-mt-24 flex-wrap items-start gap-x-12 gap-y-6 rounded-[20px] bg-rf-mist p-6">
        <div className="flex flex-[1_1_300px] flex-col gap-2">
          <div className="-ml-0.5 flex items-center gap-1.5">
            <span tabIndex={0} role="button" aria-label="About this practice run" className="group relative inline-flex size-5 cursor-help items-center justify-center rounded-full outline-none hover:bg-rf-hairline focus-visible:bg-rf-hairline">
              <Glyph d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01" className="text-rf-slate" />
              <span role="tooltip" className="absolute top-7 -left-1.5 z-10 hidden w-85 rounded-xl bg-rf-ink px-4 py-3 text-sm leading-normal font-normal text-rf-white shadow-[0_8px_24px_rgba(17,17,20,0.16)] group-hover:block group-focus:block">
                A made-up program run three ways, averaged over 5 runs. It tests the method, not your program, so it holds before you have any history. The 1-in-20 fake share is an assumption, since no public figure exists.
              </span>
            </span>
            <span className="font-mono text-xs tracking-[0.08em] text-rf-slate">PRACTICE RUN · HOW RINGFENCE COMPARES</span>
          </div>
          <h2 className="text-[22px] leading-[1.3] font-semibold tracking-[-0.02em]">On 1,000 test payouts with 1 in 20 accounts fake</h2>
          <Link href="/fire-drill" className="mt-1 text-sm font-medium text-rf-slate hover:text-rf-ink">The full fire drill →</Link>
        </div>
        <div role="table" aria-label="Practice run results" className="flex flex-[2_1_460px] flex-col rounded-[14px] bg-rf-white px-5 py-2 text-[15px]">
          <div role="row" className="grid grid-cols-[minmax(0,1fr)_120px_160px] gap-4 border-b border-rf-hairline py-2.5 text-xs leading-[1.3] text-rf-slate">
            <span role="columnheader">Approach</span><span role="columnheader" className="text-right">Lost to fraud</span><span role="columnheader" className="text-right">Real members paused</span>
          </div>
          {practice.map((p, i) => (
            <div role="row" key={p.approach} className={`grid grid-cols-[minmax(0,1fr)_120px_160px] gap-4 py-3 ${i < practice.length - 1 ? "border-b border-rf-hairline" : ""} ${p.strong ? "font-semibold" : ""}`}>
              <span role="cell">{p.approach}</span>
              <span role="cell" className="text-right font-mono">{p.lost}</span>
              <span role="cell" className="text-right font-mono">{p.paused}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <aside className="flex max-w-95 flex-[1_1_300px] flex-col gap-3">
          <div className="px-1 text-sm text-rf-slate">{summary}</div>
          {visible.map((r) => {
            const rs = status(r);
            const rv = views[r.key]!;
            const on = r.key === rule.key;
            return (
              <button key={r.key} type="button" aria-pressed={on} onClick={() => setSel(r.key)}
                className={`flex flex-col gap-2 rounded-2xl bg-rf-white p-5 text-left text-rf-ink ${on ? "border-[1.5px] border-rf-ink" : "border border-rf-hairline hover:border-rf-slate"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] tracking-[0.08em] text-rf-slate">{rv.kicker.split(" · ").slice(0, 2).join(" · ")}</span>
                  <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs leading-none font-semibold ${rs === "on" ? "bg-rf-ink text-rf-white" : "bg-rf-mist text-rf-ink"}`}>{BADGE[rs]}</span>
                </span>
                <span className="text-base leading-[1.3] font-semibold">{rv.name}</span>
                <span className="text-sm leading-[1.4] text-rf-slate">
                  {rs === "on" ? (store.rules[r.key] === "on" ? "On from the next run" : rv.listEffect.on) : rs === "off" ? rv.listEffect.off : rs === "queued" ? "Decide on version 1 first" : rv.listEffect.waiting}
                </span>
              </button>
            );
          })}
          {locked && (
            <div className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-dashed border-rf-slate p-5">
              <span className="font-mono text-[11px] tracking-[0.08em] text-rf-slate">NEXT · FROM {locked.fromName?.toUpperCase() ?? "A PAUSED GROUP"}</span>
              <span className="text-base leading-[1.3] font-semibold">A rule from {locked.fromName ?? "a paused group"}</span>
              <span className="text-sm leading-[1.45] text-rf-slate">Mark {locked.fromName ?? "it"} as fraud and Ringfence writes a rule from it, tests it against 200 disguised copies, and asks you here.</span>
              <Link href={`/review?${q}&case=${encodeURIComponent(locked.fromCase!)}`} className="text-sm font-medium underline">Open {locked.fromName ?? "the group"} →</Link>
            </div>
          )}
        </aside>

        <section className="flex min-w-0 flex-[999_1_600px] flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-2">
              <span className="font-mono text-xs tracking-[0.08em] text-rf-slate">{v.kicker}</span>
              <h2 className="text-[32px] leading-[1.15] font-semibold tracking-[-0.03em]">{v.name}</h2>
              <p className="max-w-[60ch] text-[17px] leading-normal">{v.plain}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {s === "on" || s === "off" ? (
                <>
                  <button type="button" role="switch" aria-checked={s === "on"} aria-label={`${v.name} is ${s}`}
                    onClick={() => (s === "on" ? setConfirming(rule) : setRule(rule, "on"))}
                    className="inline-flex min-h-11 items-center gap-3 rounded-full border border-rf-hairline bg-rf-white py-1.5 pr-2 pl-4 text-rf-ink">
                    <span className="text-sm font-medium whitespace-nowrap">{STATUS_TEXT[s]}</span>
                    <span aria-hidden="true" className={`relative h-6.5 w-11 flex-none rounded-full border-[1.5px] border-rf-ink ${s === "on" ? "bg-rf-ink" : "bg-rf-white"}`}>
                      <span className={`absolute top-0.5 size-4.75 rounded-full transition-[left] ${s === "on" ? "left-5 bg-rf-white" : "left-0.5 bg-rf-ink"}`} />
                    </span>
                  </button>
                  <span className="text-[13px] whitespace-nowrap text-rf-slate">Changes apply from the next run · {nextRun}</span>
                </>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-rf-hairline px-3.5 py-2 text-sm font-medium">
                  <span className="size-2 rounded-full border-[1.5px] border-rf-ink bg-rf-white" />{STATUS_TEXT[s]}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {v.chips.map((c) => <span key={c} className="rounded-full bg-rf-mist px-3 py-1.5 font-mono text-xs tracking-[0.04em]">{c}</span>)}
          </div>

          {(s === "waiting" || s === "queued") && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border-[1.5px] border-rf-ink p-6">
              <div className="flex flex-[1_1_280px] flex-col gap-1">
                <span className="text-lg font-semibold">{s === "queued" ? "Decide on version 1 first" : "Turn this rule on?"}</span>
                <span className="text-sm leading-[1.45] text-rf-slate">
                  {s === "queued"
                    ? "Version 2 builds on Referral bursts. Turn version 1 on or keep it off, and this one is yours to decide."
                    : "It starts with the next payout run. Every payout it pauses comes to you first, so nothing is lost if it's wrong. You can switch it off later."}
                </span>
              </div>
              {s === "waiting" && (
                <div className="flex flex-wrap gap-2">
                  <DecideButtons size="lg" allowLabel="Keep off" stopLabel="Turn on" onAllow={() => setRule(rule, "off")} onStop={() => turnOn(rule)} />
                </div>
              )}
            </div>
          )}

          {changed && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rf-ink px-5 py-4 text-rf-white">
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">{s === "on" ? "Turned on. It runs from the next payout run." : "Turned off. It won't pause anything from the next run."}</span>
                <span className="text-sm text-rf-hairline">
                  {s === "on" ? "Payouts it pauses will show up in Decisions. Use the switch to turn it off at any time." : "Payouts it already paused stay in Decisions until you decide them. Use the switch to turn it back on."}
                </span>
              </div>
              <button type="button" onClick={() => setRule(rule, undefined)} className="min-h-10 rounded-full border border-rf-white px-4 text-sm">Undo</button>
            </div>
          )}

          <div className="flex flex-col gap-4 rounded-[20px] border border-rf-hairline p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">{s === "on" && v.simulated ? v.effectLabel.replace(", IF ON", "") : v.effectLabel}</div>
              {v.simulated && <span className="rounded-full border border-dashed border-rf-slate px-2 py-0.5 font-mono text-[11px] tracking-[0.06em] text-rf-slate">SIMULATED</span>}
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
              {v.stats.map((st) => (
                <div key={st.label} className="flex flex-col gap-1 rounded-[14px] bg-rf-mist p-4">
                  <span className="text-[32px] leading-[1.1] font-semibold tracking-[-0.03em]">{st.n}</span>
                  <span className="text-sm leading-[1.4] text-rf-slate">{st.label}</span>
                </div>
              ))}
            </div>
            {v.sample.length > 0 && (
              <div className="flex flex-col">
                <div className="pb-2 text-sm font-medium">{v.sampleLabel}</div>
                {v.sample.map((a) => (
                  <div key={a.a} className="flex flex-wrap justify-between gap-x-4 gap-y-2 border-t border-rf-hairline py-3 font-mono text-[13px]">
                    <span>{a.a}</span><span className="text-rf-slate">{a.b}</span><span className="text-rf-slate">{a.c}</span><span>{a.tag}</span>
                  </div>
                ))}
              </div>
            )}
            {v.footnote && <p className="text-xs leading-normal text-rf-slate">{v.footnote}</p>}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
            <div className="flex flex-col gap-4 rounded-[20px] bg-rf-mist p-6">
              <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">{rule.key === "starter" ? "PRACTICE RUN" : "RED TEAM"}</div>
              <div className="text-[17px] leading-[1.35] font-semibold">{v.testHead}</div>
              <div role="img" aria-label={v.testHead} className="h-3.5 overflow-hidden rounded-full border border-rf-hairline bg-rf-white">
                <div className="h-full bg-rf-ink" style={{ width: `${v.testPct}%` }} />
              </div>
              <div className="text-sm leading-[1.45] text-rf-slate">{v.testNote}</div>
            </div>
            <div className="flex flex-col gap-4 rounded-[20px] bg-rf-mist p-6">
              <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">WHERE IT CAME FROM</div>
              {origin.map((o) => (
                <div key={o.k} className="flex flex-col gap-0.5">
                  <span className="text-[13px] text-rf-slate">{o.k}</span>
                  <span className="text-[15px]">{o.v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <dialog ref={dialog} onClose={() => setConfirming(undefined)} aria-labelledby="rf-off-title"
        className="m-auto w-full max-w-120 rounded-[20px] bg-rf-white p-7 text-rf-ink shadow-[0_24px_64px_rgba(17,17,20,0.28)] backdrop:bg-rf-ink/55">
        {confirming && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs tracking-[0.08em] text-rf-slate">{views[confirming.key]!.kicker}</span>
              <h2 id="rf-off-title" className="text-2xl leading-[1.25] font-semibold tracking-[-0.02em]">Turn off {confirming.key === "starter" ? "the starter rule" : views[confirming.key]!.name}?</h2>
              <p className="text-[15px] leading-normal text-rf-slate">{views[confirming.key]!.offWarn}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DecideButtons size="lg" allowLabel="Turn off anyway" stopLabel="Keep it on" onAllow={() => { setRule(confirming, "off"); setConfirming(undefined); }} onStop={() => setConfirming(undefined)} />
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
