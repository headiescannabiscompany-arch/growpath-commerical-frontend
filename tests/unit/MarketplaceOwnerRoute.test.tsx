import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render } from "@testing-library/react-native";
import {
  applyPlanCapabilities,
  getEffectivePlan
} from "@/entitlements/EntitlementsProvider";
import { buildCan } from "@/entitlements/can";
import { CAPABILITY_KEYS } from "@/entitlements/capabilityKeys";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockUser = { _id: "owner-1" };
const mockEnt = { ready: true, can: jest.fn<boolean, [string | string[]]>() };
let mockOwnerProps: any;
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: jest.requireActual("@/entitlements/capabilityKeys").CAPABILITY_KEYS,
  useEntitlements: () => mockEnt
}));
jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));
jest.mock("@/screens/commercial/ContentMarketplaceScreen", () => (props: any) => {
  mockOwnerProps = props;
  return null;
});
import OwnerRoute from "@/app/home/commercial/storefront/offers";

function actualPlanCan(plan: string, status = "active") {
  const capabilities: Record<string, boolean> = {};
  applyPlanCapabilities(capabilities, getEffectivePlan(plan, status), "commercial");
  return buildCan(capabilities);
}

describe("existing offer author route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOwnerProps = null;
    mockUser = { _id: "owner-1" };
    mockEnt.ready = true;
    mockEnt.can.mockImplementation(actualPlanCan("commercial"));
  });
  it("reuses the owner screen and the existing purchase-aware public detail", () => {
    render(<OwnerRoute />);
    expect(mockOwnerProps.initialTab).toBe("uploads");
    mockOwnerProps.onBack();
    expect(mockReplace).toHaveBeenCalledWith("/home/commercial/more");
    mockOwnerProps.onOpenOffer("offer-1");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/marketplace",
      params: { content: "offer-1" }
    });
  });
  it.each(["active", "trialing"])(
    "permits the existing Commercial owner capability for %s access without an admin-only WRITE key",
    (status) => {
      const can = actualPlanCan("commercial", status);
      expect(can(CAPABILITY_KEYS.STORE_FRONT_VIEW)).toBe(true);
      expect(can(CAPABILITY_KEYS.STORE_FRONT_WRITE)).toBe(false);
      mockEnt.can.mockImplementation(can);
      render(<OwnerRoute />);
      expect(mockOwnerProps?.initialTab).toBe("uploads");
    }
  );
  it("adds a discoverable owner link without a new top-level navigation tab", () => {
    const layout = fs.readFileSync(
      path.join(process.cwd(), "src/app/home/commercial/_layout.tsx"),
      "utf8"
    );
    const more = fs.readFileSync(
      path.join(process.cwd(), "src/app/home/commercial/more.tsx"),
      "utf8"
    );
    expect(layout).toMatch(
      /name="storefront\/offers"\s+options=\{\{[^}]*href: null[^}]*headerShown: false/
    );
    expect(more).toContain('href: "/home/commercial/storefront/offers"');
    expect(more).toContain('label: "My Storefront Offers"');
  });
  it("does not mount authoring before entitlements are ready or without owner capability", () => {
    mockEnt.ready = false;
    const screen = render(<OwnerRoute />);
    expect(mockOwnerProps).toBeNull();
    mockEnt.ready = true;
    mockEnt.can.mockReturnValue(false);
    screen.rerender(<OwnerRoute />);
    expect(mockOwnerProps).toBeNull();
    expect(mockEnt.can).toHaveBeenCalledWith("STORE_FRONT_VIEW");
  });
  it.each([
    ["free", "active"],
    ["pro", "active"],
    ["commercial", "canceled"],
    ["commercial", "expired"],
    ["facility", "canceled"]
  ])("does not broaden owner access for %s/%s", (plan, status) => {
    mockEnt.can.mockImplementation(actualPlanCan(plan, status));
    render(<OwnerRoute />);
    expect(mockOwnerProps).toBeNull();
  });
  it("matches existing owner access for an active individual Facility plan in Commercial", () => {
    mockEnt.can.mockImplementation(actualPlanCan("facility"));
    render(<OwnerRoute />);
    expect(mockOwnerProps?.initialTab).toBe("uploads");
  });
  it("requires an authenticated owner identity even with an owner capability", () => {
    mockUser = { _id: "" };
    render(<OwnerRoute />);
    expect(mockOwnerProps).toBeNull();
  });
  it("keys owner state to the authenticated identity rather than reusing another seller's draft", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/home/commercial/storefront/offers.tsx"),
      "utf8"
    );
    expect(source).toContain('String(user?._id || user?.id || "")');
    expect(source).toContain("key={ownerId}");
  });
});
