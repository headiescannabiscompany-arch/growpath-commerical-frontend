import React from "react";
import { StyleSheet } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import NewLogScreen, { createNewLogStyles } from "@/app/home/personal/(tabs)/logs/new";
import CalendarDateField from "@/components/forms/CalendarDateField";
import { localCalendarDate } from "@/features/grows/routeUtils";
import {
  createToolPlantContextPickerStyles,
  ToolPlantContextPicker
} from "@/features/personal/tools/ToolPlantContextPicker";
import { getThemePalette } from "@/theme/appTheme";

const mockReplace = jest.fn();
const mockCreatePersonalLog = jest.fn();
const mockCreateCommercialLog = jest.fn();
const mockApiRequest = jest.fn();
const mockSuggestLogInsights = jest.fn();
const mockListToolRuns = jest.fn();
const mockListPersonalPlants = jest.fn();
const mockPersistImageUris = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockEntitlementsCan = jest.fn();
let mockSearchParams: Record<string, string> = {};

type TestScreen = ReturnType<typeof render>;

function deferred<T = any>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function fillDraft(screen: TestScreen, title = "Draft canopy check") {
  fireEvent.changeText(screen.getByLabelText("Log title"), title);
  fireEvent.changeText(screen.getByLabelText("Log notes"), "Keep these draft notes.");
  act(() => screen.UNSAFE_getByType(CalendarDateField).props.onChange("2026-01-12"));
  fireEvent.press(screen.getByLabelText("Log type feed"));
}

async function attachPhoto(screen: TestScreen) {
  fireEvent.press(screen.getByLabelText("Attach log photos"));
  await waitFor(() =>
    expect(screen.getByLabelText("Remove attached photo 1")).toBeTruthy()
  );
}

function expectEmptyDraft(screen: TestScreen) {
  expect(screen.getByLabelText("Log title").props.value).toBe("");
  expect(screen.getByLabelText("Log notes").props.value).toBe("");
  expect(screen.getByLabelText("Photo URL").props.value).toBe("");
  expect(screen.UNSAFE_getByType(CalendarDateField).props.value).toBe(
    localCalendarDate()
  );
  expect(screen.queryByLabelText("Remove attached photo 1")).toBeNull();
  expect(screen.queryByText(/Suggestions \|/)).toBeNull();
}

function expectRetainedDraft(screen: TestScreen) {
  expect(screen.getByLabelText("Log title").props.value).toBe("Draft canopy check");
  expect(screen.getByLabelText("Log notes").props.value).toBe("Keep these draft notes.");
  expect(screen.UNSAFE_getByType(CalendarDateField).props.value).toBe("2026-01-12");
  expect(screen.getByLabelText("Remove attached photo 1")).toBeTruthy();
}

function pressCallback(screen: TestScreen, label: string): () => unknown {
  let node: any = screen.getByLabelText(label);
  while (node && typeof node.props.onPress !== "function") node = node.parent;
  if (!node) throw new Error(`No press callback for ${label}`);
  return node.props.onPress;
}

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn()
  }),
  Link: ({ children }: any) => children
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibraryAsync(...args)
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    DIAGNOSE_AI: "DIAGNOSE_AI",
    LOGS_PERSONAL_WRITE: "LOGS_PERSONAL_WRITE"
  },
  useEntitlements: () => ({ can: mockEntitlementsCan })
}));

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({
      palette: actual.getThemePalette("night", "dark")
    })
  };
});

jest.mock("@/api/logs", () => ({
  createPersonalLog: (...args: any[]) => mockCreatePersonalLog(...args)
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args: any[]) => mockListToolRuns(...args)
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args: any[]) => mockListPersonalPlants(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args),
  isPersistedImageUri: (uri: string) =>
    /^https?:\/\//.test(uri) || uri.startsWith("/uploads/"),
  resolveImageUri: (uri: string) => uri
}));

