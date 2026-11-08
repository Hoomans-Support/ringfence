"use client";

// "How they're linked": the designer's hub-and-spoke picture of one case, drawn from its real
// accounts. The hub is what ties them together (one referrer, else the most-shared device); shared
// devices sit around it with the accounts that used them; anything else hangs off the hub directly.
// Hovering a dot shows that account under the graph.
import { useState } from "react";
import type { DemoCase, DemoMember } from "../demo-store";
import { claimEvidence, deriveFindings, deviceNoun } from "@/lib/findings";

const W = 520;
const H = 360;
const CX = 260;
const CY = 172;
// Positions rounded to 0.1px so the server's HTML and the browser's render agree exactly (hydration).
const round = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number, of: number) => `${round((v / of) * 100)}%`;

type Hub = { kind: "referrer" | "device" | "none"; kicker: string; value: string; legend: string };
type Spot = { x: number; y: number };

function layout(members: DemoMember[], label: string) {
  const byDevice = new Map<string, DemoMember[]>();
  for (const m of members) byDevice.set(m.device, [...(byDevice.get(m.device) ?? []), m]);
  const shared = [...byDevice].filter(([, ms]) => ms.length > 1).sort((a, b) => b[1].length - a[1].length);
  const oneReferrer = new Set(members.map((m) => m.referrer)).size === 1 && members.length > 2;
  const top = shared[0];
  const hub: Hub = oneReferrer
    ? { kind: "referrer", kicker: "LINK · REFERRER", value: members[0]!.referrer, legend: `One referrer for all ${members.length}` }
    : top
      ? { kind: "device", kicker: `LINK · ${(top[1][0]!.deviceName ?? "DEVICE").toUpperCase()}`, value: `${top[1][0]!.deviceName ? `${top[1][0]!.deviceName} · ` : ""}${top[0]}`, legend: `One shared ${deviceNoun(top[1][0]!.deviceName)}` }
      : { kind: "none", kicker: "LINK · HOW THEY SIGNED UP", value: label, legend: "What these accounts have in common" };

  // Shared devices orbit a referrer hub; around a device hub (or none) every account hangs off the hub.
  const devices = hub.kind === "referrer" ? shared : [];
  const onDevice = new Set(devices.flatMap(([, ms]) => ms.map((m) => m.itemId)));
  const loose = members.filter((m) => !onDevice.has(m.itemId));
  const spots = new Map<string, Spot>();
  const deviceSpots = devices.map(([id, ms], i) => {
    const a = (-90 + (360 / devices.length) * i) * (Math.PI / 180);
    const at = { x: round(CX + 112 * Math.cos(a)), y: round(CY + 112 * Math.sin(a)) };
    ms.forEach((m, j) => {
      const t = a + (j - (ms.length - 1) / 2) * ((2 * Math.PI) / ms.length);
      spots.set(m.itemId, { x: round(at.x + 46 * Math.cos(t)), y: round(at.y + 46 * Math.sin(t)) });
    });
    return { id, name: ms[0]!.deviceName ?? "Device", count: ms.length, at, angle: a };
  });
  loose.forEach((m, i) => {
    const a = loose.length === 2 ? (i === 0 ? Math.PI : 0) : (-90 + (360 / loose.length) * i) * (Math.PI / 180) + (devices.length ? Math.PI / loose.length : 0);
    const r = loose.length === 2 ? 130 : devices.length ? 158 : 120;
    spots.set(m.itemId, { x: round(CX + r * Math.cos(a)), y: round(CY + r * Math.sin(a)) });
  });
  return { hub, deviceSpots, spots };
}

/** What the diagram's symbols mean, for the legend beside (or under) it. */
function legendFor(members: DemoMember[], label: string) {
  const { hub, deviceSpots } = layout(members, label);
  return [
    { look: "size-4 rounded-full bg-rf-spark", text: hub.legend },
    ...(deviceSpots.length ? [{ look: "size-3.5 rounded-[3px] border-2 border-rf-ink bg-rf-white", text: "A shared device, with the accounts that used it." }] : []),
    { look: "size-2.25 rounded-full bg-rf-ink", text: "An account. Hover for its details." },
  ];
}

// The draw-in on mount (globals.css: rf-draw grows a line from its start, rf-fade fades a mark in):
// hub first, then the spokes to each device, the devices, then each account's line and dot.
const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

