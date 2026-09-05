const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

import {
  cancelFacilityPlan as cancelTypedFacilityPlan,
  FACILITY_CANCELLATION_CONFIRMATION
} from "@/api/billing";
import { cancelFacilityPlan as cancelLegacyFacilityPlan } from "@/api/facility";

describe("Facility billing cancellation API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends the exact confirmation with the Facility cancellation request", async () => {
    mockApiRequest.mockResolvedValue({ data: { cancelAtPeriodEnd: true } });

    await expect(
      cancelTypedFacilityPlan("facility-1", FACILITY_CANCELLATION_CONFIRMATION)
    ).resolves.toEqual({ cancelAtPeriodEnd: true });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/facility-billing/cancel", {
      method: "POST",
      body: {
        facilityId: "facility-1",
        confirmation: "CANCEL FACILITY RENEWAL"
      }
    });
  });

  it("does not call the server when confirmation is absent or wrong", async () => {
    await expect(cancelTypedFacilityPlan("facility-1", "")).rejects.toThrow(
      "Confirm Facility cancellation before changing Stripe renewal."
    );
    await expect(cancelTypedFacilityPlan("facility-1", "CANCEL RENEWAL")).rejects.toThrow(
      "Confirm Facility cancellation before changing Stripe renewal."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("applies the same confirmation contract to the legacy Facility client", async () => {
    mockApiRequest.mockResolvedValue({ data: { cancelAtPeriodEnd: true } });

    await expect(
      cancelLegacyFacilityPlan("facility-1", FACILITY_CANCELLATION_CONFIRMATION)
    ).resolves.toEqual({ success: true, data: { cancelAtPeriodEnd: true } });
    expect(mockApiRequest).toHaveBeenCalledWith("/facility-billing/cancel", {
      method: "POST",
      body: {
        facilityId: "facility-1",
        confirmation: "CANCEL FACILITY RENEWAL"
      }
    });

    jest.clearAllMocks();
    await expect(cancelLegacyFacilityPlan("facility-1", "")).resolves.toEqual({
      success: false,
      message: "Confirm Facility cancellation before changing Stripe renewal."
    });
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
