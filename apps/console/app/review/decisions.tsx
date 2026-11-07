"use client";

// Decisions (the designer's second screen): every case once, under To decide until it's answered,
// then under Decided with what happened to the money. Same decisions as the Overview and the top
// bar's counts (demo-store.tsx); the accounts table is AG Grid (accounts-grid.tsx).
import Link from "next/link";
import { useState } from "react";
import type { DemoData } from "@/lib/demo";
import { EXAMPLE_HISTORY, historyStats, liveRow, type HistoryRow } from "@/lib/history";
import { decisionKey, useDemo, type DemoCase, type DemoMember } from "../demo-store";
import { DecideButtons, Glyph, VerdictCapsule, shortDate, usd } from "../overview";
import { AccountsGrid, type AccountRow } from "./accounts-grid";
import { LinkedCard } from "./linked-card";
import { WhenCard } from "./when-card";

type Tab = "all" | "paused" | "second";
const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: "all", label: "All", hint: "Ringfence's read first. Paused payouts wait for you; paid ones are worth a second look." },
  { key: "paused", label: "Paused", hint: "We paused these payouts. Tell us if any are real members, so they get paid." },
  { key: "second", label: "Paid, second look", hint: "We paid these, but they share a link with a paused group. Tell us if any should have been paused." },
];
const ROWS_SHOWN = 6;

// Sign-up times in the team's own time zone (UTC+7), as the designer shows them: "Fri 30 Oct" / "10:09".
const signedUp = (iso: string): [string, string] => {
  const d = new Date(iso);
  const tz = "Asia/Jakarta";
  return [
    d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz }).replace(",", ""),
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }),
  ];
};

function Chip({ on, onClick, children, size = "sm" }: { on: boolean; onClick: () => void; children: React.ReactNode; size?: "sm" | "md" }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`whitespace-nowrap rounded-full border ${size === "sm" ? "min-h-8 px-3 text-[13px]" : "min-h-9 px-3.5 text-sm"} ${on ? "border-rf-ink bg-rf-ink text-rf-white" : "border-rf-hairline bg-rf-white text-rf-ink hover:bg-rf-mist"}`}>
      {children}
    </button>
  );
}

