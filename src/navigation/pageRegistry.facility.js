// PAGE_REGISTRY_FACILITY: Pages for Facility mode
// Each entry: { name, label, icon, capabilityKey, component }

export const PAGE_REGISTRY_FACILITY = [
  {
    name: "FacilityDashboard",
    label: "Dashboard",
    icon: "grid-outline",
    capabilityKey: "facility.dashboard",
    group: "reports",
    component: require("../screens/FacilityDashboardScreen").default
  },
  {
    name: "FacilityProfile",
    label: "Setup",
    icon: "person-outline",
    capabilityKey: "facility.profile",
    group: "setup",
    component: require("../screens/FacilityProfileScreen").default
  },
  {
    name: "FacilityRooms",
    label: "Rooms",
    icon: "home-outline",
    capabilityKey: "facility.rooms",
    group: "rooms",
    component: require("../screens/FacilityRoomsScreen").default
  },
  {
    name: "FacilityIntegrations",
    label: "Integrations",
    icon: "hardware-chip-outline",
    capabilityKey: "facility.rooms",
    group: "rooms",
    component: require("../app/home/facility/(tabs)/integrations").default
  },
  {
    name: "FacilityGrows",
    label: "Grows",
    icon: "layers-outline",
    capabilityKey: "facility.plants",
    group: "grows",
    component: require("../app/home/facility/(tabs)/grows").default
  },
  {
    name: "FacilityPlants",
    label: "Plants",
    icon: "leaf-outline",
    capabilityKey: "facility.plants",
    group: "plants",
    component: require("../screens/FacilityPlantsScreen").default
  },
  {
    name: "FacilityLogs",
    label: "Logs",
    icon: "document-text-outline",
    capabilityKey: "facility.plants",
    group: "plants",
    component: require("../app/home/facility/(tabs)/logs").default
  },
  {
    name: "FacilityInventory",
    label: "Inventory",
    icon: "cube-outline",
    capabilityKey: "facility.inventory",
    group: "inventory",
    component: require("../screens/FacilityInventoryScreen").default
  },
  {
    name: "FacilityTasks",
    label: "Tasks",
    icon: "checkmark-done-outline",
    capabilityKey: "facility.tasks",
    group: "tasks",
    component: require("../screens/FacilityTasksScreen").default
  },
  {
    name: "FacilitySopRuns",
    label: "SOP Runs",
    icon: "clipboard-outline",
    capabilityKey: "facility.tasks",
    group: "tasks",
    component: require("../app/home/facility/(tabs)/sop-runs").default
  },
  {
    name: "FacilitySchedule",
    label: "Schedule / Agenda",
    icon: "calendar-outline",
    capabilityKey: "facility.tasks",
    group: "tasks",
    component: require("../app/home/schedule").default
  },
  {
    name: "FacilityAlerts",
    label: "Alerts",
    icon: "alert-circle-outline",
    capabilityKey: "facility.tasks",
    group: "tasks",
    component: require("../app/home/alerts").default
  },
  {
    name: "FacilityNotifications",
    label: "Notifications",
    icon: "notifications-outline",
    capabilityKey: "facility.tasks",
    group: "tasks",
    component: require("../app/home/notifications").default
  },
  {
    name: "FacilityCompliance",
    label: "Compliance",
    icon: "shield-checkmark-outline",
    capabilityKey: "facility.reports",
    group: "compliance",
    component: require("../app/home/facility/(tabs)/compliance").default
  },
  {
    name: "FacilityAuditLogs",
    label: "Audit Logs",
    icon: "reader-outline",
    capabilityKey: "facility.reports",
    group: "compliance",
    component: require("../app/home/facility/(tabs)/audit-logs").default
  },
  {
    name: "FacilityTeam",
    label: "Team",
    icon: "people-outline",
    capabilityKey: "facility.team",
    group: "team",
    component: require("../screens/FacilityTeamScreen").default
  },
  {
    name: "FacilityReports",
    label: "Reports",
    icon: "bar-chart-outline",
    capabilityKey: "facility.reports",
    group: "reports",
    component: require("../screens/FacilityReportsScreen").default
  },
  {
    name: "FacilityAiTools",
    label: "AI Tools",
    icon: "sparkles-outline",
    capabilityKey: "facility.dashboard",
    group: "reports",
    component: require("../app/home/facility/(tabs)/ai-tools").default
  },
  {
    name: "FacilityCommunity",
    label: "Forum / Q&A",
    icon: "chatbubbles-outline",
    capabilityKey: "facility.community",
    group: "support",
    component: require("../screens/FacilityCommunityScreen").default
  },
  {
    name: "FacilityFeed",
    label: "Facility Outreach",
    icon: "megaphone-outline",
    capabilityKey: "facility.feed",
    group: "support",
    component: require("../app/feed").default
  }
];
