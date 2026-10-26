"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { LearnerPreferences } from "./types";
import { DEFAULT_PREFERENCES, parseStoredPreferences, toApiPayload } from "./preferences";

/**
 * Preferences state. "Saved" currently means written to localStorage in THIS browser only.
 * Nothing is sent to a server and nothing follows the learner to another device.
 * Integration point: replace `save` with PUT /api/me/preferences (docs/API_CONTRACTS.md).
 */
export const PREFERENCES_STORAGE_KEY = "recallmap.preferences.v1";

type Prefs = {
  saved: LearnerPreferences;
  loaded: boolean;
  /** False when browser storage is unavailable or a write failed. */
  storageOk: boolean;
  save: (p: LearnerPreferences) => void;
  reset: () => void;
};

// Default value lets components (e.g. the study workspace) work with no provider mounted.
const Ctx = createContext<Prefs>({ saved: DEFAULT_PREFERENCES, loaded: true, storageOk: true, save: () => {}, reset: () => {} });

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<LearnerPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    // Read after mount so server and client render the same first paint (no hydration mismatch).
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      setSaved(parseStoredPreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)));
    } catch {
      setStorageOk(false);
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const persist = useCallback((p: LearnerPreferences) => {
    setSaved(p);
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(toApiPayload(p)));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, []);
  const reset = useCallback(() => {
    setSaved(DEFAULT_PREFERENCES);
    try {
      window.localStorage.removeItem(PREFERENCES_STORAGE_KEY);
    } catch {
      setStorageOk(false);
    }
  }, []);

  const value = useMemo(() => ({ saved, loaded, storageOk, save: persist, reset }), [saved, loaded, storageOk, persist, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePreferences = () => useContext(Ctx);