function Line({ a, b, opacity, wait }: { a: Spot; b: Spot; opacity: number; wait: number }) {
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--rf-ink)" strokeWidth={1.5} opacity={opacity} pathLength={1} className="rf-draw" style={delay(wait)} />;
}

/** The hub-and-spoke graph of one group's accounts with its hover panel underneath. */
function RingDiagram({ members, label, status }: { members: DemoMember[]; label: string; status: (m: DemoMember) => string }) {
  const [hover, setHover] = useState<number | "hub">(0);
  const { hub, deviceSpots, spots } = layout(members, label);
  const hovered = hover === "hub" ? undefined : members[hover];
  const sorted = [...members].sort((a, b) => Date.parse(a.signupAt) - Date.parse(b.signupAt));
  const spanMin = Math.round((Date.parse(sorted.at(-1)!.signupAt) - Date.parse(sorted[0]!.signupAt)) / 60_000);
  const devices = new Set(members.map((m) => m.device)).size;
  const networks = new Set(members.map((m) => m.ipPrefix)).size;
  const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).replace(/^(\w+),/, "$1");
  const accountWait = (i: number) => 450 + i * 18;

  const tip = hovered
    ? { title: `Account ${hovered.accountId}`, status: status(hovered), rows: [
        ["Signed up", when(hovered.signupAt)],
        ["Payout linked to", `${hovered.receiver} · $${hovered.usd}`],
        ["Device", `${hovered.deviceName ? `${hovered.deviceName} · ` : ""}${hovered.device}`],
        ["Sign-up took", `${hovered.onboardingSeconds}s · ${hovered.activity} action${hovered.activity === 1 ? "" : "s"} after`],
      ] }
    : { title: hub.value, status: hub.kind === "referrer" ? "Shared referrer" : hub.kind === "device" ? "Shared device" : "Common pattern", rows: [
        ["Links", `${members.length} accounts${members.length > 2 ? ` in ${spanMin < 120 ? `${spanMin} minutes` : "this run"}` : ""}`],
        ["Through", deviceSpots.length ? `${deviceSpots.length} shared devices` : `${devices} device${devices === 1 ? "" : "s"}`],
        ["Networks", networks === 1 ? "One" : String(networks)],
      ] };

  return (
    <div className="flex w-full flex-col gap-3">
      <div role="img" aria-label={`${hub.legend}; ${members.length} accounts.`} className="relative aspect-13/9 w-full overflow-hidden rounded-2xl bg-rf-mist">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
          {deviceSpots.map((d, i) => <Line key={d.id} a={{ x: CX, y: CY }} b={d.at} opacity={0.9} wait={120 + i * 60} />)}
          {members.map((m, i) => {
            const at = spots.get(m.itemId)!;
            const from = deviceSpots.find((d) => d.id === m.device)?.at ?? { x: CX, y: CY };
            return <Line key={m.itemId} a={from} b={at} opacity={hover === i ? 1 : 0.3} wait={accountWait(i)} />;
          })}
        </svg>
        {deviceSpots.map((d, i) => (
          <div key={d.id}>
            <span className="rf-fade absolute size-4 -translate-1/2 rounded-sm border-2 border-rf-ink bg-rf-white" style={{ left: pct(d.at.x, W), top: pct(d.at.y, H), ...delay(300 + i * 60) }} />
            <span className="rf-fade absolute -translate-x-1/2 rounded-xl border border-rf-hairline bg-rf-white px-2.5 py-1.5 text-center whitespace-nowrap"
              // The designer's placement: the top device's label to its right, the others below their dots.
              style={{ ...(Math.sin(d.angle) < -0.5 ? { left: pct(d.at.x + 140, W), top: pct(d.at.y - 14, H) } : { left: pct(d.at.x, W), top: pct(d.at.y + 54, H) }), ...delay(900) }}>
              <span className="block text-xs leading-[1.2] font-medium">{d.name} · {d.count} accounts</span>
              <span className="block font-mono text-[10px] leading-[1.2] tracking-[0.04em] text-rf-slate">{d.id}</span>
            </span>
          </div>
        ))}
        {members.length === 2 && members.map((m) => {
          const at = spots.get(m.itemId)!;
          return <span key={`${m.itemId}-label`} className="rf-fade pointer-events-none absolute -translate-x-1/2 text-[13px] font-medium" style={{ left: pct(at.x, W), top: pct(at.y - 34, H), ...delay(900) }}>{m.accountId}</span>;
        })}
        {members.map((m, i) => {
          const at = spots.get(m.itemId)!;
          const on = hover === i;
          return (
            <button key={m.itemId} type="button" aria-label={`${m.accountId}, ${status(m).toLowerCase()}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}
              className="absolute flex size-5.5 -translate-1/2 items-center justify-center" style={{ left: pct(at.x, W), top: pct(at.y, H) }}>
              <span className={`rf-fade rounded-full bg-rf-ink ${on ? "size-3.25 shadow-[0_0_0_2px_var(--rf-mist),0_0_0_4px_var(--rf-ink)]" : "size-2.25 shadow-[0_0_0_2px_var(--rf-mist)]"}`} style={delay(accountWait(i) + 250)} />
            </button>
          );
        })}
        <button type="button" aria-label={`${hub.kicker}: ${hub.value}`} onMouseEnter={() => setHover("hub")} onFocus={() => setHover("hub")}
          className={`rf-fade absolute size-5.5 -translate-1/2 rounded-full bg-rf-spark ${hover === "hub" ? "shadow-[0_0_0_4px_var(--rf-mist),0_0_0_6px_var(--rf-ink)]" : "shadow-[0_0_0_4px_var(--rf-mist)]"}`}
          style={{ left: pct(CX, W), top: pct(CY, H) }} />
        <div className="rf-fade pointer-events-none absolute flex -translate-x-1/2 flex-col items-center gap-0.5" style={{ left: pct(CX, W), top: pct(CY + 18, H), ...delay(900) }}>
          <span className="font-mono text-[10px] tracking-[0.08em] text-rf-slate">{hub.kicker}</span>
          <span className="rounded-full border border-rf-ink bg-rf-white px-2 py-0.5 font-mono text-[11px] whitespace-nowrap">{hub.value}</span>
        </div>
      </div>
      <div aria-live="polite" className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-rf-ink bg-rf-white p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px] tracking-[0.08em] text-rf-slate">SELECTED DOT · HOVER ANOTHER TO SWITCH</span>
            <span className="font-mono text-[13px] tracking-[0.04em]">{tip.title}</span>
          </span>
          <span className="text-xs font-medium text-rf-slate">{tip.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {tip.rows.map(([k, v]) => (
            <div key={k} className="flex min-w-0 flex-col gap-px">
              <span className="text-[11px] text-rf-slate">{k}</span>
              <span className="font-mono text-xs leading-[1.35] wrap-anywhere">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LinkedCard({ c, status }: { c: DemoCase; status: (m: DemoMember) => string }) {
  const findings = c.caseFile ? c.caseFile.claims.map((cl) => ({ text: cl.text, evidence: claimEvidence(cl) })) : deriveFindings(c.members);
  const checked = c.caseFile ? `${c.caseFile.claims_checked.checked} OF ${c.caseFile.claims_checked.total} FINDINGS RE-CHECKED AGAINST THE RAW DATA` : "CHECKED AGAINST THE RAW DATA";

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-rf-hairline p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[22px] leading-[1.3] font-semibold tracking-[-0.02em]">How they&apos;re linked</h3>
        <span className="font-mono text-xs tracking-[0.06em] text-rf-slate">HOVER A DOT · DETAILS SHOW BELOW THE GRAPH</span>
      </div>
      <div className="flex gap-7 max-[1180px]:flex-wrap">
        <div className="flex w-110 max-w-full flex-none">
          <RingDiagram members={c.members} label={c.title} status={status} />
        </div>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-4">
          {legendFor(c.members, c.title).map((l) => (
            <div key={l.text} className="flex items-start gap-3">
              <span className="flex size-5.5 flex-none items-center justify-center"><span className={l.look} /></span>
              <span className="text-[15px] leading-[1.45]">{l.text}</span>
            </div>
          ))}
          <div className="h-px bg-rf-hairline" />
          <div className="font-mono text-xs tracking-[0.08em] text-rf-slate">WHAT WE FOUND</div>
          {findings.map((f) => (
            <div key={f.text} className="flex items-start gap-3">
              <svg aria-hidden="true" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-none"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] leading-[1.45]">{f.text}</span>
                {f.evidence && <span className="font-mono text-xs wrap-anywhere text-rf-slate">{f.evidence}</span>}
              </div>
            </div>
          ))}
          <div className="font-mono text-[11px] tracking-[0.06em] text-rf-slate">{checked}</div>
        </div>
      </div>
    </div>
  );
}
