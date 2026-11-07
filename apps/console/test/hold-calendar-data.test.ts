import { describe, expect, it } from "vitest";
import { buildHoldCalendarData } from "../lib/hold-calendar-data";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("buildHoldCalendarData", () => {
  it("is empty for week 0 - nothing is held before Ringfence existed", () => {
    const { resources, events } = buildHoldCalendarData(0);
    expect(resources).toEqual([]);
    expect(events).toEqual([]);
  });

  it("groups week 1's held items into exactly the ring and the pair, named and sized as Decisions shows them", () => {
    const { resources, events } = buildHoldCalendarData(1);
    expect(resources.map((r) => r.name)).toEqual(["Group 12", "Group 13"]);

    const sizeByName = new Map(resources.map((r) => [r.name, events.find((e) => e.resourceId === r.id)?.name]));
    expect(sizeByName.get("Group 12")).toBe("23 accounts");
    expect(sizeByName.get("Group 13")).toBe("2 accounts");
  });

  it("gives every event a 7-day window from its earliest sign-up", () => {
    const { events } = buildHoldCalendarData(1);
    for (const event of events) {
      const span = new Date(event.endDate).getTime() - new Date(event.startDate).getTime();
      expect(span).toBe(7 * DAY_MS);
    }
  });

  it("sorts events by soonest expiry first", () => {
    const { events } = buildHoldCalendarData(1);
    const endDates = events.map((e) => e.endDate);
    expect(endDates).toEqual([...endDates].sort());
  });

  it("gives each resource's id a matching event, and vice versa", () => {
    const { resources, events } = buildHoldCalendarData(1);
    const resourceIds = new Set(resources.map((r) => r.id));
    const eventResourceIds = new Set(events.map((e) => e.resourceId));
    expect(resourceIds).toEqual(eventResourceIds);
  });

  it("mirrors week 1's calendar exactly, since week 2 reviews week 1's real outcome", () => {
    expect(buildHoldCalendarData(2)).toEqual(buildHoldCalendarData(1));
  });
});
