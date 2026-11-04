// The six named icons from asset/Ringfence-Brand-Guidelines.html section "06 — ICONS" (paths
// copied verbatim from its inline <svg> markup, per design.md's instruction to pull them from the
// guide rather than redraw them). 24px grid, 1.5px stroke, round caps/joins, ink only — each uses
// `currentColor` so a consumer sets ink (default) or, for Hold only, spark when it's the active
// state (design.md: "Coral only for the Hold icon when it is the active state").
import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill" | "stroke" | "strokeWidth" | "strokeLinecap" | "strokeLinejoin">;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8M13 9l3 3-3 3" />
    </Icon>
  );
}

export function HoldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </Icon>
  );
}

export function TraceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="17" r="2" />
      <circle cx="10" cy="6" r="2" />
      <circle cx="19" cy="10" r="2" />
      <path d="M6 15.2 9 7.9M11.9 6.8l5.2 2.4" />
    </Icon>
  );
}

export function RecoverIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Icon>
  );
}

export function RuleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

export function AgentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="6" width="16" height="12" rx="3" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M12 3v3" />
    </Icon>
  );
}
