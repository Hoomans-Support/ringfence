"use client";

// The one header every page shares (the designer's prototype, ~/Downloads/ringfence-dashboard.html):
// logo, the main nav, the program line, and the demo's "today" date, whose arrows step through the
// demo weeks (replacing each page's own week buttons). It reads the week from the URL, so it lives
// in the root layout inside <Suspense>.
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV = [
  { href: "/", label: "Overview", match: (p: string) => p === "/" },
  { href: "/review", label: "Decisions", match: (p: string) => p.startsWith("/review") || p === "/survey-app" },
  { href: "/rules", label: "Learned rules", match: (p: string) => p.startsWith("/rules") },
];

// "Today" in each demo week: the Tuesday after that week's payout run (week 1's run is Mon 2 Nov).
const TODAY = ["TUE 27 OCT", "TUE 3 NOV", "TUE 10 NOV", "TUE 17 NOV", "TUE 24 NOV"];

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
      <summary title="Signed in as Budi" className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm hover:bg-rf-mist [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full bg-rf-mist text-[13px] font-semibold">B</span>
        Budi
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
                className={`flex min-h-10 items-center rounded-full px-4 text-[15px] ${active ? "bg-rf-ink text-rf-white" : "text-rf-ink hover:bg-rf-mist"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-xs tracking-[0.06em] text-rf-slate">
          {week === 4 ? "SURVEY APP · CROSS-PROGRAM MATCH" : "BUDGETAPP · $20 REFERRAL REWARD"}
        </span>
        <nav aria-label={`Demo week ${week} of 4`} className="flex items-center font-mono text-xs tracking-[0.06em] text-rf-slate">
          {week > 0 ? (
            <Link href={`${weekPath}?week=${week - 1}${adjusted}`} aria-label="Previous week" className="flex size-7 items-center justify-center rounded-full text-rf-ink hover:bg-rf-mist">‹</Link>
          ) : <span aria-hidden="true" className="flex size-7 items-center justify-center text-rf-hairline">‹</span>}
          <span className="px-1">TODAY {TODAY[week] ?? TODAY[1]}</span>
          {week < 4 ? (
            <Link href={`${weekPath}?week=${week + 1}${adjusted}`} aria-label="Next week" className="flex size-7 items-center justify-center rounded-full text-rf-ink hover:bg-rf-mist">›</Link>
          ) : <span aria-hidden="true" className="flex size-7 items-center justify-center text-rf-hairline">›</span>}
        </nav>
        <AccountMenu />
      </div>
    </header>
  );
}
