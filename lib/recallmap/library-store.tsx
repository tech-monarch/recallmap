"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Material, Subject } from "./types";
import { DEMO_MATERIALS, DEMO_SUBJECTS } from "./demo-data";

/**
 * Client-side library state. Seeded with DEMO data; resets on reload.
 * Integration point: replace the setters with persistent storage / API calls
 * and document processing later without changing the consumers.
 */
export type LibraryMaterial = Material & { status: "demo" | "added-unprocessed"; content?: string };

type Library = {
  subjects: Subject[];
  materials: LibraryMaterial[];
  isDemo: boolean;
  addSubject: (name: string, description: string) => string;
  addMaterial: (m: { subjectId: string; title: string; kind: "pdf" | "text"; content?: string }) => void;
  clearDemo: () => void;
  loadDemo: () => void;
};

const Ctx = createContext<Library | null>(null);
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const seedMaterials = (): LibraryMaterial[] => DEMO_MATERIALS.map((m) => ({ ...m, status: "demo" as const }));

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>(DEMO_SUBJECTS);
  const [materials, setMaterials] = useState<LibraryMaterial[]>(seedMaterials);
  const [isDemo, setIsDemo] = useState(true);

  const addSubject = useCallback((name: string, description: string) => {
    const id = uid("sub-");
    setSubjects((s) => [...s, { id, name: name.trim(), description: description.trim() }]);
    return id;
  }, []);

  const addMaterial: Library["addMaterial"] = useCallback((m) => {
    setMaterials((list) => [
      ...list,
      { id: uid("mat-"), subjectId: m.subjectId, title: m.title.trim(), kind: m.kind, addedAt: "Just now", status: "added-unprocessed", content: m.content },
    ]);
  }, []);

  const clearDemo = useCallback(() => {
    setSubjects([]);
    setMaterials([]);
    setIsDemo(false);
  }, []);
  const loadDemo = useCallback(() => {
    setSubjects(DEMO_SUBJECTS);
    setMaterials(seedMaterials());
    setIsDemo(true);
  }, []);

  const value = useMemo(
    () => ({ subjects, materials, isDemo, addSubject, addMaterial, clearDemo, loadDemo }),
    [subjects, materials, isDemo, addSubject, addMaterial, clearDemo, loadDemo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLibrary must be used inside LibraryProvider");
  return v;
}
