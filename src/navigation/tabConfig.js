import { CAPABILITIES } from "../capabilities/keys";

export const TAB_CONFIG = [
  {
    key: "HomeTab",
    label: "Home",
    icon: "home-outline",
    routeName: "HomeTab",
    requiredCaps: [CAPABILITIES.VIEW_DASHBOARD],
    component: "DashboardScreen"
  },
  {
    key: "PlantsTab",
    label: "Plants",
    icon: "leaf-outline",
    routeName: "PlantsTab",
    requiredCaps: [CAPABILITIES.VIEW_PLANTS],
    component: "GrowLogsScreen"
  },
  {
    key: "DiagnoseTab",
    label: "Diagnose",
    icon: "medkit-outline",
    routeName: "DiagnoseTab",
    requiredCaps: [CAPABILITIES.AI_DIAGNOSE],
    component: "DiagnoseScreen"
  },
  {
    key: "SearchTab",
    label: "Search",
    icon: "search-outline",
    routeName: "SearchTab",
    requiredCaps: [CAPABILITIES.SEARCH],
    component: "SearchScreen"
  },
  {
    key: "FeedTab",
    label: "Feed",
    icon: "newspaper-outline",
    routeName: "FeedTab",
    requiredCaps: [CAPABILITIES.VIEW_FEED],
    component: "FeedScreen"
  },
  {
    key: "ForumTab",
    label: "Forum",
    icon: "chatbubbles-outline",
    routeName: "ForumTab",
    requiredCaps: [CAPABILITIES.VIEW_FORUM],
    component: "ForumScreen"
  },
  {
    key: "CoursesTab",
    label: "Courses",
    icon: "school-outline",
    routeName: "CoursesTab",
    requiredCaps: [CAPABILITIES.VIEW_COURSES],
    component: "CoursesScreen"
  },
  {
    key: "ProfileTab",
    label: "Profile",
    icon: "person-outline",
    routeName: "ProfileTab",
    requiredCaps: [CAPABILITIES.VIEW_PROFILE],
    component: "ProfileScreen"
  },
  {
    key: "CalendarTab",
    label: "Calendar",
    icon: "calendar-outline",
    routeName: "CalendarTab",
    requiredCaps: [CAPABILITIES.VIEW_GROW_LOG],
    component: "GrowLogCalendarScreen"
  },
  {
    key: "DebugTab",
    label: "Debug",
    icon: "bug-outline",
    routeName: "DebugTab",
    requiredCaps: [CAPABILITIES.DEBUG],
    component: "DebugScreen",
    devOnly: true
  }
];

export function canAccess(requiredCaps = [], capabilities = {}) {
  const caps = capabilities || {};
  if (!requiredCaps?.length) return true;
  return requiredCaps.every((cap) => Boolean(cap && caps[cap]));
}
