import React from "react";
import { render } from "@testing-library/react-native";
import fs from "fs";
import path from "path";

import { createAcceptFacilityInviteStyles } from "@/app/accept-facility-invite";
import CreateFacilityScreen, {
  createFacilityStyles
} from "@/app/onboarding/create-facility";
import JoinFacilityScreen, {
  createJoinFacilityStyles
} from "@/app/onboarding/join-facility";
import { getThemePalette } from "@/theme/appTheme";

const mockReplace = jest.fn();
const mockEntitlements: { ready: boolean; facilityId: string | null } = {
  ready: true,
  facilityId: "facility-1"
};

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ isHydrating: false, token: "session-token" })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

jest.mock("@/facility/FacilityProvider", () => ({
  useFacility: () => ({ selectFacility: jest.fn() })
}));

jest.mock("@/hooks/useCreateFacility", () => ({
  useCreateFacility: () => ({
    isPending: false,
    isError: false,
    mutate: jest.fn()
  })
}));

jest.mock("@/components/layout/AppPage", () => {
  const ReactModule = require("react");
  const { Text, View } = require("react-native");
  return ({ header, children, backFallbackHref }: any) =>
    ReactModule.createElement(
      View,
      null,
      ReactModule.createElement(Text, null, `Shared Back ${backFallbackHref}`),
      header,
      children
    );
});

jest.mock("@/components/layout/AppCard", () => {
  const ReactModule = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => ReactModule.createElement(View, null, children);
});

describe("Facility entry routes", () => {
  beforeEach(() => {
    mockEntitlements.facilityId = "facility-1";
  });

  it("does not expose join or create forms to an already-connected account", () => {
    const join = render(<JoinFacilityScreen />);
    expect(join.getByRole("header", { name: "Facility already connected" })).toBeTruthy();
    expect(join.queryByLabelText("Invite token")).toBeNull();
    expect(join.getByLabelText("Open facility workspace")).toBeTruthy();

    const create = render(<CreateFacilityScreen />);
    expect(
      create.getByRole("header", { name: "Facility already connected" })
    ).toBeTruthy();
    expect(create.queryByLabelText("Facility name")).toBeNull();
    expect(create.getByLabelText("Open facility workspace")).toBeTruthy();
  });

  it("uses one shared Back action for facility creation", () => {
    mockEntitlements.facilityId = null;

    const create = render(<CreateFacilityScreen />);

    expect(create.getAllByText("Shared Back /home/facility/select")).toHaveLength(1);
    expect(create.queryByText("Back to facilities")).toBeNull();
  });

  it("uses the active Night palette across join and create states", () => {
    const palette = getThemePalette("night", "dark");
    const accept = createAcceptFacilityInviteStyles(palette);
    const join = createJoinFacilityStyles(palette);
    const create = createFacilityStyles(palette);

    expect(accept.page.backgroundColor).toBe(palette.page);
    expect(accept.card.backgroundColor).toBe(palette.surface);
    expect(accept.input.backgroundColor).toBe(palette.surface);
    expect(accept.input.color).toBe(palette.text);
    expect(join.container.backgroundColor).toBe(palette.page);
    expect(join.input.backgroundColor).toBe(palette.surface);
    expect(join.input.color).toBe(palette.text);
    expect(join.card.backgroundColor).toBe(palette.surfaceMuted);
    expect(create.centered.backgroundColor).toBe(palette.page);
    expect(create.title.color).toBe(palette.text);
    expect(create.input.backgroundColor).toBe(palette.surface);
    expect(create.input.color).toBe(palette.text);
    expect(create.secondaryButton.backgroundColor).toBe(palette.surface);
  });

  it("routes Facility billing management through status review instead of Offers checkout", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/home/facility/(tabs)/profile.tsx"),
      "utf8"
    );
    expect(source).toContain('router.push("/home/facility/billing" as any)');
    expect(source).not.toContain(
      'accessibilityLabel="View facility plan and billing"\n              onPress={() => router.push("/offers"'
    );
  });
});
