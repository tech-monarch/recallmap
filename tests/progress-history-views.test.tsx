// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LibraryProvider, useLibrary } from "@/lib/recallmap/library-store";
import ProgressView from "@/components/recallmap/ProgressView";
import HistoryView from "@/components/recallmap/HistoryView";

afterEach(cleanup);
const wrap = (ui: React.ReactNode) => render(<LibraryProvider>{ui}</LibraryProvider>);
function Clear() { const l = useLibrary(); return <button onClick={l.clearDemo}>clear</button>; }

describe("ProgressView", () => {
  it("labels illustrative data and distinguishes measured, estimated and missing evidence", () => {
    wrap(<ProgressView />);
    expect(screen.getByText(/Demonstration data/)).toBeTruthy();
    const key = screen.getByRole("list", { name: "How to read the labels on this page" });
    for (const t of ["Measured", "Estimated", "No data"]) expect(within(key).getByText(t)).toBeTruthy();
    expect(screen.getAllByText("Not yet assessed").length).toBeGreaterThan(1); // unassessed concepts are shown as missing data
  });
  it("shows progress by subject, topic and concept", () => {
    wrap(<ProgressView />);
    expect(screen.getByRole("heading", { name: "Programming" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mathematics" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Control flow" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Programming: 1 demonstrated, 2 partial, 1 suspected gap, 3 not yet assessed/ })).toBeTruthy();
    expect(screen.getAllByText(/not counted as weak/).length).toBe(2);
  });
  it("reports change over time only where there are two or more attempts, and the previously weak concept that improved", () => {
    wrap(<ProgressView />);
    const over = screen.getByRole("region", { name: "Change over time" });
    expect(within(over).getByText(/1 of 4 correct → 2 of 4 correct/)).toBeTruthy();
    expect(within(over).getByText(/only one attempt, so there is no trend/)).toBeTruthy();
    const improved = screen.getByRole("region", { name: "Previously weak, now improved" });
    expect(within(improved).getByText(/25% → 50%/)).toBeTruthy();
    expect(within(improved).getByText(/not the same as mastered/)).toBeTruthy();
  });
  it("separates completed retention checks from recommendations and shows no invented due dates", async () => {
    wrap(<ProgressView />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Retention checks/ }));
    const r = screen.getByRole("dialog", { name: "Retention checks" });
    expect(within(r).getByText(/Arithmetic: 2 of 2 correct/)).toBeTruthy();
    expect(within(r).getByText("Retention check: Variables")).toBeTruthy();
    expect(within(r).getByText(/No due dates are shown/)).toBeTruthy();
  });
  it("lists uncertain concepts with the reason", async () => {
    wrap(<ProgressView />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Still uncertain/ }));
    const u = screen.getByRole("dialog", { name: "Still uncertain" });
    expect(within(u).getAllByText(/Not yet assessed\. This is missing data, not a weakness\./).length).toBeGreaterThan(0);
  });
  it("has no XP, points, streaks or leaderboards", () => {
    const { container } = wrap(<ProgressView />);
    expect(container.textContent).not.toMatch(/\bXP\b|streak|leaderboard|points|badge earned/i);
  });
  it("shows an honest empty state, with no sample results, once demonstration data is removed", async () => {
    const user = userEvent.setup();
    wrap(<><Clear /><ProgressView /></>);
    await user.click(screen.getByText("clear"));
    expect(screen.getByText("Not enough assessment evidence yet")).toBeTruthy();
    expect(screen.queryByText(/Demonstration data/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Assessment results" })).toBeNull();
  });
});

describe("HistoryView", () => {
  it("keeps recommended activity apart from completed activity and labels both", () => {
    wrap(<HistoryView />);
    const rec = screen.getByRole("heading", { name: "Recommended next" });
    const done = screen.getByRole("heading", { name: "Completed activity" });
    expect(rec.compareDocumentPosition(done) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText("Recommended, not done").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getByText(/no real dates/)).toBeTruthy();
  });
  it("filters by subject, type and status, and can clear filters", async () => {
    const user = userEvent.setup();
    wrap(<HistoryView />);
    const total = screen.getByRole("status").textContent!;
    await user.selectOptions(screen.getByLabelText("Subject"), "mathematics");
    expect(screen.queryByText("Control flow: conditions walkthrough")).toBeNull();
    expect(screen.getByText("Linear equations check (3 questions)")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Activity type"), "retention-check");
    expect(screen.getByText("Arithmetic retention check (2 questions)")).toBeTruthy();
    expect(screen.queryByText("Linear equations check (3 questions)")).toBeNull();
    await user.selectOptions(screen.getByLabelText("Status"), "recommended");
    expect(screen.getByText("Retention check: Expressions")).toBeTruthy();
    expect(screen.queryByText("Arithmetic retention check (2 questions)")).toBeNull();
    await user.selectOptions(screen.getByLabelText("Activity type"), "study-session");
    expect(screen.getByText("Nothing matches these filters")).toBeTruthy();
    await user.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    expect(screen.getByRole("status").textContent).toBe(total);
  });
  it("expands details accessibly: result, previous attempt and the explanation that was tried", async () => {
    const user = userEvent.setup();
    wrap(<HistoryView />);
    await user.click(screen.getByRole("button", { name: /Booleans re-check/ }));
    const panel = screen.getByRole("dialog", { name: "Booleans re-check (4 questions)" });
    expect(within(panel).getByText(/2 of 4 correct \(previous attempt: 1 of 4\)/)).toBeTruthy();
    expect(within(panel).getByText(/may have other causes/)).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(screen.getByRole("button", { name: /Booleans: comparisons walkthrough/ }));
    expect(screen.getByText(/Step-by-step explanation/)).toBeTruthy();
  });
  it("opens details from the keyboard and returns focus to the card on close", async () => {
    const user = userEvent.setup();
    wrap(<HistoryView />);
    const btn = screen.getByRole("button", { name: /Variables check/ });
    btn.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: /Variables check/ })).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(btn));
  });
  it("explains that a recommendation has not happened and says why it was suggested", async () => {
    const user = userEvent.setup();
    wrap(<HistoryView />);
    await user.click(screen.getByRole("button", { name: /Reassess: Conditions/ }));
    const panel = screen.getByRole("dialog", { name: "Reassess: Conditions" });
    expect(within(panel).getByText(/This has not happened/)).toBeTruthy();
    expect(within(panel).getByRole("link", { name: "Start this check" }).getAttribute("href")).toContain("concept=conditions");
  });
  it("shows an honest empty state with no fabricated entries once demonstration data is removed", async () => {
    const user = userEvent.setup();
    wrap(<><Clear /><HistoryView /></>);
    await user.click(screen.getByText("clear"));
    expect(screen.getByText("No learning history yet")).toBeTruthy();
    expect(screen.queryByText(/Variables check/)).toBeNull();
  });
});
