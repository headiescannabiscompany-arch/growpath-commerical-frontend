// Menu config driven by capabilities, not role/mode
// Usage: getMenuItems({ capabilities, mode })

export function getMenuItems({ capabilities, mode }) {
  const items = [];

  // Dashboard/Home
  if (capabilities.canUseGrowAreas || capabilities.canUsePlants) {
    items.push({
      key: "dashboard",
      label: "Dashboard",
      icon: "home",
      route: "DashboardScreen"
    });
  }

  // Feed
  if (capabilities.canUseFeed) {
    items.push({
      key: "feed",
      label: "Feed",
      icon: "rss",
      route: "FeedScreen"
    });
  }

  // Grow Areas (label changes by mode)
  if (capabilities.canUseGrowAreas) {
    items.push({
      key: "growAreas",
      label:
        mode === "facility"
          ? "Rooms/Zones"
          : mode === "personal"
            ? "Tents"
            : "Grow Areas",
      icon: "grid",
      route: "GrowAreasScreen"
    });
  }

  // Plants
  if (capabilities.canUsePlants) {
    items.push({
      key: "plants",
      label: "Plants",
      icon: "leaf",
      route: "PlantsScreen"
    });
  }

  // Logs
  if (capabilities.canUseGrowLogs) {
    items.push({
      key: "logs",
      label: "Logs",
      icon: "book",
      route: "LogsScreen"
    });
  }

  // Tasks
  if (capabilities.canUseTasks) {
    items.push({
      key: "tasks",
      label: "Tasks",
      icon: "check-square",
      route: "TasksScreen"
    });
  }

  // Tools
  if (capabilities.canUseToolsHub) {
    items.push({
      key: "tools",
      label: "Tools",
      icon: "tool",
      route: "ToolsScreen"
    });
  }

  // Courses
  if (capabilities.canUseCourses) {
    items.push({
      key: "courses",
      label: "Courses",
      icon: "book-open",
      route: "CoursesScreen"
    });
  }

  // Forum
  if (capabilities.canUseForum) {
    items.push({
      key: "forum",
      label: "Forum",
      icon: "message-circle",
      route: "ForumScreen"
    });
  }

  // Facility cluster
  if (capabilities.canUseFacility) {
    if (capabilities.canManageRoomsZones) {
      items.push({
        key: "rooms",
        label: "Rooms/Zones",
        icon: "layers",
        route: "RoomsScreen"
      });
    }
    if (capabilities.canManageTeam) {
      items.push({
        key: "team",
        label: "Team",
        icon: "users",
        route: "TeamScreen"
      });
    }
    if (capabilities.canUseComplianceAnalytics) {
      items.push({
        key: "compliance",
        label: "Compliance",
        icon: "shield",
        route: "ComplianceScreen"
      });
    }
    if (capabilities.canUseMetrc) {
      items.push({
        key: "metrc",
        label: "Metrc",
        icon: "database",
        route: "MetrcScreen"
      });
    }
  }

  // Commercial cluster
  if (capabilities.canUseCommercial) {
    if (capabilities.canUseCommercialMetrics) {
      items.push({
        key: "metrics",
        label: "Business Metrics",
        icon: "bar-chart",
        route: "MetricsScreen"
      });
    }
    if (capabilities.canUseAdsManager) {
      items.push({
        key: "ads",
        label: "Ads Manager",
        icon: "dollar-sign",
        route: "AdsScreen"
      });
    }
    if (capabilities.canUseVendorMetrics) {
      items.push({
        key: "vendorMetrics",
        label: "Vendor Metrics",
        icon: "activity",
        route: "VendorMetricsScreen"
      });
    }
    if (capabilities.canUseMarketplace) {
      items.push({
        key: "marketplace",
        label: "Marketplace",
        icon: "shopping-cart",
        route: "MarketplaceScreen"
      });
    }
  }

  // Profile/Settings (always last)
  items.push({
    key: "profile",
    label: "Profile",
    icon: "user",
    route: "ProfileScreen"
  });

  return items;
}
