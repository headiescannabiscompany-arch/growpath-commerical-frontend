// PAGE_REGISTRY_COMMERCIAL: Pages for Commercial mode
// Each entry: { name, label, icon, capabilityKey, component }

export const PAGE_REGISTRY_COMMERCIAL = [
  {
    name: "CommercialDashboard",
    label: "Dashboard",
    icon: "business-outline",
    capabilityKey: "view.dashboard",
    component: require("../screens/commercial/CommercialDashboardScreen.js").default
  },
  {
    name: "Storefront",
    label: "Storefront",
    icon: "storefront-outline",
    capabilityKey: "seller.storefront",
    component: require("../screens/StorefrontScreen").default
  },
  {
    name: "Links",
    label: "Links",
    icon: "link-outline",
    capabilityKey: "seller.links",
    component: require("../screens/LinksScreen").default
  },
  {
    name: "Campaigns",
    label: "Campaigns",
    icon: "rocket-outline",
    capabilityKey: "seller.campaigns",
    component: require("../screens/CampaignsScreen").default
  },
  {
    name: "SocialTools",
    label: "Social Tools",
    icon: "share-social-outline",
    capabilityKey: "seller.socialComposer",
    component: require("../screens/SocialToolsScreen").default
  },
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
  {
    name: "Team",
    label: "Team",
    icon: "people-outline",
    capabilityKey: "seller.team",
    component: require("../screens/TeamScreen").default
  },
  {
    name: "Tasks",
    label: "Tasks",
    icon: "checkbox-outline",
    capabilityKey: "seller.tasks",
    component: require("../screens/TasksScreen").default
  },
  {
    name: "Profile",
    label: "Profile",
    icon: "person-outline",
    capabilityKey: "view.profile",
    component: require("../screens/ProfileScreen").default
  }
];
