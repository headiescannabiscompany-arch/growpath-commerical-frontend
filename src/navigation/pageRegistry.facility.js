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
    label: "Feed",
    icon: "newspaper-outline",
    capabilityKey: "facility.feed",
    component: require("../screens/FacilityFeedScreen").default
  },
  {
    name: "FacilityProfile",
    label: "Profile",
    icon: "person-outline",
    capabilityKey: "facility.profile",
    component: require("../screens/FacilityProfileScreen").default
  }
];
