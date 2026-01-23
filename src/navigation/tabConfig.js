import { CAPABILITIES } from "../capabilities/keys";

export const TAB_CONFIG = [
  {
    key: "HomeTab",
    label: "Home",
    icon: "🏠",
    routeName: "HomeTab",
    requiredCaps: [CAPABILITIES.VIEW_DASHBOARD],
    component: "DashboardScreen"
  },
  {
    key: "PlantsTab",
    label: "Plants",
    icon: "🌱",
    routeName: "PlantsTab",
    requiredCaps: [CAPABILITIES.VIEW_PLANTS],
    component: "GrowLogsScreen"
  },
  {
    key: "DiagnoseTab",
    label: "Diagnose",
    icon: "🔍",
    routeName: "DiagnoseTab",
    requiredCaps: [CAPABILITIES.AI_DIAGNOSE],
    component: "DiagnoseScreen"
  },
  {
    key: "SearchTab",
    label: "Search",
    icon: "🔎",
    routeName: "SearchTab",
    requiredCaps: [CAPABILITIES.SEARCH],
    component: "SearchScreen"
  },
  {
    key: "FeedTab",
    label: "Feed",
    icon: "📡",
    routeName: "FeedTab",
    requiredCaps: [CAPABILITIES.VIEW_FEED],
    component: "FeedScreen"
  },
  {
    key: "ForumTab",
    label: "Forum",
    icon: "💬",
    routeName: "ForumTab",
    requiredCaps: [CAPABILITIES.VIEW_FORUM],
    component: "ForumScreen"
  },
  {
    key: "CoursesTab",
    label: "Courses",
    icon: "📚",
    routeName: "CoursesTab",
    requiredCaps: [CAPABILITIES.VIEW_COURSES],
    component: "CoursesScreen"
  },
  {
    key: "ProfileTab",
    label: "Profile",
    icon: "👤",
    routeName: "ProfileTab",
    requiredCaps: [CAPABILITIES.VIEW_PROFILE],
    component: "ProfileScreen"
  },
  {
    key: "CalendarTab",
    label: "Calendar",
    icon: "📅",
    routeName: "CalendarTab",
    requiredCaps: [CAPABILITIES.VIEW_GROW_LOG],
    component: "GrowLogCalendarScreen"
  },
  {
    key: "DebugTab",
    label: "Debug",
    icon: "🛠️",
    routeName: "DebugTab",
    requiredCaps: [CAPABILITIES.DEBUG],
    component: "DebugScreen",
    devOnly: true
  }
];

// Bulletproof capability check: supports both canonical and camelCase keys
export function canAccess(requiredCaps = [], capabilities = {}) {
  const caps = capabilities || {};
  if (!requiredCaps?.length) return true;
  return requiredCaps.every((cap) => !!caps[cap]);
}
