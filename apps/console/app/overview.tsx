"use client";

// The Overview (the designer's first screen): this run's split, everything that needs a decision
// soonest-first, and the program's record. Decisions made here are the same ones the Decisions page
// and the top bar's counts read (demo-store.tsx).
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DemoData } from "@/lib/demo";
import { EXAMPLE_HISTORY, historyStats, liveRow } from "@/lib/history";
import { decisionKey, pendingRules, useDemo, type DemoCase, type DemoRule, type IconKey } from "./demo-store";
import { SurveyAppScreen } from "./review/survey-app-screen";

const ICON: Record<IconKey, string> = {
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  device: "M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  active: "M3 12h4l3-8 4 16 3-8h4",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};
const CHECK = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.5l2.5 2.5 4.5-5";
const PAUSE = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 9v6M14 9v6";

export function Glyph({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={`flex-none ${className}`}>
      <path d={d} />
    </svg>
  );
}

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");
const daysFrom = (today: string, iso: string) => Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(today)) / 86_400_000);
const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : n > 1 ? `in ${n} days` : `${-n} day${n === -1 ? "" : "s"} ago`);

export function VerdictCapsule({ verdict, small = false }: { verdict: "fraud" | "real" | "rule"; small?: boolean }) {
  const look = verdict === "fraud" ? "border border-rf-ink bg-rf-ink text-rf-white" : verdict === "real" ? "border-[1.5px] border-rf-ink bg-rf-white text-rf-ink" : "border border-dashed border-rf-slate bg-rf-mist text-rf-ink";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full font-semibold leading-none ${small ? "h-6 px-2.5 text-xs" : "h-7 px-3 text-[13px]"} ${look}`}>
      {verdict === "fraud" ? "Likely fraud" : verdict === "real" ? "Likely real" : "New rule"}
    </span>
  );
}

export function DecideButtons({ allowLabel, stopLabel, onAllow, onStop, size = "md" }: { allowLabel: string; stopLabel: string; onAllow: () => void; onStop: () => void; size?: "md" | "lg" }) {
  const base = `inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-rf-ink font-medium ${size === "lg" ? "px-5 text-[15px]" : "min-w-32 px-4 text-sm"}`;
  return (
    <>
      <button type="button" onClick={onAllow} className={`${base} bg-rf-white text-rf-ink hover:bg-rf-mist`}><Glyph d={CHECK} />{allowLabel}</button>
      <button type="button" onClick={onStop} className={`${base} bg-rf-ink text-rf-white hover:opacity-85`}><Glyph d={PAUSE} />{stopLabel}</button>
    </>
  );
}

function FactChip({ icon, text }: { icon: IconKey; text: string }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg bg-rf-mist px-2.5 text-[13px] leading-none">
      <Glyph d={ICON[icon]} size={14} />{text}
    </span>
  );
}

type Row = {
  key: string; verdict: "fraud" | "real" | "rule"; title: string; id: string; href: string; facts: { icon: IconKey; text: string }[];
  stake: string; due: string; dueStrong: boolean; dueAlert?: boolean; allowLabel: string; stopLabel: string; onAllow: () => void; onStop: () => void; hint: string;
};

function DecisionRow(r: Row) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)_176px_296px] items-center gap-x-6 gap-y-4 rounded-[20px] border border-rf-hairline px-6 py-5 max-[960px]:grid-cols-1">
      <span className="flex"><VerdictCapsule verdict={r.verdict} /></span>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Link href={r.href} className="text-[17px] leading-[1.3] font-semibold underline decoration-rf-hairline underline-offset-4 hover:decoration-rf-ink">{r.title}</Link>
          <span className="font-mono text-xs tracking-[0.06em] text-rf-slate">{r.id}</span>
        </div>
        <div className="flex flex-wrap gap-2">{r.facts.map((f) => <FactChip key={f.text} {...f} />)}</div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-base leading-[1.2]">{r.stake}</span>
        <span className={`text-[13px] leading-[1.3] ${r.dueAlert ? "font-semibold text-rf-spark-text" : r.dueStrong ? "font-semibold text-rf-ink" : "text-rf-slate"}`}>{r.due}</span>
      </div>
      <div className="flex flex-col items-stretch gap-1.5 max-[960px]:max-w-80">
        <div className="grid grid-cols-2 gap-2"><DecideButtons allowLabel={r.allowLabel} stopLabel={r.stopLabel} onAllow={r.onAllow} onStop={r.onStop} /></div>
        <span className="text-center text-xs leading-[1.35] text-balance text-rf-slate">{r.hint}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, note, valueClass, swatch }: { label: string; value: string; note: string; valueClass: string; swatch: string }) {
  return (
    <div className="flex min-h-38 flex-col gap-2 rounded-[20px] bg-rf-mist p-6">
      <div className="flex items-center gap-2 text-sm text-rf-slate"><span className={`size-2.5 flex-none rounded-[3px] ${swatch}`} />{label}</div>
      <div className={`text-[36px] leading-[1.05] font-semibold tracking-[-0.03em] ${valueClass}`}>{value}</div>
      <div className="mt-auto text-sm leading-[1.45] text-rf-slate">{note}</div>
    </div>
  );
}

export function Overview({ data }: { data: DemoData }) {
  const router = useRouter();
  const { store, decide, setRule } = useDemo();
  const q = `week=${data.week}${data.adjusted ? "&adjusted=1" : ""}`;
  const decided = (c: DemoCase) => store.dec[decisionKey(data.runId, c.id)];
  const groups = data.cases.filter((c) => c.kind === "group");
  const fraudGroups = groups.filter((c) => c.verdict === "fraud");
  const realGroups = groups.filter((c) => c.verdict === "real");
  const sum = (cs: DemoCase[], f: (c: DemoCase) => number) => cs.reduce((a, c) => a + f(c), 0);
  const fraudN = sum(fraudGroups, (c) => c.size);
  const realN = sum(realGroups, (c) => c.size);
  const openGroups = groups.filter((c) => !decided(c)).sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!));
  const open = data.cases.filter((c) => !decided(c));
  const rules = pendingRules({ runId: data.runId, caseIds: data.cases.map((c) => c.id), rules: data.rules }, store);
  const decisionsN = open.length + rules.length;
  const soonest = openGroups[0];
  const ruleLink = `/rules?${q}`;
  const decidedLink = `/review?${q}&tab=decided`;

  // A group's name in running text, falling back to its title when it has no number.
  const named = (cs: DemoCase[]) => list(cs.map((c) => c.name ?? "1 group"));
  const decidedNote = (cs: DemoCase[]) => cs.map((c) => decided(c) ? `${cs.length > 1 && c.name ? `${c.name} ` : ""}${decided(c) === "fraud" ? "marked fraud" : "released"}` : "").filter(Boolean).join(", ");

  const order = { fraud: 0, real: 1 };
  const caseRows: Row[] = open
    .map((c) => ({ c, sort: order[c.verdict] * 10 + (c.kind === "second" ? 1 : 0) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ c }) => {
      const days = c.dueAt ? daysFrom(data.today, c.dueAt) : 0;
      return {
        key: c.id, verdict: c.verdict, id: c.label, href: `/review?${q}&case=${encodeURIComponent(c.id)}`, facts: c.facts,
        title: c.title,
        stake: `${usd(c.usd)} ${c.kind === "group" ? "paused" : "sent"}`,
        due: c.kind === "second" ? c.moneyNote ?? "" : days < 0 ? `Overdue · since ${shortDate(c.dueAt!)}` : `${c === soonest ? "Due first" : "Decide by"} · ${shortDate(c.dueAt!)}`,
        dueStrong: c === soonest || (c.kind === "second" && c.recoverableUsd > 0), dueAlert: c.kind === "group" && days < 0,
        allowLabel: "Not fraud", stopLabel: "Fraud",
        onAllow: () => decide(data.runId, c, "real", { decided: decidedLink }),
        onStop: () => decide(data.runId, c, "fraud", { decided: decidedLink, rule: data.rules.some((r) => r.fromCase === c.id) ? ruleLink : undefined }),
        hint: c.hint,
      };
    });
  const ruleRows: Row[] = rules.map((r: DemoRule) => ({
    key: r.key, verdict: "rule", id: r.name.toUpperCase(), href: ruleLink, title: "Rule ready to turn on",
    facts: r.after
      ? [{ icon: "target", text: `Closes ${r.wouldPause} saved disguises` }, { icon: "shield", text: "Builds on version 1" }, { icon: "person", text: "Learned from Group 12" }]
      : [{ icon: "target", text: `Catches ${r.wouldPause} next run` }, { icon: "shield", text: "No other rule does" }, { icon: "person", text: `Learned from ${r.fromName ?? "Group 12"}` }],
    stake: plural(r.wouldPause, "payout"), due: `Before the ${r.nextRun} run`, dueStrong: false,
    allowLabel: "Keep off", stopLabel: "Turn on",
    onAllow: () => setRule(r, "off", ruleLink),
    onStop: () => (r.onQuery ? router.push(`/?${r.onQuery}`) : setRule(r, "on", ruleLink)),
    hint: `Keep off changes nothing · Turn on pauses ${r.wouldPause} ${r.after ? "more" : "next run"}`,
  }));

  // The record: the designer's example history plus this session's decisions in this run.
  const live = data.cases.filter((c) => decided(c)).map((c) => liveRow(c, decided(c)!, data.runName));
  const stats = historyStats([...live, ...EXAMPLE_HISTORY]);
  const underReview = data.cases.find((c) => c.kind === "second" && c.verdict === "fraud" && !decided(c));
  const lostNote = stats.lost ? live.filter((r) => r.lost).map((r) => `${usd(r.lost)} from ${r.title}`).join(" · ")
    : underReview ? `${usd(underReview.usd)} paid in ${underReview.label.split("PAID ")[1]?.toLowerCase().replace("week", "Week") ?? "an earlier run"} is still under a second look` : "Nothing lost so far";

  const headline = decisionsN === 0 ? "Nothing needs you this run." : `${plural(decisionsN, "thing")} ${decisionsN === 1 ? "needs" : "need"} your decision.`;
  const soonestDays = soonest ? daysFrom(data.today, soonest.dueAt!) : 0;
  const lead = soonest
    ? soonestDays < 0 ? `The earliest is overdue: it was due ${shortDate(soonest.dueAt!)}.` : `The earliest is due ${shortDate(soonest.dueAt!)}, ${inDays(soonestDays)}.`
    : decisionsN ? "Every paused payout is decided." : groups.length || data.cases.length ? "Every case in this run is decided." : "Ringfence paused nothing in this run.";

  const segments = [
    { n: data.paid, cls: "bg-rf-ink" },
    { n: fraudN, cls: "bg-rf-spark" },
    { n: realN, cls: "border-[1.5px] border-rf-spark bg-rf-white" },
  ].filter((s) => s.n > 0);

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-12 px-8 pt-12 pb-20 max-[720px]:px-4">
      <section className="flex flex-col gap-4">
        <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">{data.kicker}</div>
        <h1 className="text-[48px] leading-[1.05] font-semibold tracking-[-0.035em] max-[720px]:text-[36px]">{headline}</h1>
        <p className="max-w-[60ch] text-[17px] leading-[1.55] text-rf-slate">{lead}</p>
        {data.note && (
          <aside aria-label="About this week" className="flex max-w-[80ch] items-start gap-3 rounded-2xl bg-rf-mist px-5 py-4">
            <Glyph d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01" size={20} className="mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs tracking-[0.08em] text-rf-slate">ABOUT THIS WEEK</span>
              <span className="text-sm leading-normal">{data.note}</span>
            </div>
          </aside>
        )}
      </section>

      <section aria-label="Where this run's payees went" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 font-mono text-xs text-rf-slate">
          <span className="tracking-[0.08em]">WHERE THIS RUN&apos;S {plural(data.payees, "payee").toUpperCase()} WENT</span>
          <span className="tracking-[0.04em]">{data.paid} + {fraudN} + {realN} = {data.payees}</span>
        </div>
        <div role="img" aria-label={`${data.paid} paid on time, ${fraudN} paused as likely fraud, ${realN} paused as likely real, out of ${data.payees} payees.`} className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          {segments.map((s, i) => <div key={i} style={{ flex: `${s.n} 1 0` }} className={`min-w-1.5 ${s.cls}`} />)}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          <StatCard label="Paid on time" value={String(data.paid)} note={`${usd(data.paidUsd)} sent through PayPal`} valueClass="text-rf-ink" swatch="bg-rf-ink" />
          <StatCard
            label={fraudGroups.length && fraudGroups.every(decided) ? "Likely fraud · decided" : "Paused · likely fraud"} value={String(fraudN)} valueClass="text-rf-spark-text" swatch="bg-rf-spark"
            note={fraudGroups.length ? `${usd(sum(fraudGroups, (c) => c.usd))} in ${named(fraudGroups)}${decidedNote(fraudGroups) ? ` · ${decidedNote(fraudGroups)}` : ""}` : "Nothing paused"}
          />
          <StatCard
            label={realGroups.length && realGroups.every(decided) ? "Likely real · decided" : "Paused · likely real"} value={String(realN)} valueClass="text-rf-ink" swatch="border-[1.5px] border-rf-spark bg-rf-white"
            note={realGroups.length ? `${usd(sum(realGroups, (c) => c.usd))} in ${named(realGroups)}${decidedNote(realGroups) ? ` · ${decidedNote(realGroups)}` : ""}` : "Nothing paused"}
          />
        </div>
        <Link href={`/control-tower?${q}`} className="self-end text-sm font-medium text-rf-slate hover:text-rf-ink">Live view of this run in the control tower →</Link>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-[22px] leading-[1.3] font-semibold tracking-[-0.02em]">Needs decision</h2>
          <span className="text-sm text-rf-slate">Ringfence&apos;s read first, soonest deadline first</span>
        </div>
        {caseRows.length + ruleRows.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-rf-slate p-6 text-[15px] text-rf-slate">
            Nothing left to decide this run.{data.cases.length > 0 && <> Your choices are listed under <Link href={decidedLink} className="text-rf-ink underline">Decisions › Decided</Link>.</>}
          </div>
        ) : (
          [...caseRows, ...ruleRows].map(({ key, ...r }) => <DecisionRow key={key} {...r} />)
        )}
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-4">
        <div className="flex flex-col gap-4 rounded-[20px] border border-rf-hairline p-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs tracking-[0.08em] text-rf-slate">YOUR RECORD SINCE WEEK 42</span>
              <span className="rounded-md border border-dashed border-rf-slate px-1.5 py-1 font-mono text-[10px] leading-none tracking-[0.08em] text-rf-slate">EXAMPLE HISTORY</span>
            </div>
            <h3 className="text-[17px] leading-[1.35] font-semibold">How Ringfence has done for BudgetApp.</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Lost to fraud", value: usd(stats.lost), note: lostNote },
              { label: "Kept from confirmed fraud", value: usd(stats.kept), note: "Never paid out" },
              { label: "Recovered", value: usd(stats.recovered), note: "Cancelled while unclaimed" },
              { label: "You agreed with Ringfence", value: `${stats.agreed} of ${stats.decided}`, note: `${plural(stats.overruled, "overruled", "overruled")}` },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1 rounded-[14px] bg-rf-mist p-4">
                <span className="text-[13px] leading-[1.3] text-rf-slate">{s.label}</span>
                <span className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em]">{s.value}</span>
                <span className="text-xs leading-[1.4] text-rf-slate">{s.note}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap justify-between gap-x-4 gap-y-2 text-sm">
            <Link href={decidedLink} className="font-medium underline">See every decision →</Link>
            <Link href="/fire-drill" className="text-rf-slate underline hover:text-rf-ink">How Ringfence does on a test program →</Link>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-[20px] border border-rf-hairline p-6">
          <div className="flex flex-col gap-2">
            <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">SEEN AT OTHER PROGRAMS</div>
            <h3 className="text-[17px] leading-[1.35] font-semibold">
              {data.network ? `${plural(data.network.accounts, "account")} here used ${data.network.source}'s devices.` : data.week === 0 ? "Nothing to share yet." : "Nothing matched at another program yet."}
            </h3>
          </div>
          <span className="text-[15px] leading-normal text-rf-slate">
            {data.network
              ? `${data.network.source} was confirmed as fraud at BudgetApp. ${plural(data.network.accounts, "account")} in this survey-app run used one of its devices, so Ringfence paused them here too.`
              : data.week === 0
                ? "Once Ringfence pauses a group and you mark it as fraud, other programs can recognise it."
                : "When you mark Group 12 as fraud, other programs on Ringfence can recognise its devices and payout emails."}
          </span>
          <span className="text-[13px] leading-[1.45] text-rf-slate">Programs share an anonymous fingerprint of each group Ringfence pauses, never member data.</span>
          {data.network && <SurveyAppScreen />}
          {(data.network || groups.some((c) => c.name === "Group 12")) && (
            <Link href={`/review?${q}&case=${encodeURIComponent(data.network ? "network:R-12" : groups.find((c) => c.name === "Group 12")!.id)}`} className="mt-auto text-[15px] font-medium underline">
              {data.network ? "Open them →" : "Open Group 12 →"}
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
