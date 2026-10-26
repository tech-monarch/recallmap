/**
 * The signed-in learner's display name. There is no auth backend yet (docs/API_CONTRACTS.md),
 * so this returns null and the UI falls back to a generic greeting.
 * Integration point: return the real profile name here once sign-in exists; nothing else changes.
 */
export function useDisplayName(): string | null {
  return null;
}

export function firstNameOf(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first || null;
}

export function welcomeBack(name: string | null | undefined): string {
  const first = firstNameOf(name);
  return first ? `Welcome back, ${first} 👋` : "Welcome back 👋";
}
