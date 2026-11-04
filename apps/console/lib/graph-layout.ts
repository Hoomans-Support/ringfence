// Computes a deterministic force-directed layout for the ring graph (design.md's "constellation":
// a map, not a galaxy). Runs server-side — the simulation is pure math, no DOM needed — so the
// detail page can render static SVG with no client JS at all. Initial positions are placed on a
// circle (not d3's default random placement) so the same ring always lays out the same way.
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationNodeDatum } from "d3-force";

export interface LayoutLink {
  source: string;
  target: string;
}

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
}

const TICKS = 300;

export function computeLayout(
  nodeIds: string[],
  links: LayoutLink[],
  opts: { width: number; height: number },
): { nodes: PositionedNode[]; links: LayoutLink[] } {
  const n = nodeIds.length;
  const radius = Math.min(opts.width, opts.height) * 0.44;

  const nodes: SimNode[] = nodeIds.map((id, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    return {
      id,
      x: opts.width / 2 + radius * Math.cos(angle),
      y: opts.height / 2 + radius * Math.sin(angle),
    };
  });

  const nodeIdSet = new Set(nodeIds);
  const simLinks = links.filter((l) => nodeIdSet.has(l.source) && nodeIdSet.has(l.target)).map((l) => ({ ...l }));

  const simulation = forceSimulation<SimNode>(nodes)
    .force("charge", forceManyBody().strength(-80))
    .force(
      "link",
      forceLink<SimNode, LayoutLink>(simLinks)
        .id((d) => d.id)
        .distance(36),
    )
    .force("center", forceCenter(opts.width / 2, opts.height / 2))
    .force("collide", forceCollide(12))
    .stop();

  for (let i = 0; i < TICKS; i++) simulation.tick();

  // Clamp into the viewBox with a margin, so a node near the edge never gets clipped.
  const margin = 24;
  const positioned = nodes.map((node) => ({
    id: node.id,
    x: Math.min(Math.max(node.x ?? opts.width / 2, margin), opts.width - margin),
    y: Math.min(Math.max(node.y ?? opts.height / 2, margin), opts.height - margin),
  }));

  // forceLink() mutates each link's source/target in place, replacing the id string we gave it
  // with a reference to the resolved node object (that's how d3-force's .id() accessor works
  // internally) — normalize back to plain ids so callers never have to know that happened.
  const idOf = (endpoint: string | SimNode): string => (typeof endpoint === "string" ? endpoint : endpoint.id);
  const resultLinks: LayoutLink[] = simLinks.map((l) => ({
    source: idOf(l.source as unknown as string | SimNode),
    target: idOf(l.target as unknown as string | SimNode),
  }));

  return { nodes: positioned, links: resultLinks };
}
