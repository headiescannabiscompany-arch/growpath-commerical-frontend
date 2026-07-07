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
    name: "CommercialGrows",
    label: "Evidence & Trials",
    icon: "leaf-outline",
    capabilityKey: "commercial.grows",
    component: require("../app/home/commercial/grows").default
  },
  {
    name: "CommercialProducts",
    label: "Products",
    icon: "pricetags-outline",
    capabilityKey: "commercial.products",
    component: require("../app/home/commercial/products").default
  },
  {
    name: "CommercialProductLines",
    label: "Product Lines",
    icon: "albums-outline",
    capabilityKey: "commercial.products",
    component: require("../app/home/commercial/product-lines").default
  },
  {
    name: "Storefront",
    label: "Storefront",
    icon: "storefront-outline",
    capabilityKey: "commercial.storefront",
    component: require("../screens/StorefrontScreen").default
  },
  {
    name: "CommercialBatchPlanner",
    label: "Batch Planner",
    icon: "flask-outline",
    capabilityKey: "commercial.batchPlanner",
    component: require("../app/home/commercial/batch-planner").default
  },
  {
    name: "CommercialProductTrials",
    label: "Product Trials",
    icon: "analytics-outline",
    capabilityKey: "commercial.trials",
    component: require("../app/home/commercial/trials").default
  },
  {
    name: "Links",
    label: "Links",
    icon: "link-outline",
    capabilityKey: "commercial.links",
    component: require("../screens/LinksScreen").default
  },
  {
    name: "MarketingPlanner",
    label: "Marketing Planner",
    icon: "rocket-outline",
    capabilityKey: "commercial.campaigns",
    component: require("../app/home/commercial/marketing").default
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
    label: "Orders / External Tracking",
    icon: "cart-outline",
    capabilityKey: "commercial.orders",
    component: require("../screens/CommercialOrdersScreen").default
  },
  {
    name: "CommercialInventory",
    label: "Inventory",
    icon: "cube-outline",
    capabilityKey: "commercial.inventory",
    component: require("../app/home/commercial/inventory").default
  },
  {
    name: "Courses",
    label: "Courses",
    icon: "school-outline",
    capabilityKey: "view.courses",
    component: require("../app/home/commercial/courses").default
  },
  {
    name: "Community",
    label: "Forum / Q&A",
    icon: "chatbubbles-outline",
    capabilityKey: "view.community.forum",
    component: require("../app/home/commercial/community").default
  },
  {
    name: "Feed",
    label: "Feed / Campaigns",
    icon: "megaphone-outline",
    capabilityKey: "view.community.feed",
    component: require("../app/feed").default
  },
  {
    name: "CommercialAnalytics",
    label: "Analytics",
    icon: "bar-chart-outline",
    capabilityKey: "commercial.analytics",
    component: require("../app/home/commercial/analytics").default
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
    component: require("../app/home/commercial/profile").default
  }
];
