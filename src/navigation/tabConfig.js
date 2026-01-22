// Central tab config for capability-driven navigation
export const TAB_CONFIG = [
  {
    key: "HomeTab",
    label: "Home",
    icon: "🏠",
    routeName: "HomeTab",
    requiredCaps: ["viewDashboard"],
    component: "DashboardScreen"
  },
  {
    key: "PlantsTab",
    label: "Plants",
    icon: "🌱",
    routeName: "PlantsTab",
    requiredCaps: ["viewPlants"],
    component: "GrowLogsScreen"
  },
  {
    key: "DiagnoseTab",
    label: "Diagnose",
    icon: "🔍",
    routeName: "DiagnoseTab",
    requiredCaps: ["aiDiagnose"],
    component: "DiagnoseScreen"
  },
  {
    key: "SearchTab",
    label: "Search",
    icon: "🔎",
    routeName: "SearchTab",
    requiredCaps: ["search"],
    component: "SearchScreen"
  },
  {
    key: "FeedTab",
    label: "Feed",
    icon: "📡",
    routeName: "FeedTab",
    requiredCaps: ["viewFeed"],
    component: "FeedScreen"
  },
  {
    key: "ForumTab",
    label: "Forum",
    icon: "💬",
    routeName: "ForumTab",
    requiredCaps: ["viewForum"],
    component: "ForumScreen"
  },
  {
    key: "CoursesTab",
    label: "Courses",
    icon: "📚",
    routeName: "CoursesTab",
    requiredCaps: ["viewCourses"],
    component: "CoursesScreen"
  },
  {
    key: "ProfileTab",
    label: "Profile",
    icon: "👤",
    routeName: "ProfileTab",
    requiredCaps: ["viewProfile"],
    component: "ProfileScreen"
  },
  {
    key: "CalendarTab",
    label: "Calendar",
    icon: "📅",
    routeName: "CalendarTab",
    requiredCaps: ["viewGrowLog"],
    component: "GrowLogCalendarScreen"
  },
  {
    key: "DebugTab",
    label: "Debug",
    icon: "🛠️",
    routeName: "DebugTab",
    requiredCaps: ["debug"],
    component: "DebugScreen",
    devOnly: true
  }
];

// Helper to check if user has all required capabilities
export function canAccess(capabilities, requiredCaps) {
  if (!requiredCaps || requiredCaps.length === 0) return true;
  return requiredCaps.every((cap) => capabilities[cap]);
}
