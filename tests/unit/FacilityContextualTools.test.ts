import { facilityToolHref } from "@/components/facility/FacilityContextualTools";

describe("facilityToolHref", () => {
  it("opens one shared tool engine with facility record context", () => {
    const href = facilityToolHref("environment", {
      source: "facility-grow-detail",
      facilityId: "facility-1",
      growId: "grow-2",
      roomId: "room-3",
      plantId: "",
      prompt: "Review this grow"
    });

    expect(href).toBe(
      "/home/facility/tools/environment?source=facility-grow-detail&workspace=facility&facilityId=facility-1&growId=grow-2&roomId=room-3&prompt=Review+this+grow"
    );
  });
});
