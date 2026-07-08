import { PAGE_REGISTRY_FACILITY } from "../../src/navigation/pageRegistry.facility";
import { PAGE_REGISTRY_PERSONAL } from "../../src/navigation/pageRegistry.personal";
import { TAB_CONFIG } from "../../src/navigation/tabConfig";
import { getMenuItems } from "../../src/config/menuConfig";

function byName(registry, name) {
  return registry.find((item) => item.name === name);
}

describe("feed/forum navigation separation", () => {
  it("routes personal feed access to campaign placements, not the legacy community feed", () => {
    const feed = byName(PAGE_REGISTRY_PERSONAL, "Feed");

    expect(feed.label).toBe("Campaigns");
    expect(feed.component?.name).toBe("CommercialFeedRoute");
  });

  it("routes facility feed access to outreach campaigns", () => {
    const feed = byName(PAGE_REGISTRY_FACILITY, "FacilityFeed");

    expect(feed.label).toBe("Facility Outreach");
    expect(feed.component?.name).toBe("CommercialFeedRoute");
  });

  it("exposes facility integrations as the room import entry point", () => {
    const integrations = byName(PAGE_REGISTRY_FACILITY, "FacilityIntegrations");

    expect(integrations).toMatchObject({
      label: "Integrations",
      capabilityKey: "facility.rooms"
    });
    expect(integrations.component?.name).toBe("FacilityIntegrationsRoute");
  });

  it("uses shared Schedule, Alert Center, and Notification Center routes across personal and facility registries", () => {
    const personalSchedule = byName(PAGE_REGISTRY_PERSONAL, "Calendar");
    const personalAlerts = byName(PAGE_REGISTRY_PERSONAL, "Alerts");
    const personalNotifications = byName(PAGE_REGISTRY_PERSONAL, "Notifications");
    const facilitySchedule = byName(PAGE_REGISTRY_FACILITY, "FacilitySchedule");
    const facilityAlerts = byName(PAGE_REGISTRY_FACILITY, "FacilityAlerts");
    const facilityNotifications = byName(PAGE_REGISTRY_FACILITY, "FacilityNotifications");

    expect(personalSchedule).toMatchObject({
      label: "Schedule / Agenda"
    });
    expect(personalSchedule.component?.name).toBe("HomeScheduleRoute");
    expect(facilitySchedule).toMatchObject({
      label: "Schedule / Agenda"
    });
    expect(facilitySchedule.component?.name).toBe("HomeScheduleRoute");
    expect(personalAlerts).toMatchObject({
      label: "Alerts"
    });
    expect(personalAlerts.component?.name).toBe("AlertCenterRoute");
    expect(facilityAlerts).toMatchObject({
      label: "Alerts"
    });
    expect(facilityAlerts.component?.name).toBe("AlertCenterRoute");
    expect(personalNotifications).toMatchObject({
      label: "Notifications"
    });
    expect(personalNotifications.component?.name).toBe("NotificationCenterRoute");
    expect(facilityNotifications).toMatchObject({
      label: "Notifications"
    });
    expect(facilityNotifications.component?.name).toBe("NotificationCenterRoute");
  });

  it("keeps shared tab and capability menus off the legacy discussion feed", () => {
    const feedTab = TAB_CONFIG.find((item) => item.key === "FeedTab");
    const forumTab = TAB_CONFIG.find((item) => item.key === "ForumTab");
    const menuItems = getMenuItems({
      capabilities: { canUseFeed: true, canUseCommercial: true, canUseMarketplace: true },
      mode: "personal"
    });
    const feedMenu = menuItems.find((item) => item.key === "feed");
    const contentMenu = menuItems.find((item) => item.key === "storefrontOffers");

    expect(feedTab).toMatchObject({
      label: "Campaigns",
      component: "CommercialFeedRoute"
    });
    expect(forumTab).toMatchObject({
      label: "Forum / Q&A",
      component: "ForumScreen"
    });
    expect(feedMenu).toMatchObject({
      label: "Campaigns",
      route: "CommercialFeedRoute"
    });
    expect(contentMenu).toMatchObject({
      label: "Storefront Offers",
      route: "Storefront"
    });
    expect(menuItems.map((item) => item.label)).not.toContain("Marketplace");
    expect(menuItems.map((item) => item.route)).not.toContain("MarketplaceScreen");
  });
});
