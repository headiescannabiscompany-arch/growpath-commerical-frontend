import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import FieldObservationGlobe from "@/components/fieldStudies/FieldObservationGlobe.native";

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      accent: "#2563eb",
      accentSoft: "#dbeafe",
      border: "#334155",
      surface: "#ffffff",
      text: "#0f172a",
      textMuted: "#475569"
    }
  })
}));

describe("FieldObservationGlobe native mapped observations", () => {
  it("shows and selects only observations with complete bounded coordinates", () => {
    const onSelectObservations = jest.fn();
    const screen = render(
      <FieldObservationGlobe
        observations={
          [
            {
              id: "valid",
              identity: { commonName: "Virginia creeper" },
              location: {
                latitude: 39.301,
                longitude: -76.721,
                precision: "approximate"
              },
              observationContext: { region: "Montgomery County" }
            },
            {
              id: "null-is-not-zero",
              title: "Must stay hidden",
              location: { latitude: null, longitude: null }
            },
            {
              id: "missing-half",
              title: "Also hidden",
              location: { latitude: 39.301 }
            },
            {
              id: "out-of-range",
              title: "Invalid location",
              location: { latitude: 91, longitude: -181 }
            }
          ] as any
        }
        onSelectObservations={onSelectObservations}
        onViewportChange={jest.fn()}
      />
    );

    expect(screen.getByText("1 mapped shared locations")).toBeTruthy();
    expect(screen.queryByText("Must stay hidden")).toBeNull();
    expect(screen.queryByText("Also hidden")).toBeNull();
    expect(screen.queryByText("Invalid location")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: /Virginia creeper/i }));
    expect(onSelectObservations).toHaveBeenCalledWith(["valid"]);
  });

  it("renders a truthful empty state when no public pin can be mapped", () => {
    const screen = render(
      <FieldObservationGlobe
        compact
        observations={
          [{ id: "missing", location: { latitude: null, longitude: null } }] as any
        }
        onSelectObservations={jest.fn()}
        onViewportChange={jest.fn()}
      />
    );

    expect(screen.getByText("0 mapped shared locations")).toBeTruthy();
    expect(
      screen.getByText("No public mapped findings match these filters yet.")
    ).toBeTruthy();
  });
});
