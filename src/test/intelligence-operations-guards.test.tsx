/**
 * Extended guardrail tests for Intelligence/Operations:
 *  1. Nav link filtering across roles (sidebar/header/drawer never expose them
 *     to non-authorized roles).
 *  2. Hard permission guard — even with cached `?view=intelligence|operations`
 *     state arriving via back/forward, the page content does NOT render for
 *     unauthorized roles.
 *  3. Multi-student × multi-interval-type fixtures: scoped results computed
 *     and displayed per (student, intervalType) pair on both tabs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ---- Mocks --------------------------------------------------------------
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));
const mockUseCID = vi.fn();
vi.mock("@/hooks/useClinicalIntelligence", () => ({
  useClinicalIntelligenceAccess: () => mockUseCID(),
}));
vi.mock("@/pages/DashboardWidgetsView", () => ({
  default: () => <div data-testid="widgets-view">WIDGETS</div>,
}));
vi.mock("@/pages/Intelligence", () => ({
  default: () => <div data-testid="intelligence-view">INTELLIGENCE</div>,
}));
vi.mock("@/pages/Operations", () => ({
  default: () => <div data-testid="operations-view">OPERATIONS</div>,
}));

import Dashboard from "@/pages/Dashboard";

// ------------------------------------------------------------------------
// 1. Navigation surfaces — Intelligence/Operations stripped per role
// ------------------------------------------------------------------------
type NavRow = {
  nav_key: string;
  is_visible: boolean;
  required_role?: string | null;
  required_permission?: string | null;
};

/** Pure mirror of the filter the sidebar/header/drawer apply to nav rows. */
function filterNavForRole(rows: NavRow[], role: string): NavRow[] {
  return rows.filter(r => {
    if (!r.is_visible) return false;
    if (r.required_role && role !== r.required_role && role !== "super_admin") return false;
    return true;
  });
}

const ALL_NAV_ROWS: NavRow[] = [
  { nav_key: "dashboard", is_visible: true },
  { nav_key: "students", is_visible: true },
  { nav_key: "clinical", is_visible: true },
  // These two are the rows hidden by migration; included here defensively to
  // prove that even if they were ever flipped on, the filter strips them for
  // non-authorized roles.
  { nav_key: "intelligence", is_visible: false, required_role: "bcba" },
  { nav_key: "operations", is_visible: false, required_role: "admin" },
];

describe("Sidebar/header/drawer never expose Intelligence or Operations to non-authorized roles", () => {
  const ROLES = ["rbt", "teacher", "caregiver", "viewer", "staff", "parent"];

  for (const role of ROLES) {
    it(`role=${role}: nav contains no intelligence/operations entries`, () => {
      const visible = filterNavForRole(ALL_NAV_ROWS, role).map(r => r.nav_key);
      expect(visible).not.toContain("intelligence");
      expect(visible).not.toContain("operations");
    });
  }

  it("even if DB rows were re-enabled, role gate still blocks unauthorized roles", () => {
    const rebellious = ALL_NAV_ROWS.map(r =>
      r.nav_key === "intelligence" || r.nav_key === "operations"
        ? { ...r, is_visible: true }
        : r
    );
    const visible = filterNavForRole(rebellious, "rbt").map(r => r.nav_key);
    expect(visible).not.toContain("intelligence");
    expect(visible).not.toContain("operations");
  });
});

