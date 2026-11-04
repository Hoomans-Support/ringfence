// The constellation (design.md's graphic language): ring members as 9px ink dots joined by 1.5px
// ink hairlines, the operator — the signal that ties the ring together — as one 22px spark dot.
// Pure SVG from already-computed positions, so this needs no client JS at all.
//
// Simplification worth a second look: design.md's "operator" is "the shared device, address or
// answer that ties the ring together" — a signal, not necessarily one account. Here it's whichever
// device the most ring members share, which fits a ring on a single dominant device well but is a
// rough fit when a ring splits evenly across several devices (this one, on 3) — there's no single
// "most shared" device to crown. A more faithful version might render the operator as a signal
// node of its own (not an account at all); flagged here rather than guessed into something that
// looks precise but isn't.
import type { LayoutLink, PositionedNode } from "@/lib/graph-layout";

const MEMBER_RADIUS = 4.5; // 9px diameter
const OPERATOR_RADIUS = 11; // 22px diameter

export function RingGraph({
  nodes,
  links,
  operatorIds,
  width,
  height,
}: {
  nodes: PositionedNode[];
  links: LayoutLink[];
  operatorIds: Set<string>;
  width: number;
  height: number;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Linked accounts in this ring" className="h-full w-full">
      {links.map((link) => {
        const a = byId.get(link.source);
        const b = byId.get(link.target);
        if (!a || !b) return null;
        return (
          <line
            key={`${link.source}-${link.target}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--rf-ink)"
            strokeWidth={1}
            opacity={0.22}
          />
        );
      })}
      {nodes.map((node) => {
        const isOperator = operatorIds.has(node.id);
        return (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={isOperator ? OPERATOR_RADIUS : MEMBER_RADIUS}
            fill={isOperator ? "var(--rf-spark)" : "var(--rf-ink)"}
          >
            <title>{node.id}</title>
          </circle>
        );
      })}
    </svg>
  );
}
