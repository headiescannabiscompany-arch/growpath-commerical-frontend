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
    name: "CommercialGrows",
    label: "Product Evidence & Trials",
    icon: "leaf-outline",
    capabilityKey: "commercial.grows",
    primary: false,
    group: "products",
    supportSurface: true,
    component: require("../app/home/commercial/grows").default
  },
  {
    name: "CommercialProducts",
    label: "Products",
    icon: "pricetags-outline",
    capabilityKey: "commercial.products",
    primary: true,
    component: require("../app/home/commercial/products").default
  },
  {
    name: "CommercialProductLines",
    label: "Product Lines",
    icon: "albums-outline",
    capabilityKey: "commercial.products",
    primary: false,
    group: "products",
    supportSurface: true,
    component: require("../app/home/commercial/product-lines").default
  },
  {
    name: "Storefront",
    label: "Storefront",
    icon: "storefront-outline",
    capabilityKey: "commercial.storefront",
    primary: true,
    component: require("../app/home/commercial/storefront").default
  },
  {
    name: "CommercialBatchPlanner",
    label: "Batch Planner",
    icon: "flask-outline",
    capabilityKey: "commercial.batchPlanner",
    primary: false,
    group: "products",
    supportSurface: true,
    component: require("../app/home/commercial/batch-planner").default
  },
  {
    name: "CommercialProductTrials",
    label: "Product Trials",
    icon: "analytics-outline",
    capabilityKey: "commercial.trials",
    primary: false,
    group: "products",
    supportSurface: true,
    component: require("../app/home/commercial/trials").default
  },
  {
    name: "Links",
    label: "Links",
    icon: "link-outline",
    capabilityKey: "commercial.links",
    primary: false,
    group: "profile",
    supportSurface: true,
    component: require("../screens/LinksScreen").default
  },
  {
    name: "MarketingPlanner",
    label: "Marketing Planner",
    icon: "rocket-outline",
    capabilityKey: "commercial.campaigns",
    primary: false,
    group: "feed",
    supportSurface: true,
    component: require("../app/home/commercial/marketing").default
  },
  {
    name: "SocialTools",
    label: "Social Tools",
    icon: "share-social-outline",
    capabilityKey: "commercial.socialTools",
    primary: false,
    group: "profile",
    supportSurface: true,
    component: require("../screens/SocialToolsScreen").default
  },
  {
    name: "CommercialOrders",
    label: "Orders / External Tracking",
    icon: "cart-outline",
    capabilityKey: "commercial.orders",
    primary: true,
    component: require("../app/home/commercial/orders").default
  },
  {
    name: "CommercialInventory",
    label: "Inventory",
    icon: "cube-outline",
    capabilityKey: "commercial.inventory",
    primary: false,
    group: "products",
    supportSurface: true,
    component: require("../app/home/commercial/inventory").default
  },
  {
    name: "Courses",
    label: "Courses",
    icon: "school-outline",
    capabilityKey: "view.courses",
    primary: true,
    component: require("../app/home/commercial/courses").default
  },
  {
    name: "CommercialLives",
    label: "Lives",
    icon: "videocam-outline",
    capabilityKey: "commercial.lives",
    primary: true,
    component: require("../app/home/commercial/lives").default
  },
  {
    name: "Community",
    label: "Forum / Q&A",
    icon: "chatbubbles-outline",
    capabilityKey: "view.community.forum",
    primary: true,
    component: require("../app/home/commercial/community").default
  },
  {
    name: "Feed",
    label: "Feed / Campaigns",
    icon: "megaphone-outline",
    capabilityKey: "view.community.feed",
    primary: true,
    component: require("../app/feed").default
  },
  {
    name: "CommercialAnalytics",
    label: "Analytics",
    icon: "bar-chart-outline",
    capabilityKey: "commercial.analytics",
    primary: true,
    component: require("../app/home/commercial/analytics").default
  },
  {
    name: "CommercialSchedule",
    label: "Schedule / Agenda",
    icon: "calendar-outline",
    capabilityKey: "commercial.tasks",
    primary: true,
    component: require("../app/home/schedule").default
  },
  {
    name: "CommercialAlerts",
    label: "Alerts",
    icon: "alert-circle-outline",
    capabilityKey: "commercial.tasks",
    primary: true,
    component: require("../app/home/alerts").default
  },
  {
    name: "CommercialNotifications",
    label: "Notifications",
    icon: "notifications-outline",
    capabilityKey: "commercial.tasks",
    primary: true,
    component: require("../app/home/notifications").default
  },
  {
    name: "Tasks",
    label: "Tasks",
    icon: "checkbox-outline",
    capabilityKey: "commercial.tasks",
    primary: true,
    component: require("../app/home/commercial/tasks").default
  },
  {
    name: "Profile",
    label: "Profile",
    icon: "person-outline",
    capabilityKey: "view.profile",
    primary: true,
    component: require("../app/home/commercial/profile").default
  }
];
