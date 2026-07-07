// PAGE_REGISTRY_PERSONAL: Pages for Personal (Free + Pro) mode
// Each entry: { name, label, icon, capabilityKey, component }

export const PAGE_REGISTRY_PERSONAL = [
  {
    name: "Dashboard",
    label: "Dashboard",
    icon: "home-outline",
    capabilityKey: "personal.dashboard",
    component: require("../screens/DashboardScreen").default
  },
  {
    name: "Grows",
    label: "Grows",
    icon: "leaf-outline",
    capabilityKey: "personal.grows",
    component: require("../screens/GrowsScreen").default
  },
  {
    name: "Plants",
    label: "Plants",
    icon: "flower-outline",
    capabilityKey: "personal.plants",
    component: require("../screens/PlantsScreen").default
  },
  {
    name: "GrowLog",
    label: "Grow Log",
    icon: "book-outline",
    capabilityKey: "personal.growlog",
    component: require("../screens/GrowLogScreen").default
  },
  {
    name: "Calendar",
    label: "Schedule / Agenda",
    icon: "calendar-outline",
    capabilityKey: "personal.calendar",
    component: require("../app/home/schedule").default
  },
  {
    name: "Alerts",
    label: "Alerts",
    icon: "alert-circle-outline",
    capabilityKey: "personal.tasks",
    component: require("../app/home/alerts").default
  },
  {
    name: "Notifications",
    label: "Notifications",
    icon: "notifications-outline",
    capabilityKey: "personal.tasks",
    component: require("../app/home/notifications").default
  },
  {
    name: "Tools",
    label: "Tools",
    icon: "construct-outline",
    capabilityKey: "personal.tools",
    component: require("../screens/ToolsScreen").default
  },
  {
    name: "Diagnose",
    label: "Diagnose",
    icon: "medkit-outline",
    capabilityKey: "personal.diagnose",
    component: require("../screens/DiagnoseScreen").default
  },
  {
    name: "Analytics",
    label: "Analytics",
    icon: "stats-chart-outline",
    capabilityKey: "personal.analytics",
    component: require("../screens/AnalyticsScreen").default
  },
  {
    name: "Community",
    label: "Community",
    icon: "chatbubbles-outline",
    capabilityKey: "view.community.forum",
    component: require("../screens/ForumScreen").default
  },
  {
    name: "Feed",
    label: "Campaigns",
    icon: "megaphone-outline",
    capabilityKey: "view.community.feed",
    component: require("../app/feed").default
  },
  {
    name: "Courses",
    label: "Courses",
    icon: "school-outline",
    capabilityKey: "view.courses",
    component: require("../screens/CoursesScreen").default
  },
  {
    name: "Profile",
    label: "Profile",
    icon: "person-outline",
    capabilityKey: "view.profile",
    component: require("../screens/ProfileScreen").default
  }
];
