// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { LibraryProvider, useLibrary } from "@/lib/recallmap/library-store";

const wrapper = ({ children }: { children: React.ReactNode }) => <LibraryProvider>{children}</LibraryProvider>;

describe("library store", () => {
  it("starts with labelled demo data and can be cleared to a true empty state", () => {
    const { result } = renderHook(() => useLibrary(), { wrapper });
    expect(result.current.isDemo).toBe(true);
    act(() => result.current.clearDemo());
    expect(result.current.subjects).toHaveLength(0);
    expect(result.current.isDemo).toBe(false);
  });
  it("adds material to an existing subject without creating a new one", () => {
    const { result } = renderHook(() => useLibrary(), { wrapper });
    const n = result.current.subjects.length;
    act(() => result.current.addMaterial({ subjectId: "programming", title: "New notes", kind: "text", content: "x".repeat(30) }));
    expect(result.current.subjects).toHaveLength(n);
    const added = result.current.materials.find((m) => m.title === "New notes");
    expect(added?.subjectId).toBe("programming");
    expect(added?.status).toBe("added-unprocessed");
  });
  it("creates a subject", () => {
    const { result } = renderHook(() => useLibrary(), { wrapper });
    let id = "";
    act(() => { id = result.current.addSubject("Database Systems", ""); });
    expect(result.current.subjects.some((s) => s.id === id)).toBe(true);
  });
});
