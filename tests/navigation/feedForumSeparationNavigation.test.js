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

  it("uses shared Schedule and Alert Center routes across personal and facility registries", () => {
    const personalSchedule = byName(PAGE_REGISTRY_PERSONAL, "Calendar");
    const personalAlerts = byName(PAGE_REGISTRY_PERSONAL, "Alerts");
    const facilitySchedule = byName(PAGE_REGISTRY_FACILITY, "FacilitySchedule");
    const facilityAlerts = byName(PAGE_REGISTRY_FACILITY, "FacilityAlerts");

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
  });

  it("keeps shared tab and capability menus off the legacy discussion feed", () => {
    const feedTab = TAB_CONFIG.find((item) => item.key === "FeedTab");
    const menuItems = getMenuItems({
      capabilities: { canUseFeed: true },
      mode: "personal"
    });
    const feedMenu = menuItems.find((item) => item.key === "feed");

    expect(feedTab).toMatchObject({
      label: "Campaigns",
      component: "CommercialFeedRoute"
    });
    expect(feedMenu).toMatchObject({
      label: "Campaigns",
      route: "CommercialFeedRoute"
    });
  });
});
