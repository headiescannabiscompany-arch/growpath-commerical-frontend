import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import PublicFieldStudyScreen, { createStyles } from "@/app/field-observations/[slug]";

const mockGetPublicFieldStudy = jest.fn();
let mockParams: { slug?: string } = {};

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ href, children }: any) =>
      React.cloneElement(React.Children.only(children), {
        href,
        testID: `field-link-${href}`
      }),
    useLocalSearchParams: () => mockParams
  };
});

jest.mock("@/api/fieldStudies", () => ({
  getPublicFieldStudy: (...args: any[]) => mockGetPublicFieldStudy(...args)
}));

describe("Public Field Study detail route", () => {
  beforeEach(() => {
    mockParams = {};
    mockGetPublicFieldStudy.mockReset();
  });

  it("stops loading without a slug and does not request a synthetic study", async () => {
    const screen = render(<PublicFieldStudyScreen />);

    await waitFor(() =>
      expect(
        screen.getByText("Choose a published Field Study from the observation map.")
      ).toBeTruthy()
    );
    expect(mockGetPublicFieldStudy).not.toHaveBeenCalled();
    expect(screen.getByRole("header", { name: "Field Study unavailable" })).toHaveProp(
      "aria-level",
      1
    );
    expect(screen.getByTestId("field-link-/field-observations")).toBeTruthy();
  });

  it("renders a structured published study and observation hierarchy", async () => {
    mockParams = { slug: "woodland-study" };
    mockGetPublicFieldStudy.mockResolvedValue({
      study: {
        id: "study-1",
        title: "Woodland Study",
        purpose: "public_discovery",
        regionLabel: "Northern woods"
      },
      observations: [
        {
          id: "observation-1",
          identity: { commonName: "Red maple", verificationStatus: "verified" },
          publication: {
            publicNotes: "Observed along the woodland trail after summer rain."
          }
        }
      ]
    });

    const screen = render(<PublicFieldStudyScreen />);

    await waitFor(() => expect(screen.getByText("Woodland Study")).toBeTruthy());
    expect(mockGetPublicFieldStudy).toHaveBeenCalledWith("woodland-study");
    expect(screen.getByRole("header", { name: "Woodland Study" })).toHaveProp(
      "aria-level",
      1
    );
    expect(screen.getByRole("header", { name: "Location privacy" })).toHaveProp(
      "aria-level",
      2
    );
    expect(screen.getByRole("header", { name: "1 published observation" })).toHaveProp(
      "aria-level",
      2
    );
    expect(screen.getByRole("header", { name: "Red maple" })).toHaveProp("aria-level", 3);
    expect(
      screen.getByText("Observed along the woodland trail after summer rain.")
    ).toBeTruthy();
  });

  it("uses the active palette for unavailable, privacy, and loaded cards", () => {
    const palette = {
      page: "#0E141B",
      surface: "#151D27",
      border: "#283545",
      text: "#F4F7FB",
      textMuted: "#C9D4DF",
      textSoft: "#DEE7F0",
      accentSoft: "#16263A",
      link: "#78AAFF",
      danger: "#E29B9B",
      warning: "#E3BE63",
      success: "#8FA06E"
    } as any;
    const styles = createStyles(palette);

    expect(styles.screen.backgroundColor).toBe(palette.page);
    expect(styles.centered.backgroundColor).toBe(palette.page);
    expect(styles.privacy).toEqual(
      expect.objectContaining({
        backgroundColor: palette.accentSoft,
        borderColor: palette.border
      })
    );
    expect(styles.card).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(styles.title.color).toBe(palette.text);
    expect(styles.error.color).toBe(palette.danger);
  });
});
