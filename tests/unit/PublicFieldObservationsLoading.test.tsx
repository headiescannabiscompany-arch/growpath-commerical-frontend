import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import PublicFieldObservationsScreen from "@/app/field-observations";

const mockListPublicFieldObservations = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    replace: jest.fn()
  })
}));

jest.mock("@/api/fieldStudies", () => ({
  listPublicFieldObservations: (...args: any[]) =>
    mockListPublicFieldObservations(...args)
}));

jest.mock("@/components/fieldStudies/FieldObservationGlobe", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return function MockGlobe({ observations, onSelectObservations }: any) {
    const firstId = String(observations?.[0]?.id || observations?.[0]?._id || "");
    return React.createElement(
      View,
      { testID: "field-observation-globe" },
      firstId
        ? React.createElement(
            Pressable,
            {
              accessibilityLabel: "Select first globe pin",
              onPress: () => onSelectObservations([firstId])
            },
            React.createElement(Text, null, "Select first globe pin")
          )
        : null
    );
  };
});

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ mode: "personal" })
}));

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});

describe("Public Field Observations request ordering", () => {
  beforeEach(() => mockListPublicFieldObservations.mockReset());

  it("does not let an older response replace newer search results", async () => {
    const resolvers: Array<(rows: any[]) => void> = [];
    mockListPublicFieldObservations.mockImplementation(
      () => new Promise<any[]>((resolve) => resolvers.push(resolve))
    );
    render(<PublicFieldObservationsScreen />);

    await waitFor(() => expect(resolvers).toHaveLength(1));
    fireEvent.changeText(
      screen.getAllByLabelText("Search public plant observations")[0],
      "rose"
    );
    fireEvent.press(screen.getByText("Search"));
    await waitFor(() => expect(resolvers).toHaveLength(2));

    await act(async () => {
      resolvers[1]([
        {
          id: "new-result",
          title: "New rose result",
          identity: { confidence: "medium", verificationStatus: "ai_candidate" },
          evidenceAssets: [
            {
              assetId: "rose-photo",
              kind: "photo",
              url: "/uploads/public-field-observations/rose-photo.jpg"
            }
          ],
          location: { latitude: 39, longitude: -76, precision: "approximate" }
        }
      ]);
    });
    expect(await screen.findByText("New rose result")).toBeTruthy();
    expect(screen.getByLabelText("Evidence for New rose result")).toBeTruthy();

    await act(async () => {
      resolvers[0]([
        {
          id: "old-result",
          title: "Stale global result",
          identity: { confidence: "low", verificationStatus: "ai_candidate" },
          location: { latitude: 40, longitude: -75, precision: "approximate" }
        }
      ]);
    });
    expect(screen.getByText("New rose result")).toBeTruthy();
    expect(screen.queryByText("Stale global result")).toBeNull();
  });

  it("shows published photos in both result cards and selected globe-pin details", async () => {
    mockListPublicFieldObservations.mockResolvedValue([
      {
        id: "rose-result",
        title: "Mapped rose",
        identity: { confidence: "medium", verificationStatus: "ai_candidate" },
        evidenceAssets: [
          {
            assetId: "rose-photo",
            kind: "photo",
            url: "/uploads/public-field-observations/rose-photo.jpg"
          }
        ],
        location: { latitude: 39, longitude: -76, precision: "approximate" }
      }
    ]);

    render(<PublicFieldObservationsScreen />);

    expect(await screen.findByLabelText("Evidence for Mapped rose")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Select first globe pin"));
    expect(screen.getByLabelText("Photos for Mapped rose")).toBeTruthy();
    expect(screen.getByLabelText("Evidence photo 1 for Mapped rose")).toBeTruthy();
  });
});
