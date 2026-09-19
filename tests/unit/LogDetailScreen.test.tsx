import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import LogDetailScreen, {
  createLogDetailStyles
} from "@/app/home/personal/(tabs)/logs/[logId]";
import { API_URL } from "@/api/apiRequest";
import { getThemePalette } from "@/theme/appTheme";

const mockGetPersonalLog = jest.fn();
const mockUpdatePersonalLog = jest.fn();
const mockDeletePersonalLog = jest.fn();
const mockPickPhotos = jest.fn();
const mockPhotoPermission = jest.fn();
const mockPersistPhotos = jest.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: () => mockPhotoPermission(),
  launchImageLibraryAsync: (...args: any[]) => mockPickPhotos(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  ...jest.requireActual("@/utils/photoUploads"),
  persistImageUris: (...args: any[]) => mockPersistPhotos(...args)
}));

jest.mock("@/api/logs", () => ({
  getPersonalLog: (...args: any[]) => mockGetPersonalLog(...args),
  updatePersonalLog: (...args: any[]) => mockUpdatePersonalLog(...args),
  deletePersonalLog: (...args: any[]) => mockDeletePersonalLog(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ logId: "log-1" }),
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() })
}));

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

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => callback(), [callback]);
    }
  };
});

jest.mock("@/components/nav/BackButton", () => {
  const { View } = require("react-native");
  return function MockBackButton() {
    return <View testID="back-button" />;
  };
});

