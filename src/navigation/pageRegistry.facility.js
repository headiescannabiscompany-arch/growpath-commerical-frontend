// PAGE_REGISTRY_FACILITY: Pages for Facility mode
// Each entry: { name, label, icon, capabilityKey, component }

export const PAGE_REGISTRY_FACILITY = [
  // {
  //   name: "FacilityDashboard",
  //   label: "Dashboard",
  //   icon: "business-outline",
  //   capabilityKey: "facility.dashboard",
  //   component: require("../screens/FacilityDashboardScreen").default
  // },
  // {
  //   name: "FacilityGrows",
  //   label: "Grows",
  //   icon: "leaf-outline",
  //   capabilityKey: "facility.multiGrow",
  //   component: require("../screens/FacilityGrowsScreen").default
  // },
  // {
  //   name: "FacilityPlants",
  //   label: "Plants",
  //   icon: "flower-outline",
  //   capabilityKey: "facility.plants",
  //   component: require("../screens/FacilityPlantsScreen").default
  // },
  // {
  //   name: "FacilityGrowLogs",
  //   label: "Grow Logs",
  //   icon: "book-outline",
  //   capabilityKey: "facility.growLogs",
  //   component: require("../screens/FacilityGrowLogsScreen").default
  // },
  // {
  //   name: "Compliance",
  //   label: "Compliance",
  //   icon: "shield-checkmark-outline",
  //   capabilityKey: "facility.complianceExports",
  //   component: require("../screens/ComplianceScreen").default
  // },
  // {
  //   name: "PhenoHunting",
  //   label: "Pheno Hunting",
  //   icon: "search-outline",
  //   capabilityKey: "facility.phenoTracking",
  //   component: require("../screens/PhenoHuntingScreen").default
  // },
  // {
  //   name: "Tasks",
  //   label: "Tasks",
  //   icon: "checkbox-outline",
  //   capabilityKey: "facility.tasksJobs",
  //   component: require("../screens/FacilityTasksScreen").default
  // },
  {
    name: "Courses",
    label: "Courses",
    icon: "school-outline",
    capabilityKey: "view.courses",
    component: require("../screens/CoursesScreen").default
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
    label: "Feed",
    icon: "megaphone-outline",
    capabilityKey: "view.community.feed",
    component: require("../screens/FeedScreen").default
  },
  // {
  //   name: "Users",
  //   label: "Users",
  //   icon: "people-outline",
  //   capabilityKey: "facility.users",
  //   component: require("../screens/FacilityUsersScreen").default
  // },
  {
    name: "Profile",
    label: "Profile",
    icon: "person-outline",
    capabilityKey: "view.profile",
    component: require("../screens/ProfileScreen").default
  }
];
