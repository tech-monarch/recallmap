import {
  LayoutDashboard,
  Library,
  MessagesSquare,
  TriangleAlert,
  TrendingUp,
  History,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { name: string; short: string; href: string; icon: LucideIcon; tagline: string; mobile: "bar" | "more"; also?: readonly string[] };

/**
 * Sidebar and mobile navigation. The knowledge map has no entry of its own: it opens from a subject
 * (My Library) and from concept links across the app. Its route still works and is listed in EXTRA_TITLES.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { name: "Dashboard", short: "Dashboard", href: "/dashboard", icon: LayoutDashboard, tagline: "Your overview and next step.", mobile: "bar" },
  { name: "My Library", short: "Library", href: "/dashboard/library", icon: Library, tagline: "Subjects and materials.", mobile: "bar", also: ["/dashboard/map"] },
  { name: "Study Sessions", short: "Sessions", href: "/dashboard/sessions", icon: MessagesSquare, tagline: "Study with the tutor.", mobile: "bar" },
  { name: "Knowledge Gaps", short: "Gaps", href: "/dashboard/gaps", icon: TriangleAlert, tagline: "Where understanding may be missing.", mobile: "more" },
  { name: "My Progress", short: "Progress", href: "/dashboard/progress", icon: TrendingUp, tagline: "What your answers show.", mobile: "bar" },
  { name: "Learning History", short: "History", href: "/dashboard/history", icon: History, tagline: "Sessions and assessments.", mobile: "more" },
  { name: "Preferences", short: "Preferences", href: "/dashboard/preferences", icon: SlidersHorizontal, tagline: "How RecallMap explains.", mobile: "more" },
];

/** Routes that exist but have no navigation entry. */
const EXTRA_TITLES: Record<string, string> = { "/dashboard/map": "Knowledge Map" };

export function isActivePath(pathname: string, item: NavItem) {
  if (item.href === "/dashboard") return pathname === "/dashboard";
  return [item.href, ...(item.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

export function titleForPath(pathname: string) {
  const extra = EXTRA_TITLES[pathname];
  if (extra) return extra;
  const exact = NAV_ITEMS.find((n) => n.href === pathname);
  if (exact) return exact.name;
  const prefix = [...NAV_ITEMS].reverse().find((n) => n.href !== "/dashboard" && pathname.startsWith(n.href));
  return prefix?.name ?? "RecallMap";
}
