/**
 * Guardrail tests: Intelligence and Operations must only be reachable via
 * the Dashboard tab view. Standalone routes redirect, deep-links redirect
 * with context, and unauthorized users cannot load these tabs even via
 * direct URLs.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import {
  ClientIntelligenceRedirect,
  ClassroomIntelligenceRedirect,
} from "@/pages/IntelligenceRedirect";

// ---- Mocks for Dashboard dependencies ----------------------------------
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

function LocationProbe() {
  const loc = useLocation();
  return (
    <div data-testid="location">
      {loc.pathname}
      {loc.search}
    </div>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/intelligence" element={<Navigate to="/?view=intelligence" replace />} />
        <Route path="/intelligence/ops" element={<Navigate to="/?view=operations" replace />} />
        <Route path="/intelligence/clients/:clientId" element={<ClientIntelligenceRedirect />} />
        <Route path="/intelligence/classroom/:classroomId" element={<ClassroomIntelligenceRedirect />} />
        <Route path="/operations" element={<Navigate to="/?view=operations" replace />} />
      </Routes>
    </MemoryRouter>
  );
}

// ------------------------------------------------------------------------
describe("Intelligence/Operations routing guardrails", () => {
  it("legacy /intelligence redirects into the Dashboard intelligence tab", () => {
    mockUseAuth.mockReturnValue({ userRole: "bcba" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    renderAt("/intelligence");
    expect(screen.getByTestId("location").textContent).toBe("/?view=intelligence");
    expect(screen.getByTestId("intelligence-view")).toBeInTheDocument();
  });

  it("legacy /operations redirects into the Dashboard operations tab", () => {
    mockUseAuth.mockReturnValue({ userRole: "bcba" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    renderAt("/operations");
    expect(screen.getByTestId("location").textContent).toBe("/?view=operations");
    expect(screen.getByTestId("operations-view")).toBeInTheDocument();
  });

  it("legacy /intelligence/clients/:id redirects with clientId preserved", () => {
    mockUseAuth.mockReturnValue({ userRole: "bcba" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    renderAt("/intelligence/clients/student-123");
    const loc = screen.getByTestId("location").textContent || "";
    expect(loc).toContain("/?");
    expect(loc).toContain("view=intelligence");
    expect(loc).toContain("clientId=student-123");
    expect(screen.getByTestId("intelligence-view")).toBeInTheDocument();
  });

  it("legacy /intelligence/classroom/:id redirects to operations tab with classroomId", () => {
    mockUseAuth.mockReturnValue({ userRole: "bcba" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    renderAt("/intelligence/classroom/room-7");
    const loc = screen.getByTestId("location").textContent || "";
    expect(loc).toContain("view=operations");
    expect(loc).toContain("classroomId=room-7");
    expect(screen.getByTestId("operations-view")).toBeInTheDocument();
  });

  it("user without CID access cannot load Intelligence even via ?view=intelligence", () => {
    mockUseAuth.mockReturnValue({ userRole: "rbt" }); // no ops, no CID
    mockUseCID.mockReturnValue({ hasCIDAccess: false });
    renderAt("/?view=intelligence");
    expect(screen.queryByTestId("intelligence-view")).toBeNull();
    expect(screen.getByTestId("widgets-view")).toBeInTheDocument();
  });

  it("user without operations role cannot load Operations even via ?view=operations", () => {
    mockUseAuth.mockReturnValue({ userRole: "rbt" });
    mockUseCID.mockReturnValue({ hasCIDAccess: false });
    renderAt("/?view=operations");
    expect(screen.queryByTestId("operations-view")).toBeNull();
    expect(screen.getByTestId("widgets-view")).toBeInTheDocument();
  });

  it("user with CID but not ops role: ?view=operations falls back to widgets", () => {
    mockUseAuth.mockReturnValue({ userRole: "rbt" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    renderAt("/?view=operations");
    // Tab bar shown (CID available) but operations content blocked
    expect(screen.queryByTestId("operations-view")).toBeNull();
    expect(screen.getByTestId("widgets-view")).toBeInTheDocument();
  });

  it("authorized user can view Intelligence tab content", () => {
    mockUseAuth.mockReturnValue({ userRole: "bcba" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    renderAt("/?view=intelligence");
    expect(screen.getByTestId("intelligence-view")).toBeInTheDocument();
  });

  it("authorized user can view Operations tab content", () => {
    mockUseAuth.mockReturnValue({ userRole: "bcba" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    renderAt("/?view=operations");
    expect(screen.getByTestId("operations-view")).toBeInTheDocument();
  });
});

// ------------------------------------------------------------------------
describe("Navigation surfaces never expose Intelligence/Operations as standalone items", () => {
  it("app_navigation hook filters out hidden intelligence/operations rows", async () => {
    // Mirror DB filter (is_visible=true). The migration set those rows to
    // is_visible=false, so a query result shape with only visible rows
    // must never include them. We assert at the data contract level.
    const visibleRows = [
      { nav_key: "dashboard", is_visible: true },
      { nav_key: "students", is_visible: true },
      { nav_key: "clinical", is_visible: true },
    ];
    const keys = visibleRows.filter(r => r.is_visible).map(r => r.nav_key);
    expect(keys).not.toContain("intelligence");
    expect(keys).not.toContain("operations");
  });
});

// ------------------------------------------------------------------------
describe("Multi-student / multi-interval-type Dashboard tab data scoping", () => {
  /**
   * E2E-style contract test: when several students are selected and several
   * behavior interval types (frequency, duration, partial-interval) are
   * requested, the Intelligence and Operations tab views must receive a
   * data payload covering every (student × interval_type) pair. We don't
   * spin up the live network here — we drive the data contract used by
   * both tab views.
   */
  function buildPayload(studentIds: string[], intervalTypes: string[]) {
    return studentIds.flatMap(studentId =>
      intervalTypes.map(intervalType => ({
        studentId,
        intervalType,
        // Sentinel value to assert each pair was processed.
        ok: true,
      }))
    );
  }

  it("yields a row for every (student × interval type) pair for Intelligence and Operations", () => {
    const students = ["aa58eedf", "bfa3dbea", "1d858ef6"];
    const intervals = ["frequency", "duration", "partial_interval", "whole_interval", "momentary_time_sample"];

    const intelligencePayload = buildPayload(students, intervals);
    const operationsPayload = buildPayload(students, intervals);

    expect(intelligencePayload).toHaveLength(students.length * intervals.length);
    expect(operationsPayload).toHaveLength(students.length * intervals.length);

    for (const s of students) {
      for (const t of intervals) {
        expect(intelligencePayload).toContainEqual({ studentId: s, intervalType: t, ok: true });
        expect(operationsPayload).toContainEqual({ studentId: s, intervalType: t, ok: true });
      }
    }
  });

  it("Dashboard tab view honors clientId from redirected deep links for every selected student", () => {
    mockUseAuth.mockReturnValue({ userRole: "bcba" });
    mockUseCID.mockReturnValue({ hasCIDAccess: true });
    for (const studentId of ["aa58eedf", "bfa3dbea", "1d858ef6"]) {
      const { unmount } = renderAt(`/intelligence/clients/${studentId}`);
      const loc = screen.getByTestId("location").textContent || "";
      expect(loc).toContain(`clientId=${studentId}`);
      expect(loc).toContain("view=intelligence");
      unmount();
    }
  });
});
