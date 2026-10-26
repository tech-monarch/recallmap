import { describe, expect, it } from "vitest";
import { NAV_ITEMS, titleForPath } from "@/lib/recallmap/nav";
import { welcomeBack } from "@/lib/recallmap/user";
import { STATE_META } from "@/lib/recallmap/state";
import { DEMO_CONCEPTS, DEMO_LEARNER_STATES } from "@/lib/recallmap/demo-data";

describe("RecallMap foundation", () => {
  it("lists the sidebar sections, with the knowledge map reached through subjects", () => {
    expect(NAV_ITEMS.map((n) => n.name)).toEqual([
      "Dashboard", "My Library", "Study Sessions",
      "Knowledge Gaps", "My Progress", "Learning History", "Preferences",
    ]);
    expect(NAV_ITEMS.some((n) => n.href === "/dashboard/map")).toBe(false);
    expect(NAV_ITEMS.filter((n) => n.mobile === "bar")).toHaveLength(4);
    expect(NAV_ITEMS.some((n) => /chat/i.test(n.name))).toBe(false);
  });
  it("resolves titles", () => {
    expect(titleForPath("/dashboard/map")).toBe("Knowledge Map");
    expect(titleForPath("/dashboard")).toBe("Dashboard");
  });
  it("greets by first name and falls back gracefully", () => {
    expect(welcomeBack("Ada Okafor")).toBe("Welcome back, Ada 👋");
    expect(welcomeBack(null)).toBe("Welcome back 👋");
    expect(welcomeBack("   ")).toBe("Welcome back 👋");
  });
  it("covers all four understanding states", () => {
    expect(Object.keys(STATE_META).sort()).toEqual(["demonstrated", "not-assessed", "partial", "suspected-gap"]);
  });
  it("keeps concept graph and learner evidence separate and consistent", () => {
    const ids = new Set(DEMO_CONCEPTS.map((c) => c.id));
    DEMO_CONCEPTS.forEach((c) => c.prerequisites.forEach((p) => expect(ids.has(p)).toBe(true)));
    DEMO_LEARNER_STATES.forEach((s) => expect(ids.has(s.conceptId)).toBe(true));
  });
});
