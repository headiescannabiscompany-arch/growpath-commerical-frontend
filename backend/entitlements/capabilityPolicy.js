// backend/entitlements/capabilityPolicy.js

// Base capability maps for each plan/mode
const personalFree = {
  grows: true,
  growLog: true,
  plants: true,
  diagnose_basic: true,
  tools: true,
  feed: true,
  forum: true,
  analytics: false,
  calendar: false,
  tasks: false,
  automation: false,
  team: false,
  inventory: false
};

const personalPro = {
  ...personalFree,
  analytics: true,
  calendar: true,
  tasks: true,
  diagnose_ai: true,
  export: true
};

const commercial = {
  storefront: true,
  links: true,
  campaigns: true,
  socialTools: true,
  orders: true,
  inventory: true,
  courses: true,
  feed: true,
  forum: true
};

const facilityBase = {
  rooms: true,
  plants: true,
  tasks: true,
  inventory: true,
  team: true,
  reports: true,
  compliance: true,
  automation: true,
  notifications: true,
  community: true,
  feed: true
};

// Facility role overlays
const facilityRoles = {
  OWNER: {
    facilitySettings: true,
    teamManage: true,
    insightsRun: true,
    integrations: true,
    automationEdit: true
  },
  MANAGER: {
    teamManage: false,
    automationEdit: true,
    insightsRun: false
  },
  STAFF: {
    teamManage: false,
    automationEdit: false,
    insightsRun: false,
    reports: false
  }
};

function resolveCapabilities(user) {
  let caps = {};
  if (user.plan === "free") caps = { ...personalFree };
  if (user.plan === "pro") caps = { ...personalPro };
  if (user.plan === "commercial") caps = { ...commercial };
  if (user.plan === "facility") caps = { ...facilityBase };

  if (user.mode === "facility") {
    const roleCaps = facilityRoles[user.facilityRole] || {};
    caps = { ...caps, ...roleCaps };
  }
  return caps;
}

module.exports = {
  resolveCapabilities
};
