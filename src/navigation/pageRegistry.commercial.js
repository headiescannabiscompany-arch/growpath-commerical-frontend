// PAGE_REGISTRY_COMMERCIAL: Pages for Commercial mode
// Each entry: { name, label, icon, capabilityKey, component }

export const PAGE_REGISTRY_COMMERCIAL = [
  {
    name: "CommercialDashboard",
    label: "Dashboard",
    icon: "business-outline",
    capabilityKey: "commercial.dashboard",
    primary: true,
    component: require("../screens/commercial/CommercialDashboardScreen.js").default
  },
  {
    name: "Profile",
    label: "Setup",
    icon: "person-outline",
    capabilityKey: "view.profile",
    primary: true,
    group: "setup",
    component: require("../app/home/commercial/profile").default
  },
  {
    name: "CommercialProducts",
    label: "Product Catalog",
    icon: "pricetags-outline",
    capabilityKey: "commercial.products",
    primary: true,
    group: "catalog",
    component: require("../app/home/commercial/products").default
  },
  {
    name: "CommercialProductLines",
    label: "Product Lines",
    icon: "albums-outline",
    capabilityKey: "commercial.products",
    primary: false,
    group: "catalog",
    supportSurface: true,
    component: require("../app/home/commercial/product-lines").default
  },
  {
    name: "CommercialBatchPlanner",
    label: "Batch Planner",
    icon: "flask-outline",
    capabilityKey: "commercial.batchPlanner",
    primary: false,
    group: "catalog",
    supportSurface: true,
    component: require("../app/home/commercial/batch-planner").default
  },
  {
    name: "CommercialInventory",
    label: "Inventory Support",
    icon: "cube-outline",
    capabilityKey: "commercial.inventory",
    primary: false,
    group: "catalog",
    supportSurface: true,
    component: require("../app/home/commercial/inventory").default
  },
  {
    name: "CommercialEvidenceRuns",
    label: "Evidence Runs",
    icon: "leaf-outline",
    capabilityKey: "commercial.grows",
    primary: false,
    group: "evidence",
    supportSurface: true,
    component: require("../app/home/commercial/evidence-runs").default
  },
  {
    name: "CommercialProductTrials",
    label: "Product Trials",
    icon: "analytics-outline",
    capabilityKey: "commercial.trials",
    primary: false,
    group: "evidence",
    supportSurface: true,
    component: require("../app/home/commercial/trials").default
  },
  {
    name: "Storefront",
    label: "Storefront",
    icon: "storefront-outline",
    capabilityKey: "commercial.storefront",
    primary: true,
    group: "storefront",
    component: require("../app/home/commercial/storefront").default
  },
  {
    name: "Courses",
    label: "Courses",
    icon: "school-outline",
    capabilityKey: "view.courses",
    primary: true,
    group: "education",
    component: require("../app/home/commercial/courses").default
  },
  {
    name: "CommercialLives",
    label: "Lives",
    icon: "videocam-outline",
    capabilityKey: "commercial.lives",
    primary: true,
    group: "education",
    component: require("../app/home/commercial/lives").default
  },
  {
    name: "Feed",
    label: "Feed / Campaigns",
    icon: "megaphone-outline",
    capabilityKey: "view.community.feed",
    primary: true,
    group: "campaigns",
    component: require("../app/home/commercial/feed").default
  },
  {
    name: "MarketingPlanner",
    label: "Marketing Planner",
    icon: "rocket-outline",
    capabilityKey: "commercial.campaigns",
    primary: false,
    group: "campaigns",
    supportSurface: true,
    component: require("../app/home/commercial/marketing").default
  },
  {
    name: "Community",
    label: "Forum / Q&A",
    icon: "chatbubbles-outline",
    capabilityKey: "view.community.forum",
    primary: true,
    group: "campaigns",
    component: require("../app/home/commercial/community").default
  },
  {
    name: "SocialTools",
    label: "External Channels",
    icon: "share-social-outline",
    capabilityKey: "commercial.socialTools",
    primary: false,
    group: "campaigns",
    supportSurface: true,
    component: require("../screens/SocialToolsScreen").default
  },
  {
    name: "CommercialOrders",
    label: "Orders",
    icon: "cart-outline",
    capabilityKey: "commercial.orders",
    primary: true,
    group: "sales",
    component: require("../app/home/commercial/orders").default
  },
  {
    name: "CommercialAnalytics",
    label: "Analytics",
    icon: "bar-chart-outline",
    capabilityKey: "commercial.analytics",
    primary: true,
    group: "analytics",
    component: require("../app/home/commercial/analytics").default
  },
  {
    name: "Links",
    label: "Links",
    icon: "link-outline",
    capabilityKey: "commercial.links",
    primary: false,
    group: "operations",
    supportSurface: true,
    component: require("../screens/LinksScreen").default
  },
  {
    name: "CommercialSchedule",
    label: "Schedule / Agenda",
    icon: "calendar-outline",
    capabilityKey: "commercial.tasks",
    primary: true,
    group: "operations",
    component: require("../app/home/schedule").default
  },
  {
    name: "CommercialAlerts",
    label: "Alerts",
    icon: "alert-circle-outline",
    capabilityKey: "commercial.tasks",
    primary: true,
    group: "operations",
    component: require("../app/home/alerts").default
  },
  {
    name: "CommercialNotifications",
    label: "Notifications",
    icon: "notifications-outline",
    capabilityKey: "commercial.tasks",
    primary: true,
    group: "operations",
    component: require("../app/home/notifications").default
  },
  {
    name: "Tasks",
    label: "Tasks",
    icon: "checkbox-outline",
    capabilityKey: "commercial.tasks",
    primary: true,
    group: "operations",
    component: require("../app/home/commercial/tasks").default
  }
];
