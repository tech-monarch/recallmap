// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudyWorkspace from "@/components/recallmap/StudyWorkspace";

afterEach(cleanup);
const material = { id: "m1", subjectId: "programming", title: "Control Flow", kind: "pdf" as const, addedAt: "Demo", status: "demo" as const };

describe("StudyWorkspace", () => {
  it("shows material, concept state and labels tutor replies as demonstration", async () => {
    const user = userEvent.setup();
    render(<StudyWorkspace material={material} subjectName="Programming" />);
    expect(screen.getByText("Making decisions with conditions")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Step by step" }));
    await waitFor(() => expect(screen.getByText(/Demo response, not from Gemini/)).toBeTruthy());
  });
  it("grades a wrong answer without claiming a cause as fact", async () => {
    const user = userEvent.setup();
    render(<StudyWorkspace material={material} subjectName="Programming" />);
    await user.click(screen.getByLabelText("other"));
    await user.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(screen.getByText("That answer is incorrect.")).toBeTruthy();
    expect(screen.getByText(/hypothesis, not a conclusion/)).toBeTruthy();
  });
  it("lets the learner jump to a prerequisite concept", async () => {
    const user = userEvent.setup();
    render(<StudyWorkspace material={material} subjectName="Programming" />);
    const links = screen.getAllByRole("button", { name: "Booleans" });
    await user.click(links[links.length - 1]); // the "Builds on" prerequisite link
    expect(screen.getByText("Practice: Booleans")).toBeTruthy();
  });
  it("explains unprocessed material honestly", () => {
    render(<StudyWorkspace material={{ ...material, id: "x", kind: "pdf", status: "added-unprocessed" }} subjectName="Programming" />);
    expect(screen.getByText(/has not been processed/)).toBeTruthy();
  });
});
