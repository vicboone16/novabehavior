/**
 * UI assertions: Intelligence and Operations tables/cards must display the
 * exact counts for each (student × intervalType) pair from seeded fixtures.
 */
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  BehaviorIntervalCountsTable,
  type BehaviorIntervalEvent,
  type IntervalType,
} from "@/components/dashboard/BehaviorIntervalCountsTable";

const STUDENTS = [
  { id: "aa58eedf", name: "Avery" },
  { id: "bfa3dbea", name: "Bryn" },
  { id: "1d858ef6", name: "Lorenzo" },
];
const INTERVALS: IntervalType[] = [
  "frequency",
  "duration",
  "partial_interval",
  "whole_interval",
  "momentary_time_sample",
];

/** Deterministic seed: count = (studentIndex+1)*10 + (intervalIndex+1). */
function seed(): BehaviorIntervalEvent[] {
  const events: BehaviorIntervalEvent[] = [];
  STUDENTS.forEach((s, si) => {
    INTERVALS.forEach((t, ii) => {
      events.push({
        studentId: s.id,
        studentName: s.name,
        intervalType: t,
        count: (si + 1) * 10 + (ii + 1),
      });
    });
  });
  // Add noise from an unselected student to verify scoping.
  INTERVALS.forEach(t =>
    events.push({ studentId: "noise-xyz", intervalType: t, count: 999 })
  );
  return events;
}

function expectedCount(sid: string, t: IntervalType): number {
  const si = STUDENTS.findIndex(s => s.id === sid);
  const ii = INTERVALS.indexOf(t);
  return (si + 1) * 10 + (ii + 1);
}

describe.each([
  { title: "Intelligence", testId: "counts-intelligence" },
  { title: "Operations", testId: "counts-operations" },
])("$title dashboard renders correct counts per (student × interval)", ({ title, testId }) => {
  const events = seed();
  const selectedIds = STUDENTS.map(s => s.id);

  it(`${title}: renders a row per selected student and a cell per interval`, () => {
    render(
      <BehaviorIntervalCountsTable
        title={title}
        events={events}
        selectedStudentIds={selectedIds}
        intervalTypes={INTERVALS}
      />
    );
    const root = screen.getByTestId(testId);
    for (const s of STUDENTS) {
      expect(within(root).getByTestId(`row-${s.id}`)).toBeInTheDocument();
    }
  });

  it(`${title}: every (student × interval) cell shows the seeded count`, () => {
    render(
      <BehaviorIntervalCountsTable
        title={title}
        events={events}
        selectedStudentIds={selectedIds}
        intervalTypes={INTERVALS}
      />
    );
    for (const s of STUDENTS) {
      for (const t of INTERVALS) {
        const cell = screen.getByTestId(`cell-${s.id}-${t}`);
        expect(cell.textContent).toBe(String(expectedCount(s.id, t)));
      }
    }
  });

  it(`${title}: per-student card shows correct sum and per-interval breakdown`, () => {
    render(
      <BehaviorIntervalCountsTable
        title={title}
        events={events}
        selectedStudentIds={selectedIds}
        intervalTypes={INTERVALS}
      />
    );
    for (const s of STUDENTS) {
      const expectedTotal = INTERVALS.reduce(
        (sum, t) => sum + expectedCount(s.id, t),
        0
      );
      expect(screen.getByTestId(`card-total-${s.id}`).textContent).toBe(
        String(expectedTotal)
      );
      for (const t of INTERVALS) {
        const li = screen.getByTestId(`card-${s.id}-${t}`);
        expect(li.textContent).toContain(`${t}: ${expectedCount(s.id, t)}`);
      }
    }
  });

  it(`${title}: unselected students never appear in rows or cards`, () => {
    render(
      <BehaviorIntervalCountsTable
        title={title}
        events={events}
        selectedStudentIds={[STUDENTS[0].id, STUDENTS[2].id]}
        intervalTypes={INTERVALS}
      />
    );
    expect(screen.queryByTestId(`row-${STUDENTS[1].id}`)).toBeNull();
    expect(screen.queryByTestId(`card-${STUDENTS[1].id}`)).toBeNull();
    expect(screen.queryByTestId("row-noise-xyz")).toBeNull();
    // Sanity: noise count of 999 must never be rendered.
    expect(screen.queryByText("999")).toBeNull();
  });

  it(`${title}: missing pair renders 0 (no NaN/undefined leaks)`, () => {
    const sparse: BehaviorIntervalEvent[] = [
      { studentId: STUDENTS[0].id, studentName: STUDENTS[0].name, intervalType: "frequency", count: 7 },
    ];
    render(
      <BehaviorIntervalCountsTable
        title={title}
        events={sparse}
        selectedStudentIds={[STUDENTS[0].id]}
        intervalTypes={INTERVALS}
      />
    );
    expect(screen.getByTestId(`cell-${STUDENTS[0].id}-frequency`).textContent).toBe("7");
    for (const t of INTERVALS.filter(t => t !== "frequency")) {
      expect(screen.getByTestId(`cell-${STUDENTS[0].id}-${t}`).textContent).toBe("0");
    }
  });
});