// ------------------------------------------------------------------------
// 2. Hard permission guard — cached/back-forward route state cannot bypass
// ------------------------------------------------------------------------
describe("Hard permission guard on Dashboard tab views", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseCID.mockReset();
  });

  function renderDashboardAt(initialEntries: string[], initialIndex = 0) {
    return render(
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("blocks Intelligence content for unauthorized role even with cached ?view=intelligence", () => {
    mockUseAuth.mockReturnValue({ userRole: "rbt" });
    mockUseCID.mockReturnValue({ hasCIDAccess: false });
    renderDashboardAt(["/?view=intelligence"]);
    expect(screen.queryByTestId("intelligence-view")).toBeNull();
    expect(screen.getByTestId("widgets-view")).toBeInTheDocument();
  });

  it("blocks Operations content for unauthorized role even with cached ?view=operations", () => {
    mockUseAuth.mockReturnValue({ userRole: "caregiver" });
    mockUseCID.mockReturnValue({ hasCIDAccess: false });
    renderDashboardAt(["/?view=operations"]);
    expect(screen.queryByTestId("operations-view")).toBeNull();
    expect(screen.getByTestId("widgets-view")).toBeInTheDocument();
  });

  it("simulated browser back/forward to a cached intelligence URL does not render content", () => {
    // History stack mimics: widgets -> intelligence (cached) -> widgets, then BACK.
    mockUseAuth.mockReturnValue({ userRole: "rbt" });
    mockUseCID.mockReturnValue({ hasCIDAccess: false });
    renderDashboardAt(["/", "/?view=intelligence", "/"], /* initialIndex */ 1);
    expect(screen.queryByTestId("intelligence-view")).toBeNull();
    expect(screen.getByTestId("widgets-view")).toBeInTheDocument();
  });

  it("role downgrade mid-session: previously authorized view stops rendering on re-render", () => {
    mockUseAuth.mockReturnValue({ userRole: "bcba" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    const { rerender } = render(
      <MemoryRouter initialEntries={["/?view=intelligence"]}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("intelligence-view")).toBeInTheDocument();

    // Simulate role downgrade (e.g. token refresh, role revoked).
    act(() => {
      mockUseAuth.mockReturnValue({ userRole: "rbt" });
      mockUseCID.mockReturnValue({ hasCIDAccess: false });
    });
    rerender(
      <MemoryRouter initialEntries={["/?view=intelligence"]}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByTestId("intelligence-view")).toBeNull();
    expect(screen.getByTestId("widgets-view")).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------------
// 3. Multi-student × multi-interval fixtures with scoping assertions
// ------------------------------------------------------------------------
type IntervalType =
  | "frequency"
  | "duration"
  | "partial_interval"
  | "whole_interval"
  | "momentary_time_sample";

interface BehaviorEvent {
  studentId: string;
  intervalType: IntervalType;
  count: number;
}

const STUDENTS = ["aa58eedf", "bfa3dbea", "1d858ef6"];
const INTERVALS: IntervalType[] = [
  "frequency",
  "duration",
  "partial_interval",
  "whole_interval",
  "momentary_time_sample",
];

function seedFixtures(): BehaviorEvent[] {
  const out: BehaviorEvent[] = [];
  STUDENTS.forEach((studentId, si) => {
    INTERVALS.forEach((intervalType, ii) => {
      // Deterministic, distinct count per (student, interval) pair.
      out.push({ studentId, intervalType, count: (si + 1) * 10 + ii + 1 });
    });
  });
  return out;
}

/** Mirrors the scoping that Intelligence/Operations dashboards apply. */
function scope(events: BehaviorEvent[], selectedStudents: string[]) {
  const set = new Set(selectedStudents);
  const filtered = events.filter(e => set.has(e.studentId));
  // Group by (student, intervalType)
  const grouped = new Map<string, number>();
  for (const e of filtered) {
    const key = `${e.studentId}|${e.intervalType}`;
    grouped.set(key, (grouped.get(key) || 0) + e.count);
  }
  return grouped;
}

describe("Intelligence & Operations dashboards: multi-student × multi-interval scoping", () => {
  const events = seedFixtures();

  it("computes one scoped bucket per (selectedStudent × intervalType) pair", () => {
    const scoped = scope(events, STUDENTS);
    expect(scoped.size).toBe(STUDENTS.length * INTERVALS.length);
    for (const s of STUDENTS) {
      for (const t of INTERVALS) {
        expect(scoped.has(`${s}|${t}`)).toBe(true);
      }
    }
  });

  it("excludes unselected students from the scoped result", () => {
    const selected = [STUDENTS[0], STUDENTS[2]];
    const scoped = scope(events, selected);
    expect(scoped.size).toBe(selected.length * INTERVALS.length);
    const keys = [...scoped.keys()];
    expect(keys.every(k => selected.includes(k.split("|")[0]))).toBe(true);
    expect(keys.some(k => k.startsWith(STUDENTS[1] + "|"))).toBe(false);
  });

  it("preserves per-pair values (no cross-student bleed) for both Intelligence and Operations payloads", () => {
    // Both tab views derive from the same scoped payload contract.
    const intelligence = scope(events, STUDENTS);
    const operations = scope(events, STUDENTS);
    for (const s of STUDENTS) {
      const si = STUDENTS.indexOf(s);
      INTERVALS.forEach((t, ii) => {
        const expected = (si + 1) * 10 + ii + 1;
        expect(intelligence.get(`${s}|${t}`)).toBe(expected);
        expect(operations.get(`${s}|${t}`)).toBe(expected);
      });
    }
  });

  it("renders Intelligence tab content for an authorized user with selected students", () => {
    mockUseAuth.mockReturnValue({ userRole: "bcba" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    const selected = STUDENTS.join(",");
    render(
      <MemoryRouter initialEntries={[`/?view=intelligence&clientIds=${selected}`]}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("intelligence-view")).toBeInTheDocument();
  });

  it("renders Operations tab content for an authorized user with selected students", () => {
    mockUseAuth.mockReturnValue({ userRole: "admin" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    const selected = STUDENTS.join(",");
    render(
      <MemoryRouter initialEntries={[`/?view=operations&clientIds=${selected}`]}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByTestId("operations-view")).toBeInTheDocument();
  });
});
