// PAGE_REGISTRY_COMMERCIAL: Pages for Commercial mode
// Each entry: { name, label, icon, capabilityKey, component }

export const PAGE_REGISTRY_COMMERCIAL = [
  {
    name: "CommercialDashboard",
    label: "Dashboard",
    icon: "business-outline",
    capabilityKey: "commercial.dashboard",
    component: require("../screens/commercial/CommercialDashboardScreen.js").default
  },
  {
    name: "Storefront",
    label: "Storefront",
    icon: "storefront-outline",
    capabilityKey: "commercial.storefront",
    component: require("../screens/StorefrontScreen").default
  },
  {
    name: "Links",
    label: "Links",
    icon: "link-outline",
    capabilityKey: "commercial.links",
    component: require("../screens/LinksScreen").default
  },
  {
    name: "Campaigns",
    label: "Campaigns",
    icon: "rocket-outline",
    capabilityKey: "commercial.campaigns",
    component: require("../screens/CampaignsScreen").default
  },
  {
    name: "SocialTools",
    label: "Social Tools",
    icon: "share-social-outline",
    capabilityKey: "commercial.socialTools",
    component: require("../screens/SocialToolsScreen").default
  },
  {
    name: "CommercialOrders",
    label: "Orders",
    icon: "cart-outline",
    capabilityKey: "commercial.orders",
    component: require("../screens/CommercialOrdersScreen").default
  },
  {
    name: "CommercialInventory",
    label: "Inventory",
    icon: "cube-outline",
    capabilityKey: "commercial.inventory",
    component: require("../screens/CommercialInventoryScreen").default
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
    name: "Tasks",
    label: "Tasks",
    icon: "checkbox-outline",
    capabilityKey: "commercial.tasks",
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
