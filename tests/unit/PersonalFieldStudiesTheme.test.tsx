import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FieldStudiesScreen, {
  createFieldStudiesStyles
} from "@/app/home/personal/(tabs)/field-studies";
import FieldStudyDetailScreen, {
  createFieldStudyDetailStyles
} from "@/app/home/personal/(tabs)/field-studies/[studyId]";
import { getThemePalette } from "@/theme/appTheme";

const mockAddFieldStudyCollaborator = jest.fn();
const mockCreateFieldStudy = jest.fn();
const mockGetFieldStudy = jest.fn();
const mockListFieldStudies = jest.fn();
const mockRemoveFieldStudyCollaborator = jest.fn();
const mockUpdateFieldObservation = jest.fn();
const mockUpdateFieldStudy = jest.fn();
let mockFieldStudyResponse: any;

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: () => void) => {
      React.useEffect(callback, [callback]);
    }
  };
});

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useLocalSearchParams: () => ({ studyId: "study-1" }),
    useRouter: () => ({
      back: jest.fn(),
      canGoBack: jest.fn(() => false),
      replace: jest.fn()
    })
  };
});

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  const palette = actual.getThemePalette("night", "dark");
  return {
    ...actual,
    useAppTheme: () => ({
      mode: "night",
      resolvedMode: "night",
      palette,
      hydrated: true,
      systemScheme: "night",
      autoUsesLocation: false,
      themeLocation: null
    })
  };
});

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack = true, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        showBack
          ? React.createElement(
              Text,
              {
                accessibilityRole: "link",
                accessibilityLabel: `Shared Back ${backFallbackHref}`
              },
              `Shared Back ${backFallbackHref}`
            )
          : null,
        children
      )
  };
});

jest.mock("@/api/fieldStudies", () => ({
  addFieldStudyCollaborator: (...args: any[]) => mockAddFieldStudyCollaborator(...args),
  createFieldStudy: (...args: any[]) => mockCreateFieldStudy(...args),
  getFieldStudy: (...args: any[]) => mockGetFieldStudy(...args),
  listFieldStudies: (...args: any[]) => mockListFieldStudies(...args),
  removeFieldStudyCollaborator: (...args: any[]) =>
    mockRemoveFieldStudyCollaborator(...args),
  updateFieldObservation: (...args: any[]) => mockUpdateFieldObservation(...args),
  updateFieldStudy: (...args: any[]) => mockUpdateFieldStudy(...args)
}));

jest.mock("@/utils/publicLinks", () => ({
  sharePublicLink: jest.fn()
}));

