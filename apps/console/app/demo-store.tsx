"use client";

// The demo's decisions, shared by every page (Overview, Decisions, Learned rules and the top bar's
// counts) so one choice shows up everywhere, the way the designer's prototype keeps one store.
// Nothing here reaches the API: like the week stepper, it is walkthrough state, and it lives only
// until the tab is closed or reloaded.
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type Verdict = "fraud" | "real";
export type IconKey = "person" | "device" | "clock" | "active" | "shield" | "target";

export interface DemoMember {
  itemId: string;
  accountId: string;
  signupAt: string;
  device: string;
  /** The designer's example device name ("Android phone"), when one exists for this device. */
  deviceName?: string;
  receiver: string;
  usd: number;
}

export interface DemoCase {
  /** Stable within a run: "R-12", "P-01", "rule:R-01", "network:R-12", "second:w44"... */
  id: string;
  kind: "group" | "second";
  /** Small mono label beside the title, e.g. "GROUP 12" or "SECOND LOOK · PAID WEEK 44". */
  label: string;
  /** "Group 12" in running text; undefined for a group with no number. */
  name?: string;
  title: string;
  verdict: Verdict;
  facts: { icon: IconKey; text: string }[];
  size: number;
  usd: number;
  /** Groups only: when the hold's 7 days run out. */
  dueAt?: string;
  /** Second looks only: the money line under the amount, e.g. "$80 still recoverable". */
  moneyNote?: string;
  /** What Fraud can still claw back from a payout already sent (second looks). */
  recoverableUsd: number;
  hint: string;
  /** The Decisions page's detail: a fuller title, Ringfence's read in a sentence, what each answer does. */
  headline: string;
  summary: string;
  askHint: string;
  members: DemoMember[];
}

export interface DemoRule {
  key: string;
  name: string;
  /** The case whose Fraud decision writes this rule; until then it doesn't exist. */
  fromCase?: string;
  fromName?: string;
  /** A later version waits for this rule's decision first. */
  after?: string;
  base: "waiting" | "on" | "off";
  wouldPause: number;
  nextRun: string;
  /** Turning it on is real walkthrough state in the URL (week 2's accepted revision): the query to go to. */
  onQuery?: string;
}

export interface DemoWeekIndex {
  runId: string;
  caseIds: string[];
  rules: DemoRule[];
}

type Store = {
  dec: Record<string, Verdict>;
  rules: Record<string, "on" | "off">;
  /** Single accounts released out of a paused group, keyed `${runId}:${caseId}:${itemId}`. */
  rel: Record<string, boolean>;
};

const DemoContext = createContext<{
  store: Store;
  index: Record<string, DemoWeekIndex>;
  decide: (runId: string, c: Pick<DemoCase, "id" | "name" | "title">, verdict: Verdict | undefined, links?: { decided: string; rule?: string }) => void;
  setRule: (rule: DemoRule, value: "on" | "off" | undefined, link?: string) => void;
  toggleRelease: (key: string) => void;
} | null>(null);

export const decisionKey = (runId: string, caseId: string) => `${runId}:${caseId}`;

/** A rule's state right now: your choice, else queued behind its earlier version, else its default. */
export function ruleStatus(rule: DemoRule, rules: DemoRule[], store: Store): "waiting" | "queued" | "on" | "off" {
  const chosen = store.rules[rule.key];
  if (chosen) return chosen;
  if (rule.after) {
    const before = rules.find((r) => r.key === rule.after);
    if (before && ["waiting", "queued"].includes(ruleStatus(before, rules, store))) return "queued";
  }
  return rule.base;
}

/** Rules that exist yet (their source case is marked as fraud) and still wait for a decision. */
export function pendingRules(week: DemoWeekIndex, store: Store): DemoRule[] {
  return week.rules.filter((r) =>
    (!r.fromCase || store.dec[decisionKey(week.runId, r.fromCase)] === "fraud") && ruleStatus(r, week.rules, store) === "waiting");
}

export function DemoProvider({ index, children }: { index: Record<string, DemoWeekIndex>; children: ReactNode }) {
  const [store, setStore] = useState<Store>({ dec: {}, rules: {}, rel: {} });
  const [toast, setToast] = useState<{ text: string; href?: string; linkLabel?: string; undo: () => void }>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((next: NonNullable<typeof toast>) => {
    setToast(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(undefined), 6000);
  }, []);

  const decide = useCallback<NonNullable<React.ContextType<typeof DemoContext>>["decide"]>((runId, c, verdict, links) => {
    const key = decisionKey(runId, c.id);
    const write = (value: Verdict | undefined) => setStore((s) => {
      const dec = { ...s.dec };
      if (value) dec[key] = value;
      else delete dec[key];
      return { ...s, dec };
    });
    write(verdict);
    if (!verdict) return;
    const who = c.name ?? c.title;
    show({
      text: `${who}: marked as ${verdict === "fraud" ? "fraud" : "not fraud"}.${verdict === "fraud" && links?.rule ? " Ringfence wrote a rule from it." : ""}`,
      href: verdict === "fraud" && links?.rule ? links.rule : links?.decided,
      linkLabel: verdict === "fraud" && links?.rule ? "See the rule" : "View in Decided",
      undo: () => write(undefined),
    });
  }, [show]);

  const setRule = useCallback<NonNullable<React.ContextType<typeof DemoContext>>["setRule"]>((rule, value, link) => {
    const write = (v: "on" | "off" | undefined) => setStore((s) => {
      const rules = { ...s.rules };
      if (v) rules[rule.key] = v;
      else delete rules[rule.key];
      return { ...s, rules };
    });
    write(value);
    if (!value) return;
    show({ text: value === "on" ? `${rule.name} is on from the next run.` : `${rule.name} kept off.`, href: link, linkLabel: "View rule", undo: () => write(undefined) });
  }, [show]);

  const toggleRelease = useCallback((key: string) => setStore((s) => ({ ...s, rel: { ...s.rel, [key]: !s.rel[key] } })), []);

  const value = useMemo(() => ({ store, index, decide, setRule, toggleRelease }), [store, index, decide, setRule, toggleRelease]);
  return (
    <DemoContext value={value}>
      {children}
      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-4 rounded-2xl bg-rf-ink py-3 pr-3 pl-5 text-sm text-rf-white shadow-[0_8px_24px_rgba(17,17,20,0.2)]">
          <span>{toast.text}</span>
          {toast.href && <Link href={toast.href} onClick={() => setToast(undefined)} className="text-rf-white underline">{toast.linkLabel}</Link>}
          <button type="button" onClick={() => { toast.undo(); setToast(undefined); }} className="min-h-9 rounded-full border border-rf-white px-3.5 text-sm">Undo</button>
        </div>
      )}
    </DemoContext>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo needs <DemoProvider> (app/layout.tsx)");
  return ctx;
}

export const weekKey = (week: number, adjusted: boolean) => `${week}${adjusted ? "a" : ""}`;
