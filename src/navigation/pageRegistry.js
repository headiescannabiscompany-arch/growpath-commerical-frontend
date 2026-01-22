// Central page registry for all app screens, with capability requirements and navigation config
// Update this file to add/remove screens or change capability gating

import { CAPABILITIES } from "../capabilities/keys";

export const PAGE_REGISTRY = [
  {
    name: "Dashboard",
    component: require("../screens/DashboardScreen").default,
    icon: "home-outline",
    capability: CAPABILITIES.VIEW_DASHBOARD,
    label: "Dashboard"
  },
  {
    name: "Profile",
    component: require("../screens/ProfileScreen").default,
    icon: "person-outline",
    capability: CAPABILITIES.VIEW_PROFILE,
    label: "Profile"
  },
  {
    name: "Courses",
    component: require("../screens/CoursesScreen").default,
    icon: "book-outline",
    capability: CAPABILITIES.VIEW_COURSES,
    label: "Courses"
  },
  {
    name: "Forum",
    component: require("../screens/ForumScreen").default,
    icon: "chatbubble-ellipses-outline",
    capability: CAPABILITIES.VIEW_FORUM,
    label: "Forum"
  }
  // ...add more screens as needed, with capability and config
];

// Helper to get visible pages for a set of capabilities
export function getVisiblePages(userCapabilities) {
  if (Array.isArray(userCapabilities)) {
    return PAGE_REGISTRY.filter((page) => userCapabilities.includes(page.capability));
  }
  if (userCapabilities && typeof userCapabilities === "object") {
    return PAGE_REGISTRY.filter((page) => userCapabilities[page.capability]);
  }
  return [];
}
