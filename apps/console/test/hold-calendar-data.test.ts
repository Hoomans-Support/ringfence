import { describe, expect, it } from "vitest";
import { buildHoldCalendarData } from "../lib/hold-calendar-data";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("buildHoldCalendarData", () => {
  it("is empty for week 0 - nothing is held before Ringfence existed", () => {
    const { resources, events } = buildHoldCalendarData(0);
    expect(resources).toEqual([]);
    expect(events).toEqual([]);
  });

  it("groups week 1's held items into exactly the ring and the pair, sized correctly", () => {
    const { resources, events } = buildHoldCalendarData(1);
    expect(resources.map((r) => r.id).sort()).toEqual(["P-01", "R-12"]);

    const byId = new Map(events.map((e) => [e.id, e]));
    expect(byId.get("R-12")?.name).toBe("23 accounts");
    expect(byId.get("P-01")?.name).toBe("2 accounts");
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

  it("groups week 2's fixture-presented learned-rule holds under R-07 (learned)", () => {
    const { resources, events } = buildHoldCalendarData(2);
    expect(resources).toEqual([{ id: "R-07 (learned)", name: "R-07 (learned)" }]);
    expect(events[0]?.name).toBe("18 accounts");
  });
});
