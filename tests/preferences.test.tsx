// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreferencesView from "@/components/recallmap/PreferencesView";
import StudyWorkspace from "@/components/recallmap/StudyWorkspace";
import { PREFERENCES_STORAGE_KEY, PreferencesProvider } from "@/lib/recallmap/preferences-store";
import { CONCEPT_TUTOR } from "@/lib/recallmap/demo-tutor";
import { DEFAULT_PREFERENCES, parseStoredPreferences, preferredTutorModes, previewParts, toApiPayload, toggleStyle } from "@/lib/recallmap/preferences";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);
const page = () => render(<PreferencesProvider><PreferencesView /></PreferencesProvider>);

describe("preference helpers", () => {
  it("toggles styles on and off without duplicates", () => {
    expect(toggleStyle([], "steps")).toEqual(["steps"]);
    expect(toggleStyle(["steps", "visual"], "steps")).toEqual(["visual"]);
  });
  it("builds a payload matching PUT /api/me/preferences and caps goals", () => {
    const p = toApiPayload({ ...DEFAULT_PREFERENCES, goals: `  ${"a".repeat(400)}  `, explanationStyle: ["analogies"] });
    expect(Object.keys(p).sort()).toEqual(["difficulty", "explanationDepth", "explanationStyle", "goals", "pace"]);
    expect(p.goals).toHaveLength(300);
  });
  it("maps supported styles to tutor modes and omits visual", () => {
    expect(preferredTutorModes({ ...DEFAULT_PREFERENCES, explanationStyle: ["visual", "examples", "steps"] })).toEqual(["example", "steps"]);
  });
  it("falls back to defaults for missing, malformed or hostile stored data", () => {
    expect(parseStoredPreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parseStoredPreferences("{not json")).toEqual(DEFAULT_PREFERENCES);
    expect(parseStoredPreferences("42")).toEqual(DEFAULT_PREFERENCES);
    const r = parseStoredPreferences(JSON.stringify({ pace: "warp", difficulty: "challenging", explanationStyle: ["steps", "steps", "bogus"], goals: 5 }));
    expect(r).toEqual({ ...DEFAULT_PREFERENCES, difficulty: "challenging", explanationStyle: ["steps"] });
  });
  it("preview depth: brief = overview only, standard = first style, detailed = all supported styles", () => {
    const t = CONCEPT_TUTOR.variables;
    const base = { ...DEFAULT_PREFERENCES, explanationStyle: ["examples", "analogies", "visual"] as const };
    expect(previewParts({ ...base, explanationStyle: [...base.explanationStyle], explanationDepth: "brief" }, t)).toHaveLength(1);
    expect(previewParts({ ...base, explanationStyle: [...base.explanationStyle], explanationDepth: "standard" }, t).map((p) => p.label)).toEqual(["Overview", "Worked example"]);
    expect(previewParts({ ...base, explanationStyle: [...base.explanationStyle], explanationDepth: "detailed" }, t).map((p) => p.label)).toEqual(["Overview", "Worked example", "Analogy"]);
  });
});

describe("Preferences page", () => {
  it("states honestly that preferences are stored in this browser only", () => {
    page();
    expect(screen.getByText(/Stored in this browser only/)).toBeTruthy();
    expect(screen.getByText(/does not adapt to these choices/)).toBeTruthy();
  });
  it("offers every control and marks visual explanations as not available yet", () => {
    page();
    for (const n of ["Step by step", "Worked examples", "Analogies", "Visual explanations"]) expect(screen.getByRole("checkbox", { name: new RegExp(n) })).toBeTruthy();
    for (const g of ["Explanation depth", "Learning pace", "Preferred difficulty"]) expect(screen.getByRole("group", { name: g })).toBeTruthy();
    expect(screen.getByText("Not available yet")).toBeTruthy();
  });
  it("Save is disabled until something changes, then writes to local storage only", async () => {
    const user = userEvent.setup();
    page();
    const save = screen.getByRole("button", { name: "Save preferences" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: /Analogies/ }));
    await user.click(screen.getByRole("radio", { name: /Detailed/ }));
    await user.click(screen.getByRole("radio", { name: /Slow/ }));
    await user.click(screen.getByRole("radio", { name: /Challenging/ }));
    expect(screen.getByText("You have unsaved changes.")).toBeTruthy();
    expect(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull(); // nothing saved before pressing Save
    await user.click(save);
    expect(screen.getByText("Saved in this browser.")).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({ explanationStyle: ["analogies"], explanationDepth: "detailed", pace: "slow", difficulty: "challenging" });
  });
  it("restores saved preferences on a fresh mount", async () => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...DEFAULT_PREFERENCES, explanationStyle: ["steps"], pace: "fast", goals: "Pass the exam" }));
    page();
    expect((await screen.findByRole("checkbox", { name: /Step by step/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Fast/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Learning goals/) as HTMLTextAreaElement).value).toBe("Pass the exam");
  });
  it("discard reverts unsaved edits and reset clears saved values", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...DEFAULT_PREFERENCES, pace: "fast" }));
    page();
    await user.click(await screen.findByRole("radio", { name: /Slow/ }));
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect((screen.getByRole("radio", { name: /Fast/ }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect((screen.getByRole("radio", { name: /Normal/ }) as HTMLInputElement).checked).toBe(true);
    expect(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();
  });
  it("sample preview follows unsaved selections and is labelled as canned text", async () => {
    const user = userEvent.setup();
    page();
    expect(screen.getByText("Canned sample text, not AI-generated")).toBeTruthy();
    expect(screen.getByText(/only the default overview/)).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: /Analogies/ }));
    expect(screen.getByText("Analogy")).toBeTruthy();
  });
});

describe("Study Sessions integration", () => {
  const material = { id: "m1", subjectId: "programming", title: "Control Flow", kind: "pdf" as const, addedAt: "Demo", status: "demo" as const };
  it("highlights the quick actions that match saved preferences, and only those", async () => {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...DEFAULT_PREFERENCES, explanationStyle: ["steps"] }));
    render(<PreferencesProvider><StudyWorkspace material={material} subjectName="Programming" /></PreferencesProvider>);
    await waitFor(() => expect(screen.getByRole("button", { name: "Step by step" }).hasAttribute("data-preferred")).toBe(true));
    expect(screen.getByRole("button", { name: "Give an example" }).hasAttribute("data-preferred")).toBe(false);
  });
});