jest.mock("@/api/logInsights", () => ({
  suggestLogInsights: (...args: any[]) => mockSuggestLogInsights(...args)
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
});

describe("NewLogScreen plant/photo context", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSearchParams = {
      growId: "grow-1",
      plantId: "plant-olive-1",
      toolRunId: "toolrun-vpd-1"
    };
    mockEntitlementsCan.mockReturnValue(true);
    mockListPersonalPlants.mockResolvedValue([
      {
        id: "plant-olive-1",
        growId: "grow-1",
        name: "Olive patio tree",
        cropCommonName: "Olive",
        scientificName: "Olea europaea",
        cultivar: "Arbequina",
        cropProfileId: "crop-olive-1",
        growthProfile: {
          phenoLabel: "compact-container",
          sizeMetrics: { canopyWidthCm: 140 }
        }
      }
    ]);
    mockListToolRuns.mockResolvedValue([
      {
        id: "toolrun-vpd-1",
        _id: "toolrun-vpd-1",
        growId: "grow-1",
        plantId: "plant-olive-1",
        toolType: "vpd",
        selectedPlantContext: {
          id: "plant-olive-1",
          name: "Olive patio tree"
        }
      }
    ]);
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/olive-leaf.jpg",
          width: 1200,
          height: 900,
          mimeType: "image/jpeg",
          fileSize: 345678
        }
      ]
    });
    mockPersistImageUris.mockImplementation(async (uris: string[]) =>
      uris.map((uri) =>
        uri === "file:///tmp/olive-leaf.jpg"
          ? "https://cdn.example.com/olive-leaf.jpg"
          : uri
      )
    );
    mockCreatePersonalLog.mockResolvedValue({ id: "log-1" });
    mockCreateCommercialLog.mockResolvedValue({ id: "log-1" });
    mockApiRequest.mockImplementation(async (path, options) => {
      if (path === "/api/commercial/grows/grow-1/plants") {
        return { plants: await mockListPersonalPlants() };
      }
      if (path === "/api/commercial/grows/grow-1/logs" && options?.method === "POST") {
        return { log: await mockCreateCommercialLog(options.body) };
      }
      throw new Error(`Unexpected test request: ${path}`);
    });
    mockSuggestLogInsights.mockResolvedValue({
      tags: ["reviewed-tag", "rejected-tag"],
      summary: "Reviewed draft summary",
      provider: "test-provider"
    });
  });

  it("retains prepared upload metadata and its URL when a failed journal save is retried", async () => {
    const metadata = {
      mimeType: "image/jpeg",
      sizeBytes: 2000000,
      width: null,
      height: null
    };
    mockPersistImageUris.mockImplementation(async (uris: string[], options: any) =>
      uris.map((uri) => {
        if (uri.startsWith("https://")) return uri;
        const url = "https://cdn.example.com/prepared.jpg";
        options.onUploaded(uri, url, metadata);
        return url;
      })
    );
    mockCreatePersonalLog.mockRejectedValueOnce(new Error("Temporary save failure"));
    const screen = render(<NewLogScreen />);
    fillDraft(screen);
    await attachPhoto(screen);
    fireEvent.press(screen.getByLabelText("Create log"));
    await waitFor(() => expect(screen.getByText("Temporary save failure")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Create log"));
    await waitFor(() => expect(mockCreatePersonalLog).toHaveBeenCalledTimes(2));
    expect(mockPersistImageUris.mock.calls[1][0]).toEqual([
      "https://cdn.example.com/prepared.jpg"
    ]);
    for (const [payload] of mockCreatePersonalLog.mock.calls) {
      expect(payload.photoMetadata).toEqual([
        expect.objectContaining({
          ...metadata,
          url: "https://cdn.example.com/prepared.jpg"
        })
      ]);
    }
  });

  it("keeps journal creation available for free personal accounts", async () => {
    mockEntitlementsCan.mockImplementation(
      (capability) => capability !== "LOGS_PERSONAL_WRITE"
    );

    const { getByLabelText, getByText, queryByText } = render(<NewLogScreen />);

    expect(getByText("Shared Back /home/personal/grows/grow-1/journal")).toBeTruthy();
    expect(queryByText("Create journal entries with Pro")).toBeNull();
    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith({
        growId: "grow-1",
        workspaceType: "personal"
      })
    );
    fireEvent.changeText(getByLabelText("Log title"), "Free grow journal");
    fireEvent.changeText(getByLabelText("Log notes"), "Basic grow log for free plan.");
    fireEvent.press(getByLabelText("Create log"));

    await waitFor(() => expect(mockCreatePersonalLog).toHaveBeenCalled());
    expect(mockCreatePersonalLog).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        title: "Free grow journal",
        notes: "Basic grow log for free plan."
      })
    );
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows/grow-1/journal");
  });

  it("uses the active Night palette for journal fields, photos, and action states", async () => {
    const palette = getThemePalette("night", "dark");
    const styles = createNewLogStyles(palette);
    const plantPickerStyles = createToolPlantContextPickerStyles(palette);
    const screen = render(<NewLogScreen />);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.photoTile).toEqual(
      expect.objectContaining({
        backgroundColor: palette.card,
        borderColor: palette.border
      })
    );
    expect(styles.error).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.danger,
        color: palette.danger
      })
    );
    expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(styles.secondaryButton).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.accent
      })
    );
    expect(plantPickerStyles.pill).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(plantPickerStyles.pillText.color).toBe(palette.text);
    expect(plantPickerStyles.pillOn.backgroundColor).toBe(palette.accent);

    for (const label of ["Log title", "Log notes", "Photo URL"]) {
      const input = screen.getByLabelText(label);
      expect(input.props.placeholderTextColor).toBe(palette.textMuted);
      expect(StyleSheet.flatten(input.props.style)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border,
          color: palette.text
        })
      );
    }

    const plantContextLabel = await screen.findByText("Plant context");
    expect(StyleSheet.flatten(plantContextLabel.props.style).color).toBe(palette.text);
    expect(
      StyleSheet.flatten(screen.getByText("Olive patio tree").props.style).color
    ).toBe(palette.accentText);

    fireEvent.press(screen.getByLabelText("Attach log photos"));
    const remove = await screen.findByText("Remove");
    expect(remove).toBeTruthy();
  });

  it("creates logs and photo metadata with selected plant context", async () => {
    const { getByLabelText, getByText } = render(<NewLogScreen />);

    expect(getByText("Shared Back /home/personal/grows/grow-1/journal")).toBeTruthy();
    await waitFor(() =>
      expect(mockListPersonalPlants).toHaveBeenCalledWith({ growId: "grow-1" })
    );
    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith({
        growId: "grow-1",
        workspaceType: "personal"
      })
    );

    fireEvent.changeText(getByLabelText("Log title"), "Olive canopy check");
    fireEvent.changeText(
      getByLabelText("Log notes"),
      "Checked leaf color and canopy size."
    );
    fireEvent.press(getByLabelText("Attach log photos"));
    await waitFor(() => expect(getByText("Remove")).toBeTruthy());

    fireEvent.press(getByLabelText("Create log"));

    await waitFor(() => expect(mockCreatePersonalLog).toHaveBeenCalled());
    expect(mockPersistImageUris).toHaveBeenCalledWith(
      ["file:///tmp/olive-leaf.jpg"],
      expect.objectContaining({ prepareForJournal: true })
    );
    expect(mockCreatePersonalLog).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        plantId: "plant-olive-1",
        toolRunId: "toolrun-vpd-1",
        title: "Olive canopy check",
        photos: ["https://cdn.example.com/olive-leaf.jpg"],
        photoMetadata: [
          expect.objectContaining({
            growId: "grow-1",
            plantId: "plant-olive-1",
            url: "https://cdn.example.com/olive-leaf.jpg",
            mimeType: "image/jpeg",
            width: 1200,
            height: 900,
            sizeBytes: 345678,
            consentForAI: false,
            consentForTraining: false
          })
        ]
      })
    );
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows/grow-1/journal");
  });

  it.each(["personal", "commercial"] as const)(
    "clears a saved %s draft on the retained screen and submits the next entry cleanly",
    async (workspace) => {
      const screen = render(<NewLogScreen workspace={workspace} />);
      const create =
        workspace === "personal" ? mockCreatePersonalLog : mockCreateCommercialLog;
      await screen.findByText("Olive patio tree");
      fillDraft(screen);
      await attachPhoto(screen);
      fireEvent.changeText(screen.getByLabelText("Photo URL"), "/uploads/not-added.jpg");
      fireEvent.press(screen.getByLabelText("Suggest tags and summary"));
      await screen.findByText("Reviewed draft summary");
      fireEvent.press(screen.getByLabelText("Accept tag reviewed-tag"));
      fireEvent.press(screen.getByLabelText("Reject tag rejected-tag"));
      fireEvent.press(screen.getByLabelText("Create log"));

      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
      expect(mockReplace).toHaveBeenCalledWith(`/home/${workspace}/grows/grow-1/journal`);
      expect(create.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          title: "Draft canopy check",
          date: "2026-01-12",
          type: "feed",
          plantId: "plant-olive-1",
          toolRunId: "toolrun-vpd-1",
          photos: ["https://cdn.example.com/olive-leaf.jpg"],
          tags: ["reviewed-tag"],
          rejectedTags: ["rejected-tag"],
          aiInsight: expect.objectContaining({ summary: "Reviewed draft summary" })
        })
      );
      // Navigation deliberately does not unmount this instance.
      screen.rerender(<NewLogScreen workspace={workspace} />);
      expectEmptyDraft(screen);
      fireEvent.changeText(screen.getByLabelText("Log title"), "Next photo-free entry");
      fireEvent.press(screen.getByLabelText("Create log"));

      await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
      expect(mockPersistImageUris).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ prepareForJournal: true })
      );
      expect(create.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          growId: "grow-1",
          plantId: "plant-olive-1",
          title: "Next photo-free entry",
          notes: "",
          date: localCalendarDate(),
          type: "other",
          photos: [],
          photoMetadata: [],
          tags: [],
          rejectedTags: []
        })
      );
      expect(create.mock.calls[1][0].toolRunId).toBeUndefined();
      expect(create.mock.calls[1][0].aiInsight).toBeUndefined();
      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(2));
    }
  );

  it.each(["upload", "create", "empty result"])(
    "preserves the completed input for retry after %s failure",
    async (failure) => {
      const screen = render(<NewLogScreen />);
      fillDraft(screen);
      await attachPhoto(screen);
      fireEvent.changeText(screen.getByLabelText("Photo URL"), "/uploads/not-added.jpg");
      if (failure === "upload") {
        mockPersistImageUris.mockRejectedValueOnce(new Error("Upload unavailable"));
      } else if (failure === "create") {
        mockCreatePersonalLog.mockRejectedValueOnce(new Error("Save unavailable"));
      } else {
        mockCreatePersonalLog.mockResolvedValueOnce(null);
      }
      fireEvent.press(screen.getByLabelText("Create log"));

      await screen.findByText(
        failure === "upload"
          ? "Upload unavailable"
          : failure === "create"
            ? "Save unavailable"
            : "Failed to create log."
      );
      screen.rerender(<NewLogScreen />);
      expectRetainedDraft(screen);
      expect(screen.getByLabelText("Photo URL").props.value).toBe(
        "/uploads/not-added.jpg"
      );
      expect(mockReplace).not.toHaveBeenCalled();
      if (failure === "upload") expect(mockCreatePersonalLog).not.toHaveBeenCalled();
      fireEvent.press(screen.getByLabelText("Create log"));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
      expect(mockCreatePersonalLog).toHaveBeenLastCalledWith(
        expect.objectContaining({
          title: "Draft canopy check",
          type: "feed",
          date: "2026-01-12",
          photos: ["https://cdn.example.com/olive-leaf.jpg"]
        })
      );
    }
  );

  it("preserves an unfinished draft across ordinary rerenders", async () => {
    const screen = render(<NewLogScreen />);
    fillDraft(screen);
    await attachPhoto(screen);
    fireEvent.press(screen.getByLabelText("Suggest tags and summary"));
    await screen.findByText("Reviewed draft summary");
    fireEvent.press(screen.getByLabelText("Accept tag reviewed-tag"));
    screen.rerender(<NewLogScreen />);

    expectRetainedDraft(screen);
    expect(screen.getByText("Reviewed draft summary")).toBeTruthy();
    expect(mockCreatePersonalLog).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("guards duplicate in-flight saves and locks draft changes until a failed save finishes", async () => {
    const pendingCreate = deferred();
    mockCreatePersonalLog.mockReturnValueOnce(pendingCreate.promise);
    const screen = render(<NewLogScreen />);
    await screen.findByText("Olive patio tree");
    fillDraft(screen);
    await attachPhoto(screen);
    fireEvent.changeText(screen.getByLabelText("Photo URL"), "/uploads/not-added.jpg");
    const submit = pressCallback(screen, "Create log");
    act(() => {
      void submit();
      void submit();
    });
    await waitFor(() => expect(mockCreatePersonalLog).toHaveBeenCalledTimes(1));
    expect(mockPersistImageUris).toHaveBeenCalledTimes(1);
    for (const label of ["Log title", "Log notes", "Photo URL"]) {
      expect(screen.getByLabelText(label).props.editable).toBe(false);
      act(() =>
        screen.getByLabelText(label).props.onChangeText("Must not replace draft")
      );
    }
    const calendar = screen.UNSAFE_getByType(CalendarDateField);
    expect(calendar.props.disabled).toBe(true);
    act(() => calendar.props.onChange("2026-08-08"));
    for (const label of [
      "Log type watering",
      "Attach log photos",
      "Remove attached photo 1",
      "Add photo URL",
      "Suggest tags and summary",
      "Attach no tool result",
      "Create log"
    ]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
      act(() => {
        void pressCallback(screen, label)();
      });
    }
    act(() => screen.UNSAFE_getByType(ToolPlantContextPicker).props.onSelect(""));
    expectRetainedDraft(screen);
    expect(screen.getByLabelText("Photo URL").props.value).toBe("/uploads/not-added.jpg");
    expect(screen.UNSAFE_getByType(ToolPlantContextPicker).props.plantId).toBe(
      "plant-olive-1"
    );
    expect(mockRequestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockSuggestLogInsights).not.toHaveBeenCalled();
    expect(mockCreatePersonalLog).toHaveBeenCalledTimes(1);

    await act(async () => pendingCreate.reject(new Error("Save unavailable")));
    expectRetainedDraft(screen);
    expect(screen.getByLabelText("Log title").props.editable).toBe(true);
    expect(screen.UNSAFE_getByType(CalendarDateField).props.disabled).toBe(false);
    fireEvent.press(screen.getByLabelText("Create log"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockCreatePersonalLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "Draft canopy check",
        notes: "Keep these draft notes.",
        date: "2026-01-12",
        type: "feed",
        plantId: "plant-olive-1",
        toolRunId: "toolrun-vpd-1",
        photos: ["https://cdn.example.com/olive-leaf.jpg"]
      })
    );
  });

  it.each(["granted", "denied", "rejected"])(
    "ignores a completed draft's late %s photo permission response",
    async (outcome) => {
      const permission = deferred();
      mockRequestMediaLibraryPermissionsAsync.mockReturnValueOnce(permission.promise);
      const screen = render(<NewLogScreen />);
      fillDraft(screen);
      fireEvent.press(screen.getByLabelText("Attach log photos"));
      fireEvent.press(screen.getByLabelText("Create log"));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
      expectEmptyDraft(screen);
      fireEvent.changeText(screen.getByLabelText("Log title"), "Next draft");

      await act(async () => {
        if (outcome === "rejected") permission.reject(new Error("Old permission error"));
        else permission.resolve({ granted: outcome === "granted" });
      });
      expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Log title").props.value).toBe("Next draft");
      expect(screen.queryByLabelText("Remove attached photo 1")).toBeNull();
      expect(
        screen.queryByText("Photo-library permission is required to attach images.")
      ).toBeNull();
      expect(screen.queryByText("Old permission error")).toBeNull();
    }
  );

  it.each(["resolved", "rejected"])(
    "ignores a completed draft's late %s picker result",
    async (outcome) => {
      const picker = deferred();
      mockLaunchImageLibraryAsync.mockReturnValueOnce(picker.promise);
      const screen = render(<NewLogScreen />);
      fillDraft(screen);
      fireEvent.press(screen.getByLabelText("Attach log photos"));
      await waitFor(() => expect(mockLaunchImageLibraryAsync).toHaveBeenCalledTimes(1));
      fireEvent.press(screen.getByLabelText("Create log"));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
      expectEmptyDraft(screen);
      fireEvent.changeText(screen.getByLabelText("Log title"), "Next draft");

      await act(async () => {
        if (outcome === "rejected") picker.reject(new Error("Old picker error"));
        else
          picker.resolve({ canceled: false, assets: [{ uri: "file:///old-draft.jpg" }] });
      });
      expect(screen.getByLabelText("Log title").props.value).toBe("Next draft");
      expect(screen.queryByLabelText("Remove attached photo 1")).toBeNull();
      expect(screen.queryByText("Old picker error")).toBeNull();
      await attachPhoto(screen);
      fireEvent.press(screen.getByLabelText("Create log"));
      await waitFor(() => expect(mockCreatePersonalLog).toHaveBeenCalledTimes(2));
      expect(mockPersistImageUris).toHaveBeenLastCalledWith(
        ["file:///tmp/olive-leaf.jpg"],
        expect.objectContaining({ prepareForJournal: true })
      );
    }
  );

  it.each(["resolved", "rejected"])(
    "ignores old AI %s results and does not finish a newer draft's analysis",
    async (outcome) => {
      const oldAnalysis = deferred();
      const nextAnalysis = deferred();
      mockSuggestLogInsights
        .mockReturnValueOnce(oldAnalysis.promise)
        .mockReturnValueOnce(nextAnalysis.promise);
      const screen = render(<NewLogScreen />);
      fillDraft(screen);
      fireEvent.press(screen.getByLabelText("Suggest tags and summary"));
      await waitFor(() => expect(mockSuggestLogInsights).toHaveBeenCalledTimes(1));
      fireEvent.press(screen.getByLabelText("Create log"));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
      expectEmptyDraft(screen);
      fillDraft(screen, "Next draft");
      fireEvent.press(screen.getByLabelText("Suggest tags and summary"));
      await waitFor(() => expect(mockSuggestLogInsights).toHaveBeenCalledTimes(2));

      await act(async () => {
        if (outcome === "rejected") oldAnalysis.reject(new Error("Old analysis error"));
        else oldAnalysis.resolve({ tags: ["old-tag"], summary: "Old draft summary" });
      });
      expect(screen.queryByText("Old draft summary")).toBeNull();
      expect(screen.queryByText("Old analysis error")).toBeNull();
      expect(screen.queryByLabelText("Accept tag old-tag")).toBeNull();
      expect(screen.getByText("Analyzing...")).toBeTruthy();
      expect(screen.getByLabelText("Suggest tags and summary")).toBeDisabled();

      await act(async () =>
        nextAnalysis.resolve({ tags: ["next-tag"], summary: "Next draft summary" })
      );
      expect(screen.getByText("Next draft summary")).toBeTruthy();
      expect(screen.getByLabelText("Accept tag next-tag")).toBeTruthy();
      expect(screen.queryByText("Analyzing...")).toBeNull();
    }
  );

  it("keeps pending AI work attached to an unfinished draft after a failed save", async () => {
    const analysis = deferred();
    mockSuggestLogInsights.mockReturnValueOnce(analysis.promise);
    mockCreatePersonalLog.mockRejectedValueOnce(new Error("Save unavailable"));
    const screen = render(<NewLogScreen />);
    fillDraft(screen);
    await attachPhoto(screen);
    fireEvent.press(screen.getByLabelText("Suggest tags and summary"));
    fireEvent.press(screen.getByLabelText("Create log"));
    await screen.findByText("Save unavailable");
    await act(async () =>
      analysis.resolve({ summary: "Still belongs to this draft", tags: ["retained-tag"] })
    );

    expectRetainedDraft(screen);
    expect(screen.getByText("Still belongs to this draft")).toBeTruthy();
    expect(screen.getByLabelText("Accept tag retained-tag")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it.each(["photo", "AI"])(
    "retains a pending %s result that arrives before the save fails, including on retry",
    async (operation) => {
      const result = deferred();
      const create = deferred();
      mockCreatePersonalLog.mockReturnValueOnce(create.promise);
      const screen = render(<NewLogScreen />);
      fillDraft(screen);
      if (operation === "photo") {
        mockLaunchImageLibraryAsync.mockReturnValueOnce(result.promise);
        fireEvent.press(screen.getByLabelText("Attach log photos"));
        await waitFor(() => expect(mockLaunchImageLibraryAsync).toHaveBeenCalledTimes(1));
      } else {
        mockSuggestLogInsights.mockReturnValueOnce(result.promise);
        fireEvent.press(screen.getByLabelText("Suggest tags and summary"));
        await waitFor(() => expect(mockSuggestLogInsights).toHaveBeenCalledTimes(1));
      }
      fireEvent.press(screen.getByLabelText("Create log"));
      await waitFor(() => expect(mockCreatePersonalLog).toHaveBeenCalledTimes(1));
      await act(async () => {
        result.resolve(
          operation === "photo"
            ? { canceled: false, assets: [{ uri: "file:///tmp/olive-leaf.jpg" }] }
            : { tags: ["retained-tag"], summary: "Analysis returned during save" }
        );
      });
      await act(async () => create.reject(new Error("Save unavailable")));

      expect(screen.getByLabelText("Log title").props.value).toBe("Draft canopy check");
      expect(screen.getByText("Save unavailable")).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
      if (operation === "photo") {
        expect(screen.getByLabelText("Remove attached photo 1")).toBeTruthy();
      } else {
        expect(screen.getByText("Analysis returned during save")).toBeTruthy();
        fireEvent.press(screen.getByLabelText("Accept tag retained-tag"));
      }
      fireEvent.press(screen.getByLabelText("Create log"));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
      expect(mockCreatePersonalLog).toHaveBeenCalledTimes(2);
      expect(mockCreatePersonalLog.mock.calls[1][0]).toEqual(
        expect.objectContaining(
          operation === "photo"
            ? { photos: ["https://cdn.example.com/olive-leaf.jpg"] }
            : {
                tags: ["retained-tag"],
                aiInsight: expect.objectContaining({
                  summary: "Analysis returned during save"
                })
              }
        )
      );
    }
  );

  it("keeps the completed draft cleared when opening the journal fails after saving", async () => {
    mockReplace.mockImplementationOnce(() => {
      throw new Error("Navigation unavailable");
    });
    const screen = render(<NewLogScreen />);
    fillDraft(screen);
    await attachPhoto(screen);
    fireEvent.press(screen.getByLabelText("Create log"));

    await screen.findByText("Journal entry saved. Open the grow journal to view it.");
    expectEmptyDraft(screen);
    expect(mockCreatePersonalLog).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Create log")).toBeDisabled();
    expect(screen.queryByText("Failed to create log.")).toBeNull();
    fireEvent.press(screen.getByLabelText("Create log"));
    expect(mockCreatePersonalLog).toHaveBeenCalledTimes(1);
  });
});
