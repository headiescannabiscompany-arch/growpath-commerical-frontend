// PAGE_REGISTRY_FACILITY: Pages for Facility mode
// Each entry: { name, label, icon, capabilityKey, component }

export const PAGE_REGISTRY_FACILITY = [
  {
    name: "FacilityDashboard",
    label: "Dashboard",
    icon: "grid-outline",
    capabilityKey: "facility.dashboard",
    component: require("../screens/FacilityDashboardScreen").default
  },
  {
    name: "FacilityRooms",
    label: "Rooms",
    icon: "home-outline",
    capabilityKey: "facility.rooms",
    component: require("../screens/FacilityRoomsScreen").default
  },
  {
    name: "FacilityIntegrations",
    label: "Integrations",
    icon: "hardware-chip-outline",
    capabilityKey: "facility.rooms",
    component: require("../app/home/facility/(tabs)/integrations").default
  },
  {
    name: "FacilityPlants",
    label: "Plants",
    icon: "leaf-outline",
    capabilityKey: "facility.plants",
    component: require("../screens/FacilityPlantsScreen").default
  },
  {
    name: "FacilityTasks",
    label: "Tasks",
    icon: "checkmark-done-outline",
    capabilityKey: "facility.tasks",
    component: require("../screens/FacilityTasksScreen").default
  },
  {
    name: "FacilitySchedule",
    label: "Schedule / Agenda",
    icon: "calendar-outline",
    capabilityKey: "facility.tasks",
    component: require("../app/home/schedule").default
  },
  {
    name: "FacilityAlerts",
    label: "Alerts",
    icon: "alert-circle-outline",
    capabilityKey: "facility.tasks",
    component: require("../app/home/alerts").default
  },
  {
    name: "FacilityNotifications",
    label: "Notifications",
    icon: "notifications-outline",
    capabilityKey: "facility.tasks",
    component: require("../app/home/notifications").default
  },
  {
    name: "FacilityInventory",
    label: "Inventory",
    icon: "cube-outline",
    capabilityKey: "facility.inventory",
    component: require("../screens/FacilityInventoryScreen").default
  },
  {
    name: "FacilityTeam",
    label: "Team",
    icon: "people-outline",
    capabilityKey: "facility.team",
    component: require("../screens/FacilityTeamScreen").default
  },
  {
    name: "FacilityReports",
    label: "Reports",
    icon: "bar-chart-outline",
    capabilityKey: "facility.reports",
    component: require("../screens/FacilityReportsScreen").default
  },
  {
    name: "FacilityCommunity",
    label: "Community",
    icon: "chatbubbles-outline",
    capabilityKey: "facility.community",
    component: require("../screens/FacilityCommunityScreen").default
  },
  {
    name: "FacilityFeed",
    label: "Facility Outreach",
    icon: "megaphone-outline",
    capabilityKey: "facility.feed",
    component: require("../app/feed").default
  },
  {
    name: "FacilityProfile",
    label: "Profile",
    icon: "person-outline",
    capabilityKey: "facility.profile",
    component: require("../screens/FacilityProfileScreen").default
  }
];
