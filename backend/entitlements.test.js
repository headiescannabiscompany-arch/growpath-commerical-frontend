const {
  CAP,
  can,
  canInFacilityRole,
  hasCap,
  requireCapability,
  requireCapabilityMiddleware
} = require("./entitlements");

describe("backend entitlement capability checks", () => {
  test("hasCap only passes when the capability is present", () => {
    expect(hasCap({ capabilities: [CAP.TASKS_WRITE] }, CAP.TASKS_WRITE)).toBe(
      true
    );
    expect(hasCap({ capabilities: [] }, CAP.TASKS_WRITE)).toBe(false);
  });

  test("facility capabilities also require an allowed facility role", () => {
    expect(canInFacilityRole(CAP.TASKS_WRITE, "MANAGER")).toBe(true);
    expect(canInFacilityRole(CAP.TASKS_WRITE, "STAFF")).toBe(true);
    expect(canInFacilityRole(CAP.TASKS_WRITE, "VIEWER")).toBe(false);
    expect(
      can(
        { capabilities: [CAP.TASKS_WRITE], facilityRole: "MANAGER" },
        CAP.TASKS_WRITE
      )
    ).toBe(true);
    expect(
      can(
        { capabilities: [CAP.TASKS_WRITE], facilityRole: "VIEWER" },
        CAP.TASKS_WRITE
      )
    ).toBe(false);
  });

  test("requireCapability returns a 403 error when disabled", () => {
    const err = requireCapability(
      { capabilities: [], facilityRole: "MANAGER" },
      CAP.TASKS_WRITE
    );

    expect(err).toMatchObject({
      code: "CAPABILITY_REQUIRED",
      statusCode: 403,
      capability: CAP.TASKS_WRITE
    });
  });

  test("requireCapability allows enabled capability", () => {
    expect(
      requireCapability(
        { capabilities: [CAP.TASKS_WRITE], facilityRole: "MANAGER" },
        CAP.TASKS_WRITE
      )
    ).toBeNull();
  });

  test("middleware rejects a disabled TASKS_WRITE request with 403", () => {
    const req = {
      ctx: {
        entitlements: {
          capabilities: [],
          facilityRole: "MANAGER"
        }
      }
    };
    const next = jest.fn();

    requireCapabilityMiddleware(CAP.TASKS_WRITE)(req, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        capability: CAP.TASKS_WRITE,
        code: "CAPABILITY_REQUIRED",
        message: `Missing capability: ${CAP.TASKS_WRITE}`
      })
    );
  });

  test("middleware allows an enabled TASKS_WRITE request", () => {
    const req = {
      ctx: {
        entitlements: {
          capabilities: [CAP.TASKS_WRITE],
          facilityRole: "MANAGER"
        }
      }
    };
    const next = jest.fn();

    requireCapabilityMiddleware(CAP.TASKS_WRITE)(req, {}, next);

    expect(next).toHaveBeenCalledWith();
  });
});