export function Decisions({ data, initialCase, initialTab }: { data: DemoData; initialCase?: string; initialTab?: string }) {
  const { store, decide, toggleRelease } = useDemo();
  const [mode, setMode] = useState<"open" | "done">(initialTab === "decided" ? "done" : "open");
  const [tab, setTab] = useState<Tab>("all");
  const [sel, setSel] = useState<string | undefined>(initialCase);
  const [showAll, setShowAll] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "group" | "second" | "over">("all");
  const q = `week=${data.week}${data.adjusted ? "&adjusted=1" : ""}`;
  const decided = (c: DemoCase) => store.dec[decisionKey(data.runId, c.id)];
  const relKey = (c: DemoCase, itemId: string) => `${data.runId}:${c.id}:${itemId}`;

  // Ringfence's read first (likely fraud, then likely real), paused groups before second looks.
  const ordered = [...data.cases].sort((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === "fraud" ? -1 : 1) || (a.kind === b.kind ? 0 : a.kind === "group" ? -1 : 1));
  const ofTab = (t: Tab) => ordered.filter((c) => t === "all" || (t === "paused" ? c.kind === "group" : c.kind === "second"));
  const openOf = (t: Tab) => ofTab(t).filter((c) => !decided(c));
  const selected = ordered.find((c) => c.id === sel) ?? openOf(tab)[0] ?? ofTab(tab)[0];
  // A decided case leaves To decide, except while it's the one open on the right (so Undo works).
  const items = ofTab(tab).filter((c) => !decided(c) || c.id === selected?.id);
  const pick = (id: string) => { setSel(id); setShowAll(false); };

  const live: HistoryRow[] = ordered.filter((c) => decided(c)).map((c) => ({ ...liveRow(c, decided(c)!, data.runName) }));
  const history = [...live, ...EXAMPLE_HISTORY];
  const stats = historyStats(history);
  const filters = [
    { key: "all" as const, label: `All · ${history.length}`, test: () => true },
    { key: "group" as const, label: "Paused groups", test: (r: HistoryRow) => r.kind === "group" },
    { key: "second" as const, label: "Paid, second look", test: (r: HistoryRow) => r.kind === "second" },
    { key: "over" as const, label: "Overruled only", test: (r: HistoryRow) => !r.agreed },
  ];
  const shownHistory = history.filter(filters.find((f) => f.key === historyFilter)!.test);

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-8 px-8 pt-12 pb-20 max-[720px]:px-4">
      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">{data.kicker}</div>
        <h1 className="text-[48px] leading-[1.05] font-semibold tracking-[-0.035em] max-[720px]:text-[36px]">Decisions</h1>
        <p className="max-w-[60ch] text-[17px] leading-[1.55] text-rf-slate">
          Every case Ringfence raises lives here, once. It stays under To decide until you act, then moves to Decided with what you chose and what happened to the money.
        </p>
      </section>

      <div role="tablist" aria-label="Case status" className="flex gap-8 border-b border-rf-hairline">
        {([["open", "To decide", openOf("all").length], ["done", "Decided", history.length]] as const).map(([key, label, n]) => (
          <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key)}
            className={`-mb-px flex min-h-12 items-baseline gap-2 border-b-2 pb-3 text-[20px] leading-[1.3] ${mode === key ? "border-rf-ink font-semibold text-rf-ink" : "border-transparent font-medium text-rf-slate"}`}>
            {label} <span className="font-mono text-sm font-normal text-rf-slate">{n}</span>
          </button>
        ))}
      </div>

      {mode === "open" ? (
        <>
          <aside aria-label="About this demo" className="flex items-start gap-3 rounded-2xl bg-rf-mist px-5 py-4">
            <Glyph d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01" size={20} className="mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs tracking-[0.08em] text-rf-slate">ABOUT THIS DEMO</span>
              <span className="text-sm leading-normal">
                Ringfence has run BudgetApp&apos;s payouts since Week 42. Rows marked{" "}
                <span className="rounded-[5px] border border-dashed border-rf-slate px-1.5 py-0.5 font-mono text-[11px] tracking-[0.06em] text-rf-slate">EXAMPLE</span>{" "}
                under Decided are made-up decisions by Rina&apos;s team from Weeks 42–44, to show how history looks. Decide a case under To decide and it moves there, with a Reopen link.
              </span>
              {data.note && <span className="text-sm leading-normal text-rf-slate">{data.note}</span>}
            </div>
          </aside>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
                {TABS.map((t) => <Chip key={t.key} on={tab === t.key} onClick={() => { setTab(t.key); setSel(undefined); }}>{t.label} · {openOf(t.key).length}</Chip>)}
              </div>
              <span className="text-sm leading-[1.45] text-rf-slate">
                {ofTab(tab).length > 0 && ofTab(tab).every(decided) ? "Nothing left to decide here. Your choices are under Decided, where you can reopen any of them." : TABS.find((t) => t.key === tab)!.hint}
              </span>
              <Link href={`/review/calendar?${q}`} className="ml-auto text-sm font-medium text-rf-slate hover:text-rf-ink">Deadlines on the hold calendar →</Link>
            </div>

            {ordered.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-rf-slate p-6 text-[15px] text-rf-slate">Nothing to decide in this run: Ringfence paused nothing.</div>
            ) : (
              <div className="flex flex-wrap items-start gap-6">
                <aside className="flex max-w-95 flex-[1_1_300px] flex-col gap-3">
                  {items.map((c) => <CaseCard key={c.id} c={c} on={c.id === selected?.id} verdict={decided(c)} onPick={() => pick(c.id)} />)}
                </aside>
                {selected && (
                  <CaseDetail
                    key={selected.id} c={selected} data={data} verdict={decided(selected)} showAll={showAll} onShowAll={() => setShowAll(true)}
                    released={(itemId) => Boolean(store.rel[relKey(selected, itemId)])}
                    onToggle={(itemId) => toggleRelease(relKey(selected, itemId))}
                    onDecide={(v) => decide(data.runId, selected, v, { decided: `/review?${q}&tab=decided`, rule: v === "fraud" && data.rules.some((r) => r.fromCase === selected.id) ? `/rules?${q}` : undefined })}
                  />
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {[
              { label: "Decided", value: String(stats.decided), note: `Across ${stats.runs} payout runs` },
              { label: "You agreed with Ringfence", value: `${stats.agreed} of ${stats.decided}`, note: `${stats.overruled} overruled · this is Ringfence's accuracy record` },
              { label: "Kept from confirmed fraud", value: usd(stats.kept), note: "Never paid out" },
              { label: "Recovered", value: usd(stats.recovered), note: "Cancelled while still unclaimed" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1 rounded-[20px] bg-rf-mist px-6 py-5">
                <span className="text-sm text-rf-slate">{s.label}</span>
                <span className="text-[32px] leading-[1.1] font-semibold tracking-[-0.03em]">{s.value}</span>
                <span className="text-[13px] leading-[1.4] text-rf-slate">{s.note}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm text-rf-slate">Show</span>
            {filters.map((f) => <Chip key={f.key} size="md" on={historyFilter === f.key} onClick={() => setHistoryFilter(f.key)}>{f.label}</Chip>)}
          </div>
          <HistoryTable rows={shownHistory} onReopen={(caseId) => { const c = data.cases.find((x) => x.id === caseId); if (c) decide(data.runId, c, undefined); }} />
        </div>
      )}
    </main>
  );
}

function CaseCard({ c, on, verdict, onPick }: { c: DemoCase; on: boolean; verdict?: "fraud" | "real"; onPick: () => void }) {
  const [idLabel, amountLabel] = c.kind === "group" ? [c.label, usd(c.usd)] : [c.label.replace("SECOND LOOK · ", ""), `${usd(c.usd)} sent`];
  const due = c.kind === "group" ? `Decide by ${shortDate(c.dueAt!)}` : c.moneyNote ?? "Already paid";
  return (
    <button type="button" onClick={onPick} aria-pressed={on}
      className={`flex w-full flex-col gap-3 rounded-2xl bg-rf-white p-5 text-left text-rf-ink ${on ? "border-[1.5px] border-rf-ink" : "border border-rf-hairline hover:border-rf-slate"}`}>
      <span className="flex w-full items-center justify-between gap-3">
        {verdict
          ? <span className="inline-flex h-6 items-center rounded-full bg-rf-mist px-2.5 text-xs leading-none font-semibold">{verdict === "fraud" ? "Marked fraud" : "Not fraud"}</span>
          : <VerdictCapsule verdict={c.verdict} small />}
        <span className="font-mono text-[11px] leading-none tracking-[0.08em] whitespace-nowrap text-rf-slate">{idLabel}</span>
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-base leading-[1.3] font-semibold">{c.title}</span>
        <span className="text-sm leading-[1.4] text-rf-slate">{c.facts.map((f) => f.text).join(" · ")}</span>
      </span>
      <span className="flex w-full items-baseline justify-between gap-3 border-t border-rf-hairline pt-3">
        <span className="font-mono text-[13px] leading-[1.2] whitespace-nowrap">{amountLabel}</span>
        <span className="text-xs leading-[1.2] whitespace-nowrap text-rf-slate">{due}</span>
      </span>
    </button>
  );
}

function CaseDetail({ c, data, verdict, showAll, onShowAll, released, onToggle, onDecide }: {
  c: DemoCase; data: DemoData; verdict?: "fraud" | "real"; showAll: boolean; onShowAll: () => void;
  released: (itemId: string) => boolean; onToggle: (itemId: string) => void; onDecide: (v: "fraud" | "real" | undefined) => void;
}) {
  const group = c.kind === "group";
  const releasedUsd = c.members.filter((m) => released(m.itemId)).reduce((sum, m) => sum + m.usd, 0);
  const releasedN = c.members.filter((m) => released(m.itemId)).length;
  const who = c.name ?? "This group";
  const wroteRule = data.rules.some((r) => r.fromCase === c.id);
  const status = !verdict
    ? { text: `Paused · ${usd(c.usd - releasedUsd)} (${c.size - releasedN} of ${c.size})`, look: "bg-rf-spark-wash text-rf-spark-text", dot: "bg-rf-spark" }
    : verdict === "fraud"
      ? { text: `Fraud · ${usd(c.usd - releasedUsd)} kept${releasedN ? ` (${releasedN} released)` : ""}`, look: "bg-rf-ink text-rf-white", dot: "bg-rf-white" }
      : { text: `Not fraud · ${usd(c.usd)} sent`, look: "bg-rf-mist text-rf-ink", dot: "bg-rf-ink" };
  const done: [string, string] | undefined = !verdict ? undefined : group
    ? verdict === "fraud"
      ? [`Marked as fraud. ${who}'s devices and payout emails are paused on sight from now on.`, wroteRule ? "Ringfence wrote a rule from this group and tested it against 200 disguised copies. It's waiting for you under Learned rules." : "If Ringfence learns a rule from this group, it will wait for you under Learned rules."]
      : [`Released. ${c.size} payouts (${usd(c.usd)}) sent through PayPal in their own batch.`, "Ringfence will pause fewer groups like this."]
    : verdict === "fraud"
      ? c.recoverableUsd
        ? ["Added to Group 12. Cancelling the payouts nobody has collected yet.", `${usd(c.recoverableUsd)} will show as Recovered. These accounts and their devices are paused on sight from now on.`]
        : ["Added to a paused group.", "Their future payouts are paused. Nothing was left to recover: the money was already sent."]
      : ["Marked as real members.", "We won't flag these accounts for the same reasons again."];

  const isReleased = (m: DemoMember) => verdict === "real" || released(m.itemId);
  const memberStatus = (m: DemoMember) => (!group ? "Paid" : isReleased(m) ? "Released" : verdict === "fraud" ? "Kept unpaid" : "Paused");
  const rows: AccountRow[] = (showAll ? c.members : c.members.slice(0, ROWS_SHOWN)).map((m) => ({
    key: m.itemId, released: isReleased(m), canAct: !verdict, status: memberStatus(m),
    account: m.accountId, signedUp: signedUp(m.signupAt), device: m.deviceName ? [m.deviceName, m.device] : [m.device, ""],
    payout: m.receiver, amount: `$${m.usd.toFixed(2)}`,
  }));

  return (
    <section className="flex min-w-0 flex-[999_1_600px] flex-col gap-6">
      <div className="flex items-start justify-between gap-4 max-[960px]:flex-wrap">
        <div className="flex max-w-160 min-w-0 flex-1 flex-col gap-2">
          <span className="font-mono text-xs tracking-[0.08em] text-rf-slate">{group ? `${c.label} · ${c.size} ACCOUNTS · ${usd(c.usd)}` : c.label}</span>
          <h2 className="text-[32px] leading-[1.15] font-semibold tracking-[-0.03em]">{c.headline}</h2>
          <p className="text-base leading-normal text-rf-slate">{c.summary}</p>
        </div>
        {group && (
          <div className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium ${status.look}`}>
            <span className={`size-2 rounded-full ${status.dot}`} />{status.text}
          </div>
        )}
      </div>

      {done && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rf-ink px-5 py-4 text-rf-white">
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold">{done[0]}</span>
            <span className="text-sm text-rf-hairline">{done[1]}</span>
          </div>
          <button type="button" onClick={() => onDecide(undefined)} className="min-h-10 rounded-full border border-rf-white px-4 text-sm">Undo</button>
        </div>
      )}

      {group ? (
        <>
          <LinkedCard c={c} status={memberStatus} />
          <WhenCard c={c} today={data.today} runName={data.runName} signupsByDay={data.signupsByDay} decided={Boolean(verdict)} />
          <div className="overflow-hidden rounded-[20px] border border-rf-hairline">
            <div className="flex items-center justify-between gap-3 border-b border-rf-hairline px-5 py-4">
              <span className="text-base font-semibold">Accounts in this group</span>
              <span className="text-[13px] text-rf-slate">Release one if you know it&apos;s a real member</span>
            </div>
            <AccountsGrid rows={rows} onToggle={onToggle} showAction />
            {c.members.length > ROWS_SHOWN && !showAll && (
              <button type="button" onClick={onShowAll} className="w-full border-t border-rf-hairline px-5 py-3.5 text-left text-sm font-medium hover:bg-rf-mist">Show all {c.members.length} accounts</button>
            )}
            {c.members.some((m) => m.deviceName) && <p className="border-t border-rf-hairline px-5 py-3 text-xs text-rf-slate">Device names are examples; the ids beside them are the real device fingerprints.</p>}
          </div>
        </>
      ) : (
        <SecondLook c={c} reference={data.cases.find((x) => x.kind === "group" && x.verdict === "fraud")} />
      )}

      {!verdict && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border-[1.5px] border-rf-ink p-6">
          <div className="flex flex-[1_1_280px] flex-col gap-1">
            <span className="text-lg font-semibold">{group ? "Is this fraud?" : "Should we have paused these?"}</span>
            <span className="text-sm leading-[1.45] text-rf-slate">{c.askHint}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <DecideButtons size="lg" allowLabel="Not fraud" stopLabel="Fraud" onAllow={() => onDecide("real")} onStop={() => onDecide("fraud")} />
          </div>
        </div>
      )}
    </section>
  );
}

/** A paid second look, as the designer lays it out: the accounts in brief, and how they compare
 *  with the paused group they share a link with. */
function SecondLook({ c, reference }: { c: DemoCase; reference?: DemoCase }) {
  const byAccount = [...c.members].sort((a, b) => a.accountId.localeCompare(b.accountId, "en", { numeric: true }));
  const byTime = [...c.members].sort((a, b) => Date.parse(a.signupAt) - Date.parse(b.signupAt));
  const [d1, t1] = signedUp(byTime[0]!.signupAt);
  const [d2, t2] = signedUp(byTime.at(-1)!.signupAt);
  const pattern = (email: string) => email.replace(/\d+(?=@)/, "#");
  const samePattern = new Set(c.members.map((m) => pattern(m.receiver))).size === 1;
  const first = byAccount[0]!;
  const last = byAccount.at(-1)!;
  const each = c.members[0]!.usd;
  const facts: { k: string; v: string; example?: boolean }[] = [
    { k: "Accounts", v: c.size === 1 ? first.accountId : `${first.accountId} … ${last.accountId}` },
    { k: "Signed up", v: d1 === d2 ? `${d1}, ${t1}–${t2}` : `${d1} – ${d2}` },
    { k: "Payouts linked to", v: samePattern ? `${first.receiver.split("@")[0]} … ${last.receiver.match(/(\d+)@/)?.[1] ?? ""}@${first.receiver.split("@")[1]}` : `${c.size} different payout emails` },
    { k: "Paid", v: c.members.every((m) => m.usd === each) ? `${c.size} × $${each} = ${usd(c.usd)}, ${c.paidIn ?? "this"} run` : `${usd(c.usd)}, ${c.paidIn ?? "this"} run` },
    ...(c.moneyNote && c.paidIn !== undefined && c.recoverableUsd > 0
      ? [{ k: "Still recoverable", v: `${usd(c.recoverableUsd)} · not collected yet`, example: true }, { k: "Already collected", v: usd(c.usd - c.recoverableUsd), example: true }]
      : c.moneyNote === "Paid · all collected" ? [{ k: "Still recoverable", v: `$0 · all ${c.size} collected`, example: true }] : []),
  ];

  const compare: { tag: "MATCH" | "CLOSE" | "NO"; text: string }[] = [];
  if (reference) {
    const refName = reference.name ?? "the paused group";
    const refDevices = new Set(reference.members.map((m) => m.device));
    const sameDevices = new Set(c.members.filter((m) => refDevices.has(m.device)).map((m) => m.device)).size;
    const devices = new Set(c.members.map((m) => m.device)).size;
    const networks = new Set(c.members.map((m) => m.ipPrefix)).size;
    compare.push(sameDevices
      ? { tag: "MATCH", text: `Same ${sameDevices} device${sameDevices === 1 ? "" : "s"} as ${refName}` }
      : { tag: "NO", text: `${devices} different devices${networks > 1 ? ` on ${networks} different networks` : ""}` });
    const refReferrers = new Set(reference.members.map((m) => m.referrer));
    const referrers = new Set(c.members.map((m) => m.referrer));
    compare.push([...referrers].every((r) => refReferrers.has(r))
      ? { tag: "MATCH", text: `Same referrer, ${[...referrers][0]}` }
      : referrers.size === 1 ? { tag: "CLOSE", text: `One shared referrer, a regular member, not ${refName}'s` } : { tag: "NO", text: "Different referrers" });
    const refPatterns = new Set(reference.members.map((m) => pattern(m.receiver)));
    if (samePattern && refPatterns.has(pattern(c.members[0]!.receiver))) compare.push({ tag: "MATCH", text: `Same numbered payout emails as ${refName}` });
    const quickAndQuiet = c.members.every((m) => m.onboardingSeconds < 120 && m.activity === 0);
    const secs = c.members.map((m) => m.onboardingSeconds);
    compare.push(quickAndQuiet
      ? { tag: "MATCH", text: "Each finished sign-up in under 2 minutes, then did nothing" }
      : { tag: "NO", text: `Took ${Math.min(...secs)}–${Math.max(...secs)} seconds to sign up, then kept using the app` });
  }
  const TAG = { MATCH: "bg-rf-ink text-rf-white", CLOSE: "bg-rf-hairline text-rf-ink", NO: "bg-rf-white text-rf-slate" };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
      <div className="flex flex-col gap-4 rounded-[20px] border border-rf-hairline p-6">
        <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">THE ACCOUNTS</div>
        {facts.map((f) => (
          <div key={f.k} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[13px] text-rf-slate">
              {f.k}
              {f.example && <span className="rounded-md border border-dashed border-rf-slate px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-[0.08em]">EXAMPLE</span>}
            </span>
            <span className="font-mono text-sm">{f.v}</span>
          </div>
        ))}
      </div>
      {reference && (
        <div className="flex flex-col gap-4 rounded-[20px] bg-rf-mist p-6">
          <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">COMPARED WITH {(reference.name ?? "the paused group").toUpperCase()}</div>
          {compare.map((x) => (
            <div key={x.text} className="flex items-start gap-3">
              <span className={`w-14 flex-none rounded-full py-0.75 text-center font-mono text-[11px] tracking-[0.06em] ${TAG[x.tag]}`}>{x.tag}</span>
              <span className="text-[15px] leading-[1.45]">{x.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CHIP = {
  done: "bg-rf-ink text-rf-white border border-rf-ink",
  waiting: "bg-rf-white text-rf-ink border border-rf-hairline",
  neutral: "bg-rf-mist text-rf-ink",
};
const DOT = { done: "bg-rf-white", waiting: "bg-rf-white border-[1.5px] border-rf-ink", neutral: "bg-rf-ink" };
const COLS = "grid-cols-[minmax(220px,1.4fr)_96px_128px_minmax(200px,1fr)_150px_220px]";

function HistoryTable({ rows, onReopen }: { rows: HistoryRow[]; onReopen: (caseId: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-[20px] border border-rf-hairline">
      <div className="min-w-270">
        <div className={`grid ${COLS} gap-4 bg-rf-mist px-6 py-3 text-xs leading-[1.3] text-rf-slate`}>
          <span>Case</span><span>Payout run</span><span>Ringfence said</span><span>You decided</span><span>Decided by</span><span>What happened to the money</span>
        </div>
        {rows.length === 0 && <div className="border-t border-rf-hairline px-6 py-8 text-[15px] text-rf-slate">Nothing matches this filter yet.</div>}
        {rows.map((r, i) => (
          <div key={`${r.title}-${i}`} className={`grid ${COLS} min-h-18 items-center gap-4 border-t border-rf-hairline px-6 py-4`}>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] leading-[1.3] font-semibold">{r.title}</span>
                {r.example && <span className="rounded-md border border-dashed border-rf-slate px-1.5 py-1 font-mono text-[10px] leading-none tracking-[0.08em] text-rf-slate">EXAMPLE</span>}
              </span>
              <span className="text-[13px] leading-[1.4] text-rf-slate">{r.sub}</span>
            </div>
            <span className="font-mono text-[13px]">{r.run}</span>
            <span className="justify-self-start"><VerdictCapsule verdict={r.read} small /></span>
            <div className="flex flex-col items-start gap-1">
              <span className="text-sm leading-[1.4] font-medium">{r.decision}</span>
              <span className="flex items-center gap-2">
                {!r.agreed && <span className="rounded-md bg-rf-mist px-1.5 py-1 font-mono text-[10px] leading-none tracking-[0.08em]">OVERRULED RINGFENCE</span>}
                {r.caseId && <button type="button" onClick={() => onReopen(r.caseId!)} className="text-xs underline">Reopen</button>}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] leading-[1.3]">{r.by}</span>
              <span className="text-xs leading-[1.3] text-rf-slate">{r.when}</span>
            </div>
            <span className={`inline-flex h-7 items-center gap-2 justify-self-start whitespace-nowrap rounded-full px-3 text-[13px] leading-none font-medium ${CHIP[r.chip]}`}>
              <span className={`size-2 rounded-full ${DOT[r.chip]}`} />{r.money}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
