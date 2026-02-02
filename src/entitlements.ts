export const ENTITLEMENTS = {
  free: {
    plants: true,
    tasks: false,
    inventory: false,
    team: false,
    dashboards: "basic",
    trends: false
  },
  pro: {
    plants: true,
    tasks: true,
    inventory: false,
    team: false,
    dashboards: "full",
    trends: false
  },
  commercial: {
    plants: true,
    tasks: true,
    inventory: true,
    team: false,
    dashboards: "full",
    trends: false
  },
  facility: {
    plants: true,
    tasks: true,
    inventory: true,
    team: true,
    dashboards: "full",
    trends: true
  }
};