describe("LogDetailScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPhotoPermission.mockResolvedValue({ granted: true });
    mockPickPhotos.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "blob:new-photo", width: 800, height: 600, mimeType: "image/jpeg" }]
    });
    mockPersistPhotos.mockResolvedValue(["/uploads/new-photo.jpg"]);
    mockGetPersonalLog.mockResolvedValue({
      id: "log-1",
      growId: "grow-1",
      plantId: "plant-1",
      type: "photo",
      date: "2026-06-30T12:00:00.000Z",
      title: "Leaf photo",
      notes: "Attached symptom photo.",
      photos: ["/uploads/log-photo.jpg"],
      photoMetadata: [
        {
          url: "/uploads/log-photo.jpg",
          mimeType: "image/jpeg",
          width: 1600,
          height: 1200
        }
      ],
      tags: ["yellowing"],
      createdAt: "2026-06-30T12:00:00.000Z",
      updatedAt: "2026-06-30T12:00:00.000Z"
    });
  });

  it("uses the active Night palette for journal content, fields, photos, and actions", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createLogDetailStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.center.backgroundColor).toBe(palette.page);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.meta.color).toBe(palette.textMuted);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.card.borderColor).toBe(palette.border);
    expect(styles.input.backgroundColor).toBe(palette.surfaceStrong);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.notesInput.borderColor).toBe(palette.border);
    expect(styles.tag.backgroundColor).toBe(palette.accentSoft);
    expect(styles.rejectedTag.color).toBe(palette.danger);
    expect(styles.photoTile.backgroundColor).toBe(palette.card);
    expect(styles.photoFallback.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.photoFallbackTitle.color).toBe(palette.warning);
    expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(styles.primaryButtonText.color).toBe(palette.accentText);
    expect(styles.secondaryButton.backgroundColor).toBe(palette.surface);
    expect(styles.dangerButton.borderColor).toBe(palette.danger);
    expect(styles.feedback.backgroundColor).toBe(palette.surfaceMuted);
  });

  it("renders uploaded log photos with absolute API image URLs", async () => {
    const screen = render(<LogDetailScreen />);

    await waitFor(() => expect(mockGetPersonalLog).toHaveBeenCalledWith("log-1"));
    expect(screen.getByText("Leaf photo")).toBeTruthy();
    expect(screen.getByText("image/jpeg | 1600x1200")).toBeTruthy();

    const image = screen.getByLabelText("Journal photo 1");
    expect(image.props.source).toEqual({
      uri: `${API_URL}/uploads/log-photo.jpg`
    });
  });

  it("shows a stable fallback when an uploaded log photo cannot load", async () => {
    const screen = render(<LogDetailScreen />);

    await waitFor(() => expect(mockGetPersonalLog).toHaveBeenCalledWith("log-1"));
    const image = screen.getByLabelText("Journal photo 1");
    fireEvent(image, "error");

    expect(screen.getByText("Photo unavailable")).toBeTruthy();
    expect(screen.getByText("/uploads/log-photo.jpg")).toBeTruthy();
    expect(screen.getByText("image/jpeg | 1600x1200")).toBeTruthy();
  });

  it("uses the Night accent for every editable journal field selection", async () => {
    const screen = render(<LogDetailScreen />);
    const palette = getThemePalette("night", "dark");

    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));

    ["Edit log title", "Edit log type", "Edit log notes", "Edit log tags"].forEach(
      (label) => {
        const field = screen.getByLabelText(label);
        expect(field.props.placeholderTextColor).toBe(palette.textMuted);
        expect(field.props.selectionColor).toBe(palette.accent);
      }
    );
  });

  it("adds photos to an older entry without replacing existing photos or granting AI consent", async () => {
    mockUpdatePersonalLog.mockImplementation(async (_id, patch) => ({
      ...(await mockGetPersonalLog()),
      ...patch
    }));
    const screen = render(<LogDetailScreen />);
    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));
    fireEvent.press(screen.getByLabelText("Add photos to journal entry"));
    await waitFor(() =>
      expect(screen.getByLabelText("New journal photo 1")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Save log changes"));
    await waitFor(() => expect(screen.getByText("Journal entry saved.")).toBeTruthy());
    expect(mockPersistPhotos).toHaveBeenCalledWith(["blob:new-photo"]);
    expect(mockUpdatePersonalLog).toHaveBeenCalledWith(
      "log-1",
      expect.objectContaining({
        date: "2026-06-30T12:00:00.000Z",
        photos: ["/uploads/log-photo.jpg", "/uploads/new-photo.jpg"],
        photoMetadata: [
          expect.objectContaining({ url: "/uploads/log-photo.jpg", width: 1600 }),
          expect.objectContaining({
            url: "/uploads/new-photo.jpg",
            consentForAI: false,
            consentForTraining: false
          })
        ]
      })
    );
    expect(screen.getByLabelText("Journal photo 2")).toBeTruthy();
  });

  it("keeps the draft on upload failure and does not save partial changes", async () => {
    mockPersistPhotos.mockRejectedValue(new Error("Upload unavailable"));
    const screen = render(<LogDetailScreen />);
    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));
    fireEvent.press(screen.getByLabelText("Add photos to journal entry"));
    await waitFor(() =>
      expect(screen.getByLabelText("New journal photo 1")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Save log changes"));
    await waitFor(() =>
      expect(screen.getByText(/Your changes are still here/)).toBeTruthy()
    );
    expect(mockUpdatePersonalLog).not.toHaveBeenCalled();
    expect(screen.getByLabelText("New journal photo 1")).toBeTruthy();
  });

  it("does not attach canceled draft photos when editing again", async () => {
    const screen = render(<LogDetailScreen />);
    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));
    fireEvent.press(screen.getByLabelText("Add photos to journal entry"));
    await waitFor(() =>
      expect(screen.getByLabelText("New journal photo 1")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Cancel log editing"));
    fireEvent.press(screen.getByLabelText("Edit log entry"));
    expect(screen.queryByLabelText("New journal photo 1")).toBeNull();
    expect(mockUpdatePersonalLog).not.toHaveBeenCalled();
    expect(mockPersistPhotos).not.toHaveBeenCalled();
  });

  it("leaves existing photos untouched when library permission is denied", async () => {
    mockPhotoPermission.mockResolvedValue({ granted: false });
    const screen = render(<LogDetailScreen />);
    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));
    fireEvent.press(screen.getByLabelText("Add photos to journal entry"));
    await waitFor(() =>
      expect(screen.getByText(/Photo-library permission is required/)).toBeTruthy()
    );
    expect(mockPickPhotos).not.toHaveBeenCalled();
    expect(mockUpdatePersonalLog).not.toHaveBeenCalled();
  });

  it("reuses an uploaded photo after a failed save instead of uploading its local URI again", async () => {
    mockUpdatePersonalLog.mockResolvedValue(null);
    const screen = render(<LogDetailScreen />);
    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));
    fireEvent.press(screen.getByLabelText("Add photos to journal entry"));
    await waitFor(() =>
      expect(screen.getByLabelText("New journal photo 1")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Save log changes"));
    await waitFor(() =>
      expect(screen.getByText("Unable to save journal entry.")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Save log changes"));
    await waitFor(() => expect(mockPersistPhotos).toHaveBeenCalledTimes(2));
    expect(mockPersistPhotos.mock.calls[1][0]).toEqual(["/uploads/new-photo.jpg"]);
  });

  it("retains completed uploads when a later photo fails and retries only its local URI", async () => {
    mockPickPhotos.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "blob:first", width: 800, height: 600, mimeType: "image/jpeg" },
        { uri: "blob:second", width: 1200, height: 900, mimeType: "image/png" }
      ]
    });
    mockPersistPhotos
      .mockResolvedValueOnce(["/uploads/first.jpg"])
      .mockRejectedValueOnce(new Error("Second photo upload failed"))
      .mockImplementation(async ([uri]) => [
        uri === "blob:second" ? "/uploads/second.png" : uri
      ]);
    mockUpdatePersonalLog.mockImplementation(async (_id, patch) => ({
      ...(await mockGetPersonalLog()),
      ...patch
    }));
    const screen = render(<LogDetailScreen />);
    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));
    fireEvent.press(screen.getByLabelText("Add photos to journal entry"));
    await waitFor(() =>
      expect(screen.getByLabelText("New journal photo 2")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Save log changes"));
    await waitFor(() =>
      expect(screen.getByText(/Your changes are still here/)).toBeTruthy()
    );
    expect(mockUpdatePersonalLog).not.toHaveBeenCalled();
    expect(screen.getByLabelText("New journal photo 1").props.source).toEqual({
      uri: `${API_URL}/uploads/first.jpg`
    });
    expect(screen.getByLabelText("New journal photo 2").props.source).toEqual({
      uri: "blob:second"
    });

    fireEvent.press(screen.getByLabelText("Save log changes"));
    await waitFor(() => expect(screen.getByText("Journal entry saved.")).toBeTruthy());
    expect(mockPersistPhotos.mock.calls.map(([uris]) => uris)).toEqual([
      ["blob:first"],
      ["blob:second"],
      ["/uploads/first.jpg"],
      ["blob:second"]
    ]);
    expect(mockUpdatePersonalLog).toHaveBeenCalledWith(
      "log-1",
      expect.objectContaining({
        date: "2026-06-30T12:00:00.000Z",
        photos: ["/uploads/log-photo.jpg", "/uploads/first.jpg", "/uploads/second.png"],
        photoMetadata: [
          expect.objectContaining({ url: "/uploads/log-photo.jpg", width: 1600 }),
          expect.objectContaining({ url: "/uploads/first.jpg", width: 800 }),
          expect.objectContaining({ url: "/uploads/second.png", width: 1200 })
        ]
      })
    );
  });

  it("waits for the pending picker before allowing save, cancel, removal, or another picker", async () => {
    const pendingPicker = deferred<any>();
    mockPickPhotos
      .mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "blob:first", width: 800, height: 600 }]
      })
      .mockReturnValueOnce(pendingPicker.promise);
    mockPersistPhotos.mockImplementation(async ([uri]) => [
      uri === "blob:first" ? "/uploads/first.jpg" : "/uploads/second.jpg"
    ]);
    mockUpdatePersonalLog.mockImplementation(async (_id, patch) => ({
      ...(await mockGetPersonalLog()),
      ...patch
    }));
    const screen = render(<LogDetailScreen />);
    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));
    fireEvent.press(screen.getByLabelText("Add photos to journal entry"));
    await waitFor(() =>
      expect(screen.getByLabelText("New journal photo 1")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Add photos to journal entry"));
    await waitFor(() => expect(mockPickPhotos).toHaveBeenCalledTimes(2));

    for (const label of [
      "Save log changes",
      "Cancel log editing",
      "Remove new photo 1",
      "Add photos to journal entry"
    ]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
      fireEvent.press(screen.getByLabelText(label));
    }
    expect(mockPickPhotos).toHaveBeenCalledTimes(2);
    expect(mockPersistPhotos).not.toHaveBeenCalled();
    expect(mockUpdatePersonalLog).not.toHaveBeenCalled();
    expect(screen.getByLabelText("New journal photo 1").props.source).toEqual({
      uri: "blob:first"
    });

    await act(async () => {
      pendingPicker.resolve({
        canceled: false,
        assets: [{ uri: "blob:second", width: 1200, height: 900 }]
      });
    });
    expect(screen.getByLabelText("New journal photo 2").props.source).toEqual({
      uri: "blob:second"
    });
    expect(screen.getByLabelText("Save log changes")).not.toBeDisabled();
    fireEvent.press(screen.getByLabelText("Save log changes"));
    await waitFor(() => expect(screen.getByText("Journal entry saved.")).toBeTruthy());
    expect(mockUpdatePersonalLog).toHaveBeenCalledWith(
      "log-1",
      expect.objectContaining({
        photos: ["/uploads/log-photo.jpg", "/uploads/first.jpg", "/uploads/second.jpg"]
      })
    );
  });

  it("keeps the photo draft locked while its upload is pending", async () => {
    const pendingUpload = deferred<string[]>();
    mockPersistPhotos.mockReturnValueOnce(pendingUpload.promise);
    mockUpdatePersonalLog.mockResolvedValue(null);
    const screen = render(<LogDetailScreen />);
    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));
    fireEvent.press(screen.getByLabelText("Add photos to journal entry"));
    await waitFor(() =>
      expect(screen.getByLabelText("New journal photo 1")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Save log changes"));
    for (const label of [
      "Save log changes",
      "Cancel log editing",
      "Remove new photo 1",
      "Add photos to journal entry"
    ]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
      fireEvent.press(screen.getByLabelText(label));
    }
    expect(mockPersistPhotos).toHaveBeenCalledTimes(1);
    expect(mockPickPhotos).toHaveBeenCalledTimes(1);
    for (const label of [
      "Edit log title",
      "Edit log type",
      "Edit log notes",
      "Edit log tags"
    ]) {
      expect(screen.getByLabelText(label).props.editable).toBe(false);
    }
    expect(screen.getByLabelText("Edit log date")).toBeDisabled();

    await act(async () => pendingUpload.resolve(["/uploads/new-photo.jpg"]));
    await waitFor(() =>
      expect(screen.getByText("Unable to save journal entry.")).toBeTruthy()
    );
    expect(screen.getByLabelText("New journal photo 1").props.source).toEqual({
      uri: `${API_URL}/uploads/new-photo.jpg`
    });
    expect(screen.getByLabelText("Save log changes")).not.toBeDisabled();
    expect(screen.getByLabelText("Edit log title").props.editable).toBe(true);
    expect(screen.getByLabelText("Edit log date")).not.toBeDisabled();
  });
});
