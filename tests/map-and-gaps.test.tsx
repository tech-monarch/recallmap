// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LibraryProvider, useLibrary } from "@/lib/recallmap/library-store";
import MapView from "@/components/recallmap/MapView";
import GapsView from "@/components/recallmap/GapsView";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("") }));
afterEach(cleanup);
const wrap = (ui: React.ReactNode) => render(<LibraryProvider>{ui}</LibraryProvider>);

describe("MapView", () => {
  it("selecting a concept shows details with prerequisites, evidence and actions", async () => {
    const user = userEvent.setup();
    wrap(<MapView />);
    await user.click(screen.getByRole("button", { name: /^Conditions: Suspected gap/ }));
    const panel = screen.getByRole("complementary", { name: "Details for Conditions" });
    expect(within(panel).getByText("Booleans")).toBeTruthy();
    expect(within(panel).getByText("Observed: incorrect answer")).toBeTruthy();
    expect(within(panel).getByText(/Inferred, not confirmed/)).toBeTruthy();
    expect(within(panel).getByRole("link", { name: /Study this concept/ }).getAttribute("href")).toContain("concept=conditions");
  });
  it("shows a different map per subject", async () => {
    const user = userEvent.setup();
    wrap(<MapView />);
    expect(screen.queryByRole("button", { name: /^Recursion/ })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Mathematics" }));
    expect(screen.queryByRole("button", { name: /^Recursion/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Linear equations/ })).toBeTruthy();
  });
  it("shows an honest empty state for a subject with no map", async () => {
    const user = userEvent.setup();
    function Adder() { const l = useLibrary(); return <button onClick={() => l.addSubject("Databases", "")}>add</button>; }
    wrap(<><Adder /><MapView /></>);
    await user.click(screen.getByText("add"));
    await user.click(screen.getByRole("tab", { name: "Databases" }));
    expect(screen.getByText("No map for Databases yet")).toBeTruthy();
  });
});

describe("GapsView", () => {
  it("separates observed from inferred and does not count unassessed concepts as gaps", async () => {
    const user = userEvent.setup();
    wrap(<GapsView />);
    await user.click(screen.getByRole("button", { name: "Conditions" }));
    expect(screen.getByText("What is inferred (not confirmed)")).toBeTruthy();
    expect(screen.getByText(/Unresolved prerequisite: Booleans/)).toBeTruthy();
    expect(screen.getByText(/not counted as gaps/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Loops" })).toBeNull();
  });
  it("filters by subject", async () => {
    const user = userEvent.setup();
    wrap(<GapsView />);
    await user.click(screen.getByRole("tab", { name: "Mathematics" }));
    expect(screen.getByRole("heading", { name: "Linear equations" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Conditions" })).toBeNull();
  });
  it("shows an empty state once demo data is removed", async () => {
    const user = userEvent.setup();
    function Clear() { const l = useLibrary(); return <button onClick={l.clearDemo}>clear</button>; }
    wrap(<><Clear /><GapsView /></>);
    await user.click(screen.getByText("clear"));
    expect(screen.getByText("No knowledge gaps identified")).toBeTruthy();
  });
});
