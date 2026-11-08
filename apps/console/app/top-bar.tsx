"use client";

// The one header every page shares (the designer's prototype, ~/Downloads/ringfence-dashboard.html):
// logo, the main nav, the program line, and the demo's "today" date, whose arrows step through the
// demo weeks (replacing each page's own week buttons). It reads the week from the URL, so it lives
// in the root layout inside <Suspense>.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { decisionKey, pendingRules, useDemo, weekKey } from "./demo-store";

const NAV = [
  { href: "/", label: "Overview", match: (p: string) => p === "/", count: undefined },
  { href: "/review", label: "Decisions", match: (p: string) => p.startsWith("/review") || p === "/survey-app", count: "cases" },
  { href: "/rules", label: "Learned rules", match: (p: string) => p.startsWith("/rules"), count: "rules" },
  // Not in the designer's prototype: the AG Studio dashboard across every run, kept in the nav so it's easy to find.
  { href: "/insights", label: "Insights", match: (p: string) => p.startsWith("/insights"), count: undefined },
] as const;

// The demo's five weeks (?week=0-4), labelled with the payout-run week the pages themselves name
// ("Payout run · Week 45"), what happens in each, and "today": the Tuesday after that week's run.
const WEEKS = [
  { label: "44", story: "Before Ringfence", today: "TUE 27 OCT" },
  { label: "45", story: "Group 12 appears", today: "TUE 3 NOV" },
  { label: "46", story: "Review, and the wider rule", today: "TUE 10 NOV" },
  { label: "47", story: "Group 12 comes back", today: "TUE 17 NOV" },
  { label: "48", story: "The survey app", today: "TUE 24 NOV" },
];

/** Dark mode, tucked into the account menu so it stays out of the demo's way. Light is the default. */
function AccountMenu() {
  const menu = useRef<HTMLDetailsElement>(null);
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  const toggle = () => {
    const next = !dark;
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("rf-theme", next ? "dark" : "light");
    } catch {
      // Private window or blocked storage: the choice still applies until the page reloads.
    }
    setDark(next);
    if (menu.current) menu.current.open = false;
  };
  return (
    <details ref={menu} className="relative">
      {/* Rina, BudgetApp's investigator: the same person who confirms rings and approves rules in the API's tests. */}
      <summary title="Signed in as Rina" className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm hover:bg-rf-mist [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full bg-rf-mist text-[13px] font-semibold">R</span>
        Rina
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-rf-hairline bg-rf-white p-1 shadow-[0_8px_24px_rgba(17,17,20,0.12)]">
        <button type="button" role="switch" aria-checked={dark} onClick={toggle} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-rf-mist">
          Dark mode
          <span aria-hidden="true" className={`relative h-5 w-9 rounded-full border-[1.5px] border-rf-ink ${dark ? "bg-rf-ink" : "bg-rf-white"}`}>
            <span className={`absolute top-px size-3.75 rounded-full transition-[left] ${dark ? "left-4.25 bg-rf-white" : "left-px bg-rf-ink"}`} />
          </span>
        </button>
      </div>
    </details>
  );
}

export function Logo() {
  return (
    <svg aria-hidden="true" width={24} height={24} viewBox="0 0 24 24">
      <path d="M4 12L12 4L20 12L12 20Z" fill="none" stroke="var(--rf-ink)" strokeWidth={1.5} />
      <circle cx={4} cy={12} r={2.5} fill="var(--rf-ink)" />
      <circle cx={12} cy={4} r={2.5} fill="var(--rf-ink)" />
      <circle cx={20} cy={12} r={2.5} fill="var(--rf-ink)" />
      <circle cx={12} cy={20} r={3.5} fill="var(--rf-spark)" />
    </svg>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const params = useSearchParams();
  const week = Number(params.get("week") ?? "1");
  const adjusted = params.get("adjusted") === "1" ? "&adjusted=1" : "";
  // A ring's own page (/review/R-01) only exists for some weeks, so switching week from one goes to
  // that week's Decisions instead.
  const weekPath = /^\/review\/(?!calendar)[^/]+$/.test(pathname) ? "/review" : pathname;
  // The nav's counts: cases still to decide in this week's run, and learned rules waiting for you.
  const { store, index } = useDemo();
  const idx = index[weekKey(week, adjusted !== "")] ?? index[weekKey(1, false)]!;
  const counts = {
    cases: idx.caseIds.filter((id) => !store.dec[decisionKey(idx.runId, id)]).length,
    rules: pendingRules(idx, store).length,
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-rf-hairline bg-rf-white px-8 py-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
        <Link href={`/?week=${week}${adjusted}`} className="flex items-center gap-2 text-[20px] font-semibold tracking-[-0.04em] text-rf-ink no-underline">
          <Logo />
          ringfence
        </Link>
        <nav aria-label="Main" className="flex flex-wrap gap-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={`${item.href}?week=${week}${adjusted}`}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-[15px] ${active ? "bg-rf-ink text-rf-white" : "text-rf-ink hover:bg-rf-mist"}`}
              >
                {item.label}
                {item.count && (
                  <span className={`rounded-full px-2 py-1 font-mono text-xs leading-none ${active ? "bg-rf-white text-rf-ink" : "bg-rf-mist"}`}>{counts[item.count]}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Hidden when the header gets tight: the week buttons already say where the demo is. */}
        <span className="font-mono text-xs tracking-[0.06em] text-rf-slate max-[1360px]:hidden">
          {week === 4 ? "SURVEY APP" : "BUDGETAPP"} · TODAY {(WEEKS[week] ?? WEEKS[1]!).today}
        </span>
        <nav aria-label="Demo week" className="flex items-center gap-0.5 rounded-full border border-rf-hairline p-1">
          <span className="px-2 font-mono text-[11px] tracking-[0.08em] text-rf-slate">WEEK</span>
          {WEEKS.map((w, i) => (
            <Link
              key={w.label}
              href={`${weekPath}?week=${i}${adjusted}`}
              title={`Week ${w.label} · ${w.story}`}
              aria-label={`Week ${w.label}: ${w.story}`}
              aria-current={week === i ? "page" : undefined}
              className={`flex h-7 min-w-8 items-center justify-center rounded-full px-1.5 font-mono text-xs ${week === i ? "bg-rf-ink text-rf-white" : "text-rf-ink hover:bg-rf-mist"}`}
            >
              {w.label}
            </Link>
          ))}
        </nav>
        <AccountMenu />
      </div>
    </header>
  );
}
