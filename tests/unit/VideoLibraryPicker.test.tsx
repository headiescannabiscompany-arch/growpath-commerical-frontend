import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockListVideoLibrary = jest.fn();
const mockOnSelect = jest.fn();
let mockMode = "personal";
let mockFacilityId: string | null = null;
let mockUserId = "user-1";

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    isAuthed: true,
    user: {
      id: mockUserId
    }
  })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: mockMode,
    facilityId: mockFacilityId
  })
}));

jest.mock("@/api/videos", () => ({
  listVideoLibrary: (...args: any[]) => mockListVideoLibrary(...args)
}));

import VideoLibraryPicker, { createStyles } from "@/components/videos/VideoLibraryPicker";
import { getThemePalette } from "@/theme/appTheme";

describe("VideoLibraryPicker", () => {
  beforeEach(() => {
    mockMode = "personal";
    mockFacilityId = null;
    mockUserId = "user-1";
    mockListVideoLibrary.mockReset();
    mockOnSelect.mockReset();
  });

  it("uses the active palette for filters and reusable video choices", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createStyles(palette);

    expect(styles.card.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.scopeButton.backgroundColor).toBe(palette.surface);
    expect(styles.scopeButton.borderColor).toBe(palette.border);
    expect(styles.scopeButtonSelected.backgroundColor).toBe(palette.accentSoft);
    expect(styles.option.backgroundColor).toBe(palette.surface);
    expect(styles.optionTitle.color).toBe(palette.text);
  });

  it("loads reusable videos and lets the user attach one without uploading again", async () => {
    mockListVideoLibrary.mockResolvedValue({
      videos: [
        {
          id: "video-1",
          title: "Reusable lesson clip",
          status: "draft",
          visibility: "public",
          uploaderUserId: "user-1"
        },
        {
          id: "video-2",
          title: "Published workspace clip",
          status: "published",
          visibility: "followers",
          uploaderUserId: "user-2"
        }
      ]
    });

    const screen = render(<VideoLibraryPicker onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Reusable lesson clip")).toBeTruthy();
    });
    expect(screen.getByText("Published workspace clip")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Show my uploads videos"));
    await waitFor(() => {
      expect(screen.getByText("Reusable lesson clip")).toBeTruthy();
    });
    expect(screen.queryByText("Published workspace clip")).toBeNull();

    fireEvent.press(screen.getByLabelText("Use library video Reusable lesson clip"));
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "video-1",
        title: "Reusable lesson clip"
      })
    );
  });

  it("shows a detach control when a lesson already has a selected library video", async () => {
    mockListVideoLibrary.mockResolvedValue({
      videos: [
        {
          id: "video-1",
          title: "Reusable lesson clip",
          status: "draft",
          visibility: "public",
          uploaderUserId: "user-1"
        }
      ]
    });

    const screen = render(
      <VideoLibraryPicker selectedId="video-1" onSelect={mockOnSelect} />
    );

    await waitFor(() => {
      expect(screen.getByText("Reusable lesson clip")).toBeTruthy();
    });
    fireEvent.press(screen.getByLabelText("Detach selected library video"));
    expect(mockOnSelect).toHaveBeenCalledWith(null);
  });
});
