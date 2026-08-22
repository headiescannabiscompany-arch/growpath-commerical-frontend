import React, { useEffect, useState } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Text, TextInput, View } from "react-native";

import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";
import { CAPABILITY_KEYS } from "@/entitlements/capabilityKeys";
import { RouteAccessGuard } from "@/navigation/RouteAccessGuard";

const BUSINESS_DESK_READ = CAPABILITY_KEYS.BUSINESS_DESK_READ;

let mockPathname = "/home/facility/business-desk/ask-ai";
let mockAuth: any;
let mockEntitlements: any;
let mockSelectedFacilityId: string | null;
let mockSelectedFacilityRecordId: string | null;

const mockReplace = jest.fn();
const mockPush = jest.fn();
const privateLoad = jest.fn();
const privateAction = jest.fn();

jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuth
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    selectedId: mockSelectedFacilityId,
    selected: mockSelectedFacilityRecordId
      ? { id: mockSelectedFacilityRecordId, name: mockSelectedFacilityRecordId }
      : null
  })
}));

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      accent: "#000000",
      accentText: "#ffffff",
      border: "#777777",
      page: "#ffffff",
      surface: "#ffffff",
      text: "#111111",
      textMuted: "#444444"
    }
  })
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ header, children }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppCard({ title, subtitle }: any) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, subtitle)
    );
  };
});

function DraftProbe({ facilityId }: { facilityId: string }) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    privateLoad(facilityId);
  }, [facilityId]);

  return (
    <View>
      <Text>{`Private workspace ${facilityId}`}</Text>
      <TextInput
        accessibilityLabel="Business Desk draft"
        value={draft}
        onChangeText={setDraft}
      />
      <Text
        accessibilityRole="button"
        onPress={() => privateAction({ facilityId, draft })}
      >
        Save reviewed draft
      </Text>
    </View>
  );
}

function FacilitySubject() {
  return (
    <RouteAccessGuard>
      <FacilityBusinessDeskWorkspaceBoundary>
        {(workspace) => <DraftProbe facilityId={workspace.facilityId} />}
      </FacilityBusinessDeskWorkspaceBoundary>
    </RouteAccessGuard>
  );
}

function CommercialProbe() {
  useEffect(() => {
    privateLoad(mockAuth.user.id);
  }, []);
  return <Text>Commercial private workspace loaded</Text>;
}

describe("B-03 canonical combined frontend acceptance", () => {
  beforeEach(() => {
    mockPathname = "/home/facility/business-desk/ask-ai";
    mockAuth = {
      token: "session-token",
      user: { id: "facility-operator" },
      retryMe: jest.fn(),
      logout: jest.fn()
    };
    mockEntitlements = {
      ready: true,
      bootstrapError: "",
      mode: "facility",
      capabilities: { [BUSINESS_DESK_READ]: true },
      facilityId: "facility-a",
      facilityRole: "OWNER"
    };
    mockSelectedFacilityId = "facility-a";
    mockSelectedFacilityRecordId = "facility-a";
  });

  it.each(["STAFF", "VIEWER", "QA"])(
    "denies a direct Facility route to %s before private children load",
    (facilityRole) => {
      mockEntitlements.facilityRole = facilityRole;

      const screen = render(<FacilitySubject />);

      expect(screen.getByRole("header", { name: "Access denied" })).toBeTruthy();
      expect(screen.queryByLabelText("Business Desk draft")).toBeNull();
      expect(privateLoad).not.toHaveBeenCalled();
      expect(privateAction).not.toHaveBeenCalled();
    }
  );

  it("allows only owner/manager Facility scopes and invalidates state and action after workspace or role changes", () => {
    const screen = render(<FacilitySubject />);
    expect(privateLoad).toHaveBeenLastCalledWith("facility-a");
    fireEvent.changeText(screen.getByLabelText("Business Desk draft"), "Facility A only");

    mockEntitlements = {
      ...mockEntitlements,
      facilityId: "facility-b",
      facilityRole: "MANAGER"
    };
    mockSelectedFacilityId = "facility-b";
    mockSelectedFacilityRecordId = "facility-b";
    screen.rerender(<FacilitySubject />);

    expect(privateLoad).toHaveBeenLastCalledWith("facility-b");
    expect(screen.getByText("Private workspace facility-b")).toBeTruthy();
    expect(screen.getByLabelText("Business Desk draft").props.value).toBe("");
    expect(screen.queryByDisplayValue("Facility A only")).toBeNull();

    fireEvent.changeText(screen.getByLabelText("Business Desk draft"), "Facility B only");
    mockEntitlements = { ...mockEntitlements, facilityRole: "STAFF" };
    screen.rerender(<FacilitySubject />);
    expect(screen.getByRole("header", { name: "Access denied" })).toBeTruthy();
    expect(screen.queryByLabelText("Business Desk draft")).toBeNull();
    expect(privateAction).not.toHaveBeenCalled();

    mockEntitlements = { ...mockEntitlements, facilityRole: "OWNER" };
    screen.rerender(<FacilitySubject />);
    expect(screen.getByLabelText("Business Desk draft").props.value).toBe("");
  });

  it("allows an owner or admin in their own Commercial workspace and denies Personal or staff capability snapshots before load", () => {
    mockPathname = "/home/commercial/business-desk/ask-ai";
    mockEntitlements = {
      ready: true,
      bootstrapError: "",
      mode: "commercial",
      capabilities: { [BUSINESS_DESK_READ]: true }
    };
    mockAuth.user = { id: "commercial-owner-a", role: "owner" };
    const screen = render(
      <RouteAccessGuard>
        <CommercialProbe />
      </RouteAccessGuard>
    );
    expect(screen.getByText("Commercial private workspace loaded")).toBeTruthy();
    expect(privateLoad).toHaveBeenCalledWith("commercial-owner-a");
    screen.unmount();

    privateLoad.mockClear();
    mockAuth.user = { id: "admin-owned-commercial", role: "admin" };
    render(
      <RouteAccessGuard>
        <CommercialProbe />
      </RouteAccessGuard>
    ).unmount();
    expect(privateLoad).toHaveBeenCalledWith("admin-owned-commercial");

    for (const denied of [
      { mode: "personal", capabilities: { [BUSINESS_DESK_READ]: true } },
      { mode: "commercial", capabilities: {} }
    ]) {
      privateLoad.mockClear();
      mockEntitlements = { ready: true, bootstrapError: "", ...denied };
      const deniedScreen = render(
        <RouteAccessGuard>
          <CommercialProbe />
        </RouteAccessGuard>
      );
      expect(deniedScreen.getByRole("header", { name: "Access denied" })).toBeTruthy();
      expect(privateLoad).not.toHaveBeenCalled();
      deniedScreen.unmount();
    }
  });
});
