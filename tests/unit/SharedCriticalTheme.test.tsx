import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import Index, { createRootIndexStyles } from "@/app/index";
import {
  createGlobalApiStatusBannerStyles,
  GlobalApiStatusBanner
} from "@/components/GlobalApiStatusBanner";
import LegalLinks, { createLegalLinksStyles } from "@/components/LegalLinks";
import ReportModal, { createReportModalStyles } from "@/components/ReportModal";
import { getThemePalette } from "@/theme/appTheme";

const mockReplace = jest.fn();
const mockRetryMe = jest.fn();
const mockLogout = jest.fn();
const mockSubmitReport = jest.fn();
let mockAuthState: any;
let mockEntitlementsState: any;
let mockFacilityState: any;
let mockTransportListener: ((event: any) => void) | null = null;

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuthState
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlementsState
}));

jest.mock("@/facility/FacilityProvider", () => ({
  useFacility: () => mockFacilityState
}));

jest.mock("@/components/marketing/PublicLandingPage", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockPublicLandingPage() {
    return React.createElement(Text, null, "Public landing page");
  };
});

jest.mock("@/api/apiRequest", () => {
  const actual = jest.requireActual("@/api/apiRequest");
  return {
    ...actual,
    subscribeToApiTransport: (listener: (event: any) => void) => {
      mockTransportListener = listener;
      return () => {
        mockTransportListener = null;
      };
    }
  };
});

jest.mock("@/api/reports", () => ({
  submitReport: (...args: any[]) => mockSubmitReport(...args)
}));

jest.mock("@/components/ReportBugButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockReportBugButton() {
    return React.createElement(Text, null, "Report bug");
  };
});

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({
      palette: actual.getThemePalette("night", "dark")
    })
  };
});

describe("shared critical Night theme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransportListener = null;
    mockAuthState = {
      isHydrating: true,
      logout: mockLogout,
      retryMe: mockRetryMe,
      token: null,
      user: null
    };
    mockEntitlementsState = {
      bootstrapError: "",
      facilityId: null,
      mode: "personal",
      plan: "free",
      ready: false
    };
    mockFacilityState = {
      isReady: true,
      selectedId: null
    };
    mockLogout.mockResolvedValue(undefined);
    mockSubmitReport.mockResolvedValue({ accepted: true });
  });

  it("themes root bootstrap loading and session-recovery actions without changing them", async () => {
    const palette = getThemePalette("night", "dark");
    const styles = createRootIndexStyles(palette);
    const loadingScreen = render(<Index />);

    expect(
      StyleSheet.flatten(loadingScreen.getByTestId("root-index-loading").props.style)
    ).toEqual(expect.objectContaining({ backgroundColor: palette.page }));
    expect(
      StyleSheet.flatten(loadingScreen.getByText("Loading auth...").props.style)
    ).toEqual(expect.objectContaining({ color: palette.textMuted }));
    loadingScreen.unmount();

    mockAuthState = {
      ...mockAuthState,
      isHydrating: false,
      token: "session-token"
    };
    mockEntitlementsState = {
      ...mockEntitlementsState,
      bootstrapError: "Unable to verify this session."
    };

    const errorScreen = render(<Index />);
    const errorPanel = await errorScreen.findByTestId("root-index-bootstrap-error");
    expect(StyleSheet.flatten(errorPanel.props.style)).toEqual(
      expect.objectContaining({ backgroundColor: palette.page })
    );
    expect(
      StyleSheet.flatten(
        errorScreen.getByText("Unable to verify this session.").props.style
      )
    ).toEqual(expect.objectContaining({ color: palette.danger }));
    expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(styles.secondaryButton).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );

    fireEvent.press(errorScreen.getByText("Retry /api/me"));
    fireEvent.press(errorScreen.getByText("Clear session and sign in"));
    expect(mockRetryMe).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"));
  });

  it("renders the global transport outage banner with Night error colors", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createGlobalApiStatusBannerStyles(palette);
    const screen = render(<GlobalApiStatusBanner />);

    act(() => {
      mockTransportListener?.({
        type: "error",
        error: {
          code: "NETWORK_ERROR",
          message: "The API cannot be reached.",
          requestId: "request-1",
          status: null
        }
      });
    });

    const banner = screen.getByTestId("global-api-status-banner");
    expect(StyleSheet.flatten(banner.props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderBottomColor: palette.danger
      })
    );
    expect(styles.message.color).toBe(palette.text);
    expect(
      StyleSheet.flatten(screen.getByText("Connection problem").props.style).color
    ).toBe(palette.danger);
    expect(screen.getByText("Reference: request-1")).toBeTruthy();
  });

  it("themes the report modal and preserves report submission", async () => {
    const palette = getThemePalette("night", "dark");
    const styles = createReportModalStyles(palette);
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    const screen = render(
      <ReportModal
        visible
        onClose={onClose}
        contentType="video"
        contentId="video-1"
        contentTitle="Night garden tour"
        targetUrl="/videos/video-1"
        onSuccess={onSuccess}
      />
    );

    expect(
      StyleSheet.flatten(screen.getByTestId("report-content-modal").props.style)
    ).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(StyleSheet.flatten(screen.getByText("Report Content").props.style).color).toBe(
      palette.text
    );
    const reasonInput = screen.getByLabelText("Report reason");
    expect(reasonInput.props.placeholderTextColor).toBe(palette.textMuted);
    expect(StyleSheet.flatten(reasonInput.props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.error.color).toBe(palette.danger);

    fireEvent.changeText(reasonInput, "This video impersonates another grower.");
    fireEvent.press(screen.getByLabelText("Submit"));

    await waitFor(() =>
      expect(mockSubmitReport).toHaveBeenCalledWith({
        contentId: "video-1",
        contentTitle: "Night garden tour",
        contentType: "video",
        parentPostId: null,
        reason: "This video impersonates another grower.",
        targetUrl: "/videos/video-1",
        token: null
      })
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses Night link and separator colors for privacy-critical legal routes", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createLegalLinksStyles(palette);
    const screen = render(<LegalLinks />);

    expect(styles.link.color).toBe(palette.link);
    expect(styles.separator.color).toBe(palette.textMuted);
    expect(StyleSheet.flatten(screen.getByText("Privacy").props.style).color).toBe(
      palette.link
    );
    expect(StyleSheet.flatten(screen.getAllByText("|")[0].props.style).color).toBe(
      palette.textMuted
    );
  });
});
