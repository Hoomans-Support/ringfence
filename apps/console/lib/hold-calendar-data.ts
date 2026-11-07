/**
 * Data for the hold calendar (apps/console/app/review/calendar): one Bryntum Scheduler row per
 * paused group, one bar from the group's earliest sign-up to its 7-day hold limit. The groups are
 * the Decisions page's own (lib/demo.ts), so the names, sizes and deadlines always match it.
 */
import type { DemoWeek } from "./fixtures";
import { buildDemo } from "./demo";

export interface CalendarResource {
  id: string;
  name: string;
}

export interface CalendarEvent {
  id: string;
  resourceId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export function buildHoldCalendarData(week: DemoWeek, adjusted = false): { resources: CalendarResource[]; events: CalendarEvent[] } {
  const groups = buildDemo(week, adjusted).cases
    .filter((c) => c.kind === "group")
    .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!)); // soonest deadline first, as the top row
  return {
    resources: groups.map((c) => ({ id: c.id, name: c.name ?? c.title })),
    events: groups.map((c) => ({
      id: c.id,
      resourceId: c.id,
      name: `${c.size} account${c.size === 1 ? "" : "s"}`,
      startDate: c.members.reduce((first, m) => (m.signupAt < first ? m.signupAt : first), c.members[0]!.signupAt),
      endDate: c.dueAt!,
    })),
  };
}