describe("Personal Field Studies theme and workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListFieldStudies.mockResolvedValue([
      {
        id: "study-1",
        title: "Patapsco plant survey",
        regionLabel: "Patapsco Valley",
        visibility: "private",
        accessRole: "owner"
      }
    ]);
    mockCreateFieldStudy.mockResolvedValue({
      id: "study-2",
      title: "Neighborhood tree survey",
      regionLabel: "Baltimore",
      visibility: "private",
      accessRole: "owner"
    });
    mockFieldStudyResponse = {
      study: {
        id: "study-1",
        title: "Patapsco plant survey",
        regionLabel: "Patapsco Valley",
        visibility: "private",
        accessRole: "owner",
        collaborators: []
      },
      observations: [
        {
          id: "observation-1",
          title: "Red maple",
          identity: {
            commonName: "Red maple",
            scientificName: "Acer rubrum",
            verificationStatus: "ai_candidate",
            confidence: "medium",
            evidence: ["Opposite leaves"],
            counterEvidence: ["Fruit not visible"],
            missingEvidence: ["leaf underside"]
          },
          evidenceAssets: [{ assetId: "asset-1", kind: "photo" }],
          publication: {
            status: "draft",
            sensitiveSpecies: true,
            cannabisContextConfirmed: false,
            publicNotes: "Keep habitat wording general."
          },
          location: {
            latitude: 39.31,
            longitude: -76.62,
            accuracyMeters: 18,
            precision: "exact",
            privacy: "private",
            exactLocationPublicConfirmed: false
          }
        }
      ]
    };
    mockGetFieldStudy.mockResolvedValue(mockFieldStudyResponse);
  });

  it("uses the active Night palette across the list and detail surfaces", () => {
    const palette = getThemePalette("night", "dark");
    const listStyles = createFieldStudiesStyles(palette);
    const detailStyles = createFieldStudyDetailStyles(palette);

    expect(listStyles.screen.backgroundColor).toBe(palette.page);
    expect(listStyles.notice.backgroundColor).toBe(palette.accentSoft);
    expect(listStyles.panel.backgroundColor).toBe(palette.surface);
    expect(listStyles.input.backgroundColor).toBe(palette.surfaceStrong);
    expect(listStyles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(listStyles.studyCard.backgroundColor).toBe(palette.card);
    expect(listStyles.studyCard.borderColor).toBe(palette.border);
    expect(listStyles.cardLink.color).toBe(palette.link);

    expect(detailStyles.screen.backgroundColor).toBe(palette.page);
    expect(detailStyles.centered.backgroundColor).toBe(palette.page);
    expect(detailStyles.privacyPanel.backgroundColor).toBe(palette.accentSoft);
    expect(detailStyles.panel.backgroundColor).toBe(palette.surface);
    expect(detailStyles.input.color).toBe(palette.text);
    expect(detailStyles.roleButtonSelected.backgroundColor).toBe(palette.accent);
    expect(detailStyles.empty.backgroundColor).toBe(palette.surfaceMuted);
    expect(detailStyles.observationCard.backgroundColor).toBe(palette.card);
    expect(detailStyles.missing.color).toBe(palette.warning);
    expect(detailStyles.smallButton.backgroundColor).toBe(palette.surface);
  });

  it("keeps creating a private, location-protected study", async () => {
    const screen = render(<FieldStudiesScreen />);
    const palette = getThemePalette("night", "dark");

    await waitFor(() => expect(screen.getByText("Patapsco plant survey")).toBeTruthy());
    expect(screen.getByRole("header", { name: "Field Studies" })).toHaveProp(
      "aria-level",
      1
    );
    expect(screen.getByRole("header", { name: "Your studies" })).toHaveProp(
      "aria-level",
      2
    );
    expect(screen.getByLabelText("Field Study title").props.placeholderTextColor).toBe(
      palette.textMuted
    );
    expect(screen.getByLabelText("Field Study title").props.selectionColor).toBe(
      palette.accent
    );
    expect(screen.getByLabelText("Field Study region").props.selectionColor).toBe(
      palette.accent
    );
    fireEvent.changeText(
      screen.getByLabelText("Field Study title"),
      "Neighborhood tree survey"
    );
    fireEvent.changeText(screen.getByLabelText("Field Study region"), "Baltimore");
    fireEvent.press(screen.getByText("Create Private Study"));

    await waitFor(() =>
      expect(mockCreateFieldStudy).toHaveBeenCalledWith({
        title: "Neighborhood tree survey",
        regionLabel: "Baltimore",
        purpose: "biodiversity_survey",
        visibility: "private",
        defaultLocationPrivacy: "private",
        obscureSensitiveSpecies: true
      })
    );
    expect(screen.getByText("Neighborhood tree survey")).toBeTruthy();
  });

  it("keeps owner observation, publishing, and collaborator controls available", async () => {
    const screen = render(<FieldStudyDetailScreen />);
    const palette = getThemePalette("night", "dark");

    await waitFor(() => expect(mockGetFieldStudy).toHaveBeenCalledWith("study-1"));
    expect(screen.getAllByText("Shared Back /home/personal/field-studies")).toHaveLength(
      1
    );
    expect(screen.queryByText("← Field Studies")).toBeNull();
    expect(screen.getByText("Patapsco plant survey")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Patapsco plant survey" })).toHaveProp(
      "aria-level",
      1
    );
    expect(screen.getByText("Add Plant Observation")).toBeTruthy();
    expect(screen.getByText("Link Saved Plant IDs")).toBeTruthy();
    expect(screen.getByText("Publish Study")).toBeTruthy();
    expect(screen.getByText("Add Person")).toBeTruthy();
    expect(screen.getByText("Confirm Identity")).toBeTruthy();
    expect(screen.getByText("Needs More Evidence")).toBeTruthy();
    expect(screen.getByText("Publish Observation")).toBeTruthy();
    expect(screen.getByText("Nature map readiness")).toBeTruthy();
    expect(screen.getByText("Ready: Photo evidence attached")).toBeTruthy();
    expect(screen.getByText("Needed: Field Study is public")).toBeTruthy();
    expect(screen.getByPlaceholderText("Collaborator email").props.selectionColor).toBe(
      palette.accent
    );
  });

  it("publishes the study through the web-safe named action", async () => {
    mockUpdateFieldStudy.mockResolvedValue({
      ...mockFieldStudyResponse.study,
      visibility: "public"
    });
    const screen = render(<FieldStudyDetailScreen />);

    fireEvent.press(await screen.findByText("Publish Study"));

    await waitFor(() =>
      expect(mockUpdateFieldStudy).toHaveBeenCalledWith("study-1", {
        visibility: "public"
      })
    );
  });

  it("uses an in-page confirmation before removing a collaborator", async () => {
    mockGetFieldStudy.mockResolvedValue({
      ...mockFieldStudyResponse,
      study: {
        ...mockFieldStudyResponse.study,
        collaborators: [
          { userId: "member-1", displayName: "Field editor", role: "editor" }
        ]
      }
    });
    mockRemoveFieldStudyCollaborator.mockResolvedValue({
      ...mockFieldStudyResponse.study,
      collaborators: []
    });
    const screen = render(<FieldStudyDetailScreen />);

    fireEvent.press(await screen.findByText("Remove"));
    expect(mockRemoveFieldStudyCollaborator).not.toHaveBeenCalled();
    expect(screen.getByText(/They will immediately lose access/i)).toBeTruthy();
    fireEvent.press(screen.getByText("Confirm Remove"));

    await waitFor(() =>
      expect(mockRemoveFieldStudyCollaborator).toHaveBeenCalledWith("study-1", "member-1")
    );
  });

  it("preserves coordinates, identity evidence, and publication safety fields across actions", async () => {
    const observation = mockFieldStudyResponse.observations[0];
    mockUpdateFieldObservation.mockImplementation(
      async (_studyId: string, _observationId: string, patch: any) => ({
        ...observation,
        ...patch
      })
    );
    const screen = render(<FieldStudyDetailScreen />);

    await waitFor(() => expect(screen.getByText("Confirm Identity")).toBeTruthy());
    fireEvent.press(screen.getByText("Confirm Identity"));
    await waitFor(() =>
      expect(mockUpdateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        "observation-1",
        expect.objectContaining({
          identity: expect.objectContaining({
            scientificName: "Acer rubrum",
            verificationStatus: "user_confirmed",
            evidence: ["Opposite leaves"],
            counterEvidence: ["Fruit not visible"],
            missingEvidence: ["leaf underside"]
          })
        })
      )
    );
    await waitFor(() => expect(screen.queryByText("Saving observation...")).toBeNull());

    fireEvent.press(screen.getByText("Publish Observation"));
    await waitFor(() =>
      expect(mockUpdateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        "observation-1",
        expect.objectContaining({
          publication: expect.objectContaining({
            status: "published",
            sensitiveSpecies: true,
            cannabisContextConfirmed: false,
            publicNotes: "Keep habitat wording general."
          })
        })
      )
    );
    await waitFor(() => expect(screen.queryByText("Saving observation...")).toBeNull());

    fireEvent.press(screen.getByText("Share Approximate Location"));
    expect(screen.getByText(/Share a rounded location on Nature/i)).toBeTruthy();
    fireEvent.press(screen.getByText("Confirm Approximate Sharing"));
    await waitFor(() =>
      expect(mockUpdateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        "observation-1",
        expect.objectContaining({
          location: expect.objectContaining({
            latitude: 39.31,
            longitude: -76.62,
            accuracyMeters: 18,
            precision: "exact",
            privacy: "public_approximate",
            exactLocationPublicConfirmed: false
          })
        })
      )
    );
  });

  it("does not mark a video-only observation as photo-ready", async () => {
    mockGetFieldStudy.mockResolvedValue({
      ...mockFieldStudyResponse,
      observations: [
        {
          ...mockFieldStudyResponse.observations[0],
          photoUrls: [],
          evidenceAssets: [{ assetId: "video-1", kind: "video" }]
        }
      ]
    });

    const screen = render(<FieldStudyDetailScreen />);

    expect(await screen.findByText("Needed: Photo evidence attached")).toBeTruthy();
  });

  it("requires and records separate cannabis public-sharing confirmation", async () => {
    const observation = {
      ...mockFieldStudyResponse.observations[0],
      title: "Hemp observation",
      identity: {
        ...mockFieldStudyResponse.observations[0].identity,
        commonName: "Hemp",
        scientificName: "Cannabis sativa"
      },
      publication: {
        ...mockFieldStudyResponse.observations[0].publication,
        status: "published",
        cannabisContextConfirmed: false
      },
      location: {
        ...mockFieldStudyResponse.observations[0].location,
        privacy: "public_approximate"
      }
    };
    mockGetFieldStudy.mockResolvedValue({
      study: { ...mockFieldStudyResponse.study, visibility: "public" },
      observations: [observation]
    });
    mockUpdateFieldObservation.mockImplementation(
      async (_studyId: string, _observationId: string, patch: any) => ({
        ...observation,
        ...patch
      })
    );

    const screen = render(<FieldStudyDetailScreen />);

    expect(
      await screen.findByText("Needed: Cannabis/hemp public sharing is confirmed")
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Review Cannabis/Hemp Sharing"));
    expect(screen.getByText(/This does not publish it by itself/i)).toBeTruthy();
    fireEvent.press(screen.getByText("Confirm Cannabis/Hemp Sharing"));

    await waitFor(() =>
      expect(mockUpdateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        "observation-1",
        expect.objectContaining({
          publication: expect.objectContaining({
            status: "published",
            sensitiveSpecies: true,
            cannabisContextConfirmed: true,
            publicNotes: "Keep habitat wording general."
          })
        })
      )
    );
  });

  it("lets collaborator-only location sharing return directly to private", async () => {
    const observation = {
      ...mockFieldStudyResponse.observations[0],
      location: {
        ...mockFieldStudyResponse.observations[0].location,
        privacy: "collaborators"
      }
    };
    mockGetFieldStudy.mockResolvedValue({
      ...mockFieldStudyResponse,
      observations: [observation]
    });
    mockUpdateFieldObservation.mockImplementation(
      async (_studyId: string, _observationId: string, patch: any) => ({
        ...observation,
        ...patch
      })
    );

    const screen = render(<FieldStudyDetailScreen />);

    fireEvent.press(await screen.findByText("Make Location Private"));
    await waitFor(() =>
      expect(mockUpdateFieldObservation).toHaveBeenCalledWith(
        "study-1",
        "observation-1",
        expect.objectContaining({
          location: expect.objectContaining({
            latitude: 39.31,
            longitude: -76.62,
            privacy: "private",
            exactLocationPublicConfirmed: false
          })
        })
      )
    );
  });

  it("labels explicitly confirmed exact-public location accurately", async () => {
    mockGetFieldStudy.mockResolvedValue({
      study: { ...mockFieldStudyResponse.study, visibility: "public" },
      observations: [
        {
          ...mockFieldStudyResponse.observations[0],
          location: {
            ...mockFieldStudyResponse.observations[0].location,
            privacy: "public_exact",
            exactLocationPublicConfirmed: true
          }
        }
      ]
    });

    const screen = render(<FieldStudyDetailScreen />);

    expect(
      await screen.findByText("Ready: Exact public location is explicitly confirmed")
    ).toBeTruthy();
  });

  it("keeps the shared Back action available while detail is loading", () => {
    mockGetFieldStudy.mockReturnValueOnce(new Promise(() => undefined));

    const screen = render(<FieldStudyDetailScreen />);

    expect(screen.getByText("Loading Field Study...")).toBeTruthy();
    expect(screen.getAllByText("Shared Back /home/personal/field-studies")).toHaveLength(
      1
    );
  });

  it("keeps the shared Back action and retry recovery when detail loading fails", async () => {
    mockGetFieldStudy.mockRejectedValueOnce(new Error("Survey service unavailable"));

    const screen = render(<FieldStudyDetailScreen />);

    await waitFor(() =>
      expect(screen.getByRole("header", { name: "Field Study unavailable" })).toBeTruthy()
    );
    expect(screen.getAllByText("Shared Back /home/personal/field-studies")).toHaveLength(
      1
    );
    expect(screen.getByText("Survey service unavailable")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry Field Study" })).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Retry Field Study" }));

    await waitFor(() => expect(mockGetFieldStudy).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Patapsco plant survey")).toBeTruthy());
  });
});
