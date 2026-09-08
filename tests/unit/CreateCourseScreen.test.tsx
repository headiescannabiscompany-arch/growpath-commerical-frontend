import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CreateCourseScreen from "@/screens/commercial/CreateCourseScreen";

function chooseDateTime(screen: ReturnType<typeof render>, label: string, value: string) {
  const [date, time] = value.split("T");
  const [year, month] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  fireEvent.press(screen.getByLabelText(label));
  fireEvent(screen.getByLabelText(`${label} year`), "valueChange", year);
  fireEvent(screen.getByLabelText(`${label} month`), "valueChange", month);
  fireEvent.press(screen.getByLabelText(`${label} day ${date}`));
  fireEvent(screen.getByLabelText(`${label} hour`), "valueChange", hour);
  fireEvent(screen.getByLabelText(`${label} minute`), "valueChange", minute);
  fireEvent.press(screen.getByLabelText(`${label} use selected date`));
}

const mockCreateCourse = jest.fn();
const mockCreateCommercialCourse = jest.fn();
const mockWorkspaceMode = { value: "personal" };
const mockReplace = jest.fn();
const mockPersistImageUri = jest.fn();
const mockPersistImageUris = jest.fn();
const mockUploadCourseMedia = jest.fn();
const mockDeleteCourseMediaAsset = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockGetDocumentAsync = jest.fn();
const mockGetTwitchConnection = jest.fn();
const mockBeginTwitchConnection = jest.fn();
const mockValidateTwitchConnection = jest.fn();
const CONNECTED_TWITCH = {
  configured: true,
  connection: {
    status: "connected",
    broadcasterId: "broadcaster-1",
    broadcasterLogin: "growpath",
    broadcasterName: "GrowPath",
    eventSubStatus: "connected"
  }
};

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/api/courses", () => ({
  createCourse: (...args: any[]) => mockCreateCourse(...args)
}));

jest.mock("@/api/commercialWorkflows", () => ({
  createCommercialCourse: (...args: any[]) => mockCreateCommercialCourse(...args)
}));

jest.mock("@/api/uploads", () => ({
  deleteCourseMediaAsset: (...args: any[]) => mockDeleteCourseMediaAsset(...args),
  uploadCourseMedia: (...args: any[]) => mockUploadCourseMedia(...args)
}));

jest.mock("@/components/videos/VideoLibraryPicker", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onSelect }: any) => (
    <Pressable
      accessibilityLabel="Select protected course library video"
      accessibilityRole="button"
      onPress={() =>
        onSelect({
          id: "64f000000000000000000801",
          title: "Protected library lesson",
          mediaSource: {
            sourceType: "growpath_upload",
            provider: "growpath",
            providerLabel: "GrowPath upload",
            originalUrl: "/api/videos/uploads/64f000000000000000000802/object",
            canonicalUrl: "/api/videos/uploads/64f000000000000000000802/object",
            availabilityStatus: "available",
            embedCapability: "native"
          }
        })
      }
    >
      <Text>Select protected course library video</Text>
    </Pressable>
  );
});

jest.mock("@/api/twitch", () => ({
  getTwitchConnection: (...args: any[]) => mockGetTwitchConnection(...args),
  beginTwitchConnection: (...args: any[]) => mockBeginTwitchConnection(...args),
  validateTwitchConnection: (...args: any[]) => mockValidateTwitchConnection(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args),
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args),
  resolveImageUri: (uri: string) => uri
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibraryAsync(...args)
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockGetDocumentAsync(...args)
}));

jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  const { ScrollView, View } = require("react-native");
  return ({ children, scroll }: any) =>
    scroll
      ? React.createElement(ScrollView, null, children)
      : React.createElement(View, null, children);
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COURSES_VIEW: "COURSES_VIEW",
    COURSES_CREATE: "COURSES_CREATE",
    COURSES_SELL_PAID: "COURSES_SELL_PAID",
    SEE_PAID_COURSES: "SEE_PAID_COURSES",
    PUBLISH_COURSES: "PUBLISH_COURSES",
    COURSES_ANALYTICS: "COURSES_ANALYTICS",
    COURSES_CERTIFICATES: "COURSES_CERTIFICATES"
  },
  useEntitlements: () => ({
    mode: mockWorkspaceMode.value,
    limits: { maxPaidCourses: 1, maxLessonsPerCourse: 12 },
    can: (capability: string) =>
      capability === "COURSES_VIEW" ||
      capability === "COURSES_CREATE" ||
      capability === "COURSES_SELL_PAID"
  })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { growInterests: {} } })
}));

describe("CreateCourseScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockWorkspaceMode.value = "personal";
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockCreateCourse.mockResolvedValue({ id: "course-new", title: "Living Soil 101" });
    mockCreateCommercialCourse.mockResolvedValue({
      id: "commercial-course-new",
      title: "Commercial Living Soil 101"
    });
    mockGetTwitchConnection.mockReturnValue(new Promise(() => {}));
    mockBeginTwitchConnection.mockResolvedValue({
      configured: true,
      authorizationUrl: "https://id.twitch.tv/oauth2/authorize"
    });
    mockValidateTwitchConnection.mockResolvedValue({ ok: true });
    mockDeleteCourseMediaAsset.mockResolvedValue({ cleanupStatus: "released" });
    mockPersistImageUri.mockImplementation(async (uri) =>
      uri ? "uploaded-cover.jpg" : null
    );
    mockPersistImageUris.mockResolvedValue(["/uploads/course-gallery.jpg"]);
    mockUploadCourseMedia
      .mockResolvedValueOnce({ url: "/uploads/course-workbook.pdf" })
      .mockResolvedValueOnce({ url: "/uploads/course-video.mp4" });
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "local-cover.jpg" }]
    });
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/course-workbook.pdf",
          name: "course-workbook.pdf",
          mimeType: "application/pdf",
          size: 1024
        }
      ]
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the full course builder workflow", () => {
    const screen = render(<CreateCourseScreen />);

    expect(
      screen.getByRole("header", { name: "Create Course" }).props["aria-level"]
    ).toBe(1);
    expect(screen.getByText("Back to Courses")).toBeTruthy();
    [
      "1. Course basics",
      "2. Curriculum / lessons",
      "3. Documents / media",
      "4. Live sessions",
      "5. Links",
      "6. Pricing / access",
      "7. Preview / publish"
    ].forEach((name) => {
      expect(screen.getByRole("header", { name }).props["aria-level"]).toBe(2);
    });
    expect(
      screen.getByRole("radio", { name: "Make course free" }).props.accessibilityState
        ?.checked
    ).toBe(true);
    expect(screen.getByText("Lessons: 0 / plan limit")).toBeTruthy();
    expect(screen.getByText("Upload Cover Image")).toBeTruthy();
    expect(screen.getByText("Upload Documents")).toBeTruthy();
    expect(screen.getByText("Upload Video / Audio")).toBeTruthy();
    expect(screen.getByText("Upload Images")).toBeTruthy();
    expect(screen.getByText("Twitch, calendar, and reminders")).toBeTruthy();
    expect(screen.getByText("Open Schedule")).toBeTruthy();
    expect(screen.getByText("Notifications")).toBeTruthy();
    expect(
      Array.isArray(screen.getByLabelText("Open shared GrowPath Schedule").props.style)
    ).toBe(false);
  });

  it("creates structured draft payloads for lessons, documents, lives, and links", async () => {
    mockGetTwitchConnection.mockResolvedValue(CONNECTED_TWITCH);
    const screen = render(<CreateCourseScreen />);

    await waitFor(() =>
      expect(screen.getByText("Connected as GrowPath. EventSub connected.")).toBeTruthy()
    );
    fireEvent.changeText(screen.getByLabelText("Course title"), "Living Soil 101");
    fireEvent.changeText(
      screen.getByLabelText("Course summary"),
      "Build a reusable soil."
    );
    fireEvent.changeText(
      screen.getByLabelText("Course description"),
      "A practical course."
    );
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Basics\nAmendments"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course quiz outline"),
      "What controls nutrient availability? | pH | Pot color"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course documents"),
      "Worksheet PDF\nSoil checklist"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course media plan"),
      "Two 20 minute videos"
    );
    fireEvent.changeText(screen.getByLabelText("Live session title"), "Live Q&A");
    chooseDateTime(screen, "Live session start", "2026-07-20T19:00");
    chooseDateTime(screen, "Live session end", "2026-07-20T20:00");
    fireEvent.changeText(
      screen.getByLabelText("Live session Twitch channel"),
      "https://www.twitch.tv/growpath"
    );
    fireEvent.press(screen.getByLabelText("Add scheduled Twitch session"));
    fireEvent.changeText(
      screen.getByLabelText("Linked product ids"),
      "product-1\nproduct-2"
    );
    fireEvent.changeText(screen.getByLabelText("Linked grow ids"), "grow-1");
    fireEvent.changeText(screen.getByLabelText("Linked forum thread ids"), "thread-1");
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Living Soil 101",
        status: "draft",
        isPublished: false,
        access: "free",
        priceCents: 0,
        price: 0,
        workspace: "personal",
        mediaPlan: "Two 20 minute videos",
        linkedProductIds: ["product-1", "product-2"],
        linkedGrowIds: ["grow-1"],
        linkedForumThreadIds: ["thread-1"],
        lessons: [
          expect.objectContaining({ title: "Basics", order: 1, status: "draft" }),
          expect.objectContaining({ title: "Amendments", order: 2, status: "draft" })
        ],
        quizzes: [
          expect.objectContaining({
            question: "What controls nutrient availability?",
            options: ["pH", "Pot color"],
            sortOrder: 1,
            status: "draft"
          })
        ],
        documents: [
          expect.objectContaining({ title: "Worksheet PDF", status: "planned" }),
          expect.objectContaining({ title: "Soil checklist", status: "planned" })
        ],
        liveSessions: [
          expect.objectContaining({
            title: "Live Q&A",
            scheduledStart: "2026-07-20T19:00",
            scheduledEnd: "2026-07-20T20:00",
            platform: "twitch",
            twitchChannel: "growpath",
            twitchChannelId: "broadcaster-1",
            twitchConnectionStatus: "connected",
            eventSubStatus: "connected",
            meetingUrl: "https://www.twitch.tv/growpath",
            createLearnerTask: true,
            calendarType: "course_live_session",
            notificationPlan: expect.arrayContaining([
              "new_live_scheduled",
              "1h_before",
              "live_now",
              "replay_available"
            ]),
            status: "scheduled"
          })
        ],
        authoringPlan: expect.objectContaining({
          step: "draft",
          requiredSteps: expect.arrayContaining([
            "basics",
            "curriculum",
            "documents_media",
            "live_sessions",
            "links",
            "pricing_access",
            "preview_publish"
          ])
        })
      })
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/home/personal/courses",
      params: { courseId: "course-new" }
    });
  });

  it("creates Commercial drafts through the Commercial course workflow", async () => {
    mockWorkspaceMode.value = "commercial";
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(
      screen.getByLabelText("Course title"),
      "Commercial Living Soil 101"
    );
    fireEvent.changeText(
      screen.getByLabelText("Course summary"),
      "A Commercial workspace draft."
    );
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Formula evidence"
    );
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCommercialCourse).toHaveBeenCalled());
    expect(mockCreateCommercialCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Commercial Living Soil 101",
        summary: "A Commercial workspace draft.",
        workspace: "commercial",
        status: "draft",
        isPublished: false,
        priceCents: 0,
        price: 0,
        growInterests: [],
        growInterestSelections: expect.any(Object),
        lessons: [expect.objectContaining({ title: "Formula evidence" })]
      })
    );
    expect(mockCreateCourse).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/home/commercial/courses",
      params: { courseId: "commercial-course-new" }
    });
  });

  it.each(["OWNER", "MANAGER"])(
    "keeps Facility %s drafts scoped, defaults to Facility Only, and rejects Facility-only paid drafts",
    async (role) => {
      const facilityCreate = jest
        .fn()
        .mockResolvedValue({ id: "facility-course-new", title: "Facility Training" });
      const facilityWorkspace = {
        facilityId: "facility-1",
        role,
        permissions: { canCreateDraft: true, canSetPrice: true },
        limits: { maxPaidCourses: 5, maxLessonsPerCourse: 100 },
        api: { create: facilityCreate }
      };
      const screen = render(
        <CreateCourseScreen
          showBackToCourses={false}
          facilityWorkspace={facilityWorkspace}
        />
      );

      expect(
        screen.getByRole("radio", { name: "Set course audience to Facility Only" }).props
          .accessibilityState?.checked
      ).toBe(true);
      expect(screen.queryAllByTestId("personal-feed-placement")).toHaveLength(0);
      expect(screen.queryByLabelText("Upload course documents")).toBeNull();
      expect(screen.queryByLabelText("Course documents")).toBeNull();
      expect(
        screen.getByText(/Facility document uploads are temporarily unavailable/)
      ).toBeTruthy();
      expect(screen.getByText("Upload Audio")).toBeTruthy();

      fireEvent.changeText(screen.getByLabelText("Course title"), "Facility Training");
      fireEvent.press(screen.getByRole("radio", { name: "Set a paid course fee" }));
      fireEvent.changeText(screen.getByLabelText("Course price USD"), "25.00");
      fireEvent.press(screen.getByText("Create Draft"));

      expect(Alert.alert).toHaveBeenCalledWith(
        "Choose a paid-course audience",
        "A paid Facility course must be Public Catalog or Unlisted Link before it can be saved."
      );
      expect(facilityCreate).not.toHaveBeenCalled();

      fireEvent.press(
        screen.getByRole("radio", { name: "Set course audience to Unlisted Link" })
      );
      fireEvent.press(screen.getByText("Create Draft"));

      await waitFor(() => expect(facilityCreate).toHaveBeenCalled());
      expect(facilityCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Facility Training",
          workspace: "facility",
          visibility: "unlisted",
          access: "paid",
          priceCents: 2500,
          isPublished: false
        })
      );
      expect(mockCreateCourse).not.toHaveBeenCalled();
      expect(mockCreateCommercialCourse).not.toHaveBeenCalled();
    }
  );

  it("creates a free Facility Staff draft without owner-only price fields", async () => {
    const facilityCreate = jest
      .fn()
      .mockResolvedValue({ id: "facility-staff-course", title: "Staff Training" });
    const facilityWorkspace = {
      facilityId: "facility-1",
      role: "STAFF",
      permissions: { canCreateDraft: true, canSetPrice: false },
      limits: { maxPaidCourses: 5, maxLessonsPerCourse: 100 },
      api: { create: facilityCreate }
    };
    const screen = render(
      <CreateCourseScreen
        showBackToCourses={false}
        facilityWorkspace={facilityWorkspace}
      />
    );

    expect(
      screen.getByRole("radio", { name: "Make course free" }).props.accessibilityState
        ?.checked
    ).toBe(true);
    fireEvent.press(screen.getByRole("radio", { name: "Set a paid course fee" }));
    expect(
      screen.getByRole("radio", { name: "Set a paid course fee" }).props
        .accessibilityState?.checked
    ).toBe(false);
    expect(screen.queryByLabelText("Course price USD")).toBeNull();

    fireEvent.changeText(screen.getByLabelText("Course title"), "Staff Training");
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(facilityCreate).toHaveBeenCalledTimes(1));
    const payload = facilityCreate.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        title: "Staff Training",
        workspace: "facility",
        visibility: "facilityOnly",
        access: "free",
        isPublished: false
      })
    );
    expect(payload).not.toHaveProperty("priceCents");
    expect(payload).not.toHaveProperty("price");
    expect(mockCreateCourse).not.toHaveBeenCalled();
    expect(mockCreateCommercialCourse).not.toHaveBeenCalled();
  });

  it("keeps Facility audio, images, cover, and selected videos in the exact workspace", async () => {
    const facilityCreate = jest
      .fn()
      .mockResolvedValue({ id: "facility-course-media", title: "Facility Media" });
    const facilityWorkspace = {
      facilityId: "facility-1",
      role: "OWNER",
      permissions: { canCreateDraft: true, canSetPrice: true },
      limits: { maxPaidCourses: 5, maxLessonsPerCourse: 100 },
      api: { create: facilityCreate }
    };
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/facility-audio.mp3",
          name: "facility-audio.mp3",
          mimeType: "audio/mpeg"
        }
      ]
    });
    mockLaunchImageLibraryAsync
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: "file:///tmp/facility-cover.jpg",
            fileName: "facility-cover.jpg",
            mimeType: "image/jpeg"
          }
        ]
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: "file:///tmp/facility-gallery.jpg",
            fileName: "facility-gallery.jpg",
            mimeType: "image/jpeg"
          }
        ]
      });
    mockUploadCourseMedia.mockReset();
    mockUploadCourseMedia.mockImplementation(async (asset: any) => {
      const file = String(asset?.name || asset?.fileName || asset?.uri || asset);
      const id = file.includes("audio")
        ? "912"
        : file.includes("gallery")
          ? "913"
          : "914";
      return { url: `/api/course-media/64f000000000000000000${id}/file` };
    });
    const screen = render(
      <CreateCourseScreen
        showBackToCourses={false}
        facilityWorkspace={facilityWorkspace}
      />
    );

    fireEvent.changeText(screen.getByLabelText("Course title"), "Facility Media");
    fireEvent.press(screen.getByLabelText("Upload course cover image"));
    await waitFor(() =>
      expect(screen.getByLabelText("Course cover image preview")).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Protected lesson"
    );
    fireEvent.press(screen.getByLabelText("Edit video source for Protected lesson"));
    expect(screen.queryByLabelText("Choose GrowPath lesson video upload")).toBeNull();
    fireEvent.press(screen.getByLabelText("Select protected course library video"));
    fireEvent.press(screen.getByLabelText("Upload course media files"));
    await waitFor(() => expect(screen.getByText("1 Media File")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Upload course image set"));
    await waitFor(() =>
      expect(screen.getByLabelText("Course media image 1")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(facilityCreate).toHaveBeenCalled());
    expect(mockPersistImageUri).not.toHaveBeenCalled();
    expect(mockPersistImageUris).not.toHaveBeenCalled();
    expect(mockUploadCourseMedia).toHaveBeenCalledTimes(3);
    for (const call of mockUploadCourseMedia.mock.calls) {
      expect(call[1]).toEqual({
        workspaceType: "facility",
        workspaceId: "facility-1"
      });
    }
    expect(facilityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        coverImageUrl: "/api/course-media/64f000000000000000000914/file",
        lessons: [
          expect.objectContaining({
            videoAssetId: "64f000000000000000000801",
            videoUrl: "/api/videos/uploads/64f000000000000000000802/object"
          })
        ],
        documents: [],
        mediaAssets: expect.arrayContaining([
          expect.objectContaining({
            type: "audio",
            storageUrl: "/api/course-media/64f000000000000000000912/file"
          }),
          expect.objectContaining({
            type: "image",
            storageUrl: "/api/course-media/64f000000000000000000913/file"
          })
        ])
      })
    );
  });

  it("releases newly uploaded Facility media when draft creation fails", async () => {
    const facilityCreate = jest.fn().mockRejectedValue(new Error("draft save failed"));
    const facilityWorkspace = {
      facilityId: "facility-1",
      role: "OWNER",
      permissions: { canCreateDraft: true, canSetPrice: true },
      limits: { maxPaidCourses: 5, maxLessonsPerCourse: 100 },
      api: { create: facilityCreate }
    };
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/facility-image.jpg",
          fileName: "facility-image.jpg",
          mimeType: "image/jpeg"
        }
      ]
    });
    mockUploadCourseMedia.mockReset();
    mockUploadCourseMedia.mockResolvedValue({
      assetId: "64f000000000000000000899",
      url: "/api/course-media/64f000000000000000000899/file"
    });
    const screen = render(
      <CreateCourseScreen
        showBackToCourses={false}
        facilityWorkspace={facilityWorkspace}
      />
    );

    fireEvent.changeText(screen.getByLabelText("Course title"), "Failed Facility Draft");
    fireEvent.press(screen.getByLabelText("Upload course image set"));
    await waitFor(() =>
      expect(screen.getByLabelText("Course media image 1")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() =>
      expect(mockDeleteCourseMediaAsset).toHaveBeenCalledWith("64f000000000000000000899")
    );
  });

  it("waits for every Facility upload before cleaning a successful peer after failure", async () => {
    const facilityCreate = jest.fn();
    const facilityWorkspace = {
      facilityId: "facility-1",
      role: "OWNER",
      permissions: { canCreateDraft: true, canSetPrice: true },
      limits: { maxPaidCourses: 5, maxLessonsPerCourse: 100 },
      api: { create: facilityCreate }
    };
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/rejected-image.jpg",
          fileName: "rejected-image.jpg",
          mimeType: "image/jpeg"
        },
        {
          uri: "file:///tmp/slow-image.jpg",
          fileName: "slow-image.jpg",
          mimeType: "image/jpeg"
        }
      ]
    });
    let resolveSlowUpload: (value: any) => void = () => {};
    mockUploadCourseMedia.mockReset();
    mockUploadCourseMedia.mockImplementation((asset: any) => {
      if (String(asset?.fileName || "").includes("rejected")) {
        return Promise.reject(new Error("one upload failed"));
      }
      return new Promise((resolve) => {
        resolveSlowUpload = resolve;
      });
    });
    const screen = render(
      <CreateCourseScreen
        showBackToCourses={false}
        facilityWorkspace={facilityWorkspace}
      />
    );

    fireEvent.changeText(screen.getByLabelText("Course title"), "Partial upload");
    fireEvent.press(screen.getByLabelText("Upload course image set"));
    await waitFor(() =>
      expect(screen.getByLabelText("Course media image 2")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Create Draft"));
    await waitFor(() => expect(mockUploadCourseMedia).toHaveBeenCalledTimes(2));
    expect(mockDeleteCourseMediaAsset).not.toHaveBeenCalled();

    await act(async () => {
      resolveSlowUpload({
        assetId: "64f000000000000000000898",
        url: "/api/course-media/64f000000000000000000898/file"
      });
    });

    await waitFor(() =>
      expect(mockDeleteCourseMediaAsset).toHaveBeenCalledWith("64f000000000000000000898")
    );
    expect(facilityCreate).not.toHaveBeenCalled();
  });

  it("uses the shared provider-aware video workflow in the initial course builder", async () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Provider Course");
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Provider-aware lesson"
    );
    fireEvent.press(screen.getByLabelText("Edit video source for Provider-aware lesson"));
    fireEvent.changeText(
      screen.getByLabelText("Lesson video page URL"),
      "https://www.youtube.com/watch?v=CUIifOqeS1Q"
    );
    fireEvent.press(screen.getByLabelText("Current availability: Available"));
    fireEvent.press(
      screen.getByLabelText("Confirm rights or permission for lesson video")
    );
    fireEvent.press(screen.getByLabelText("Captions: Provided"));
    fireEvent.changeText(
      screen.getByLabelText("Learner-visible lesson video summary"),
      "Learners can follow the provider-aware lesson without loading the video."
    );
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        lessons: [
          expect.objectContaining({
            title: "Provider-aware lesson",
            videoUrl: "https://www.youtube.com/watch?v=CUIifOqeS1Q",
            externalVideoUrl: "https://www.youtube.com/watch?v=CUIifOqeS1Q",
            mediaSource: expect.objectContaining({
              sourceType: "youtube",
              providerLabel: "YouTube",
              creatorRightsConfirmed: true,
              availabilityStatus: "available",
              captionsStatus: "provided",
              externalLinkFallback: "https://www.youtube.com/watch?v=CUIifOqeS1Q"
            })
          })
        ]
      })
    );
  });

  it("rejects unsafe lesson video markup before creating the course", () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Safe Media Course");
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Unsafe lesson"
    );
    fireEvent.press(screen.getByLabelText("Edit video source for Unsafe lesson"));
    fireEvent.changeText(
      screen.getByLabelText("Lesson video page URL"),
      '<iframe src="https://example.com/video"></iframe>'
    );
    fireEvent.press(screen.getByText("Create Draft"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Video source needs attention: Unsafe lesson",
      expect.stringContaining("not iframe, embed, script, or HTML code")
    );
    expect(mockCreateCourse).not.toHaveBeenCalled();
  });

  it("selects a protected GrowPath lesson video from Video Library", async () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Upload Lesson Course");
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Uploaded lesson"
    );
    fireEvent.press(screen.getByLabelText("Edit video source for Uploaded lesson"));
    fireEvent.press(screen.getByLabelText("Select protected course library video"));
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockUploadCourseMedia).not.toHaveBeenCalled();
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        lessons: [
          expect.objectContaining({
            videoAssetId: "64f000000000000000000801",
            videoUrl: "/api/videos/uploads/64f000000000000000000802/object",
            mediaSource: expect.objectContaining({
              sourceType: "growpath_upload",
              providerLabel: "GrowPath upload",
              canonicalUrl: "/api/videos/uploads/64f000000000000000000802/object"
            })
          })
        ],
        authoringPlan: expect.objectContaining({
          limits: expect.objectContaining({
            selectedMedia: 1,
            videoStorage: "selected_from_library"
          })
        })
      })
    );
  });

  it("keeps direct lesson video upload available outside Facility workspaces", async () => {
    mockGetDocumentAsync.mockReset();
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/lesson-video.mp4",
          name: "lesson-video.mp4",
          mimeType: "video/mp4",
          size: 8096
        }
      ]
    });
    mockUploadCourseMedia.mockReset();
    mockUploadCourseMedia.mockResolvedValue({ url: "/uploads/lesson-video.mp4" });
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Upload Lesson Course");
    fireEvent.changeText(
      screen.getByLabelText("Course curriculum lessons"),
      "Uploaded lesson"
    );
    fireEvent.press(screen.getByLabelText("Edit video source for Uploaded lesson"));
    fireEvent.press(screen.getByLabelText("Video provider: GrowPath upload"));
    fireEvent.press(screen.getByLabelText("Choose GrowPath lesson video upload"));
    await waitFor(() =>
      expect(screen.getByText("Selected: lesson-video.mp4")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockUploadCourseMedia).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///tmp/lesson-video.mp4" }),
      { purpose: "video" }
    );
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        lessons: [
          expect.objectContaining({
            videoAssetId: "",
            videoUrl: "/uploads/lesson-video.mp4",
            mediaSource: expect.objectContaining({
              sourceType: "growpath_upload",
              canonicalUrl: "/uploads/lesson-video.mp4"
            })
          })
        ],
        authoringPlan: expect.objectContaining({
          limits: expect.objectContaining({
            selectedMedia: 1,
            videoStorage: "selected_for_upload"
          })
        })
      })
    );
  });

  it("creates a paid draft with a visible USD fee", async () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Paid Soil Course");
    fireEvent.press(screen.getByLabelText("Set a paid course fee"));
    expect(
      screen.getByRole("radio", { name: "Set a paid course fee" }).props
        .accessibilityState?.checked
    ).toBe(true);
    fireEvent.changeText(screen.getByLabelText("Course price USD"), "19.00");

    expect(screen.getByText("Learners will see: $19.00")).toBeTruthy();
    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Paid Soil Course",
        access: "paid",
        priceCents: 1900,
        price: 19,
        currency: "usd"
      })
    );
  });

  it("uploads a selected course cover image before creating the draft", async () => {
    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Media Course");
    fireEvent.press(screen.getByLabelText("Upload course cover image"));

    await waitFor(() =>
      expect(screen.getByLabelText("Course cover image preview")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() =>
      expect(mockPersistImageUri).toHaveBeenCalledWith("local-cover.jpg")
    );
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Media Course",
        coverImageUrl: "uploaded-cover.jpg"
      })
    );
  });

  it("uploads selected course documents, video media, and image sets outside Facility", async () => {
    mockGetDocumentAsync
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: "file:///tmp/course-workbook.pdf",
            name: "course-workbook.pdf",
            mimeType: "application/pdf",
            size: 1024
          }
        ]
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: "file:///tmp/course-video.mp4",
            name: "course-video.mp4",
            mimeType: "video/mp4",
            size: 4096
          }
        ]
      });
    mockUploadCourseMedia.mockReset();
    mockUploadCourseMedia
      .mockResolvedValueOnce({ url: "/uploads/course-workbook.pdf" })
      .mockResolvedValueOnce({ url: "/uploads/course-video.mp4" });
    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///tmp/course-gallery.jpg", fileName: "gallery.jpg" }]
    });

    const screen = render(<CreateCourseScreen />);

    fireEvent.changeText(screen.getByLabelText("Course title"), "Upload Workflow");
    fireEvent.press(screen.getByLabelText("Upload course documents"));
    await waitFor(() => expect(screen.getByText("1 Document Selected")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Upload course media files"));
    await waitFor(() => expect(screen.getByText("1 Media File")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Upload course image set"));
    await waitFor(() =>
      expect(screen.getByLabelText("Course media image 1")).toBeTruthy()
    );

    fireEvent.press(screen.getByText("Create Draft"));

    await waitFor(() => expect(mockCreateCourse).toHaveBeenCalled());
    expect(mockUploadCourseMedia).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ uri: "file:///tmp/course-workbook.pdf" }),
      {}
    );
    expect(mockUploadCourseMedia).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ uri: "file:///tmp/course-video.mp4" }),
      {}
    );
    expect(mockPersistImageUris).toHaveBeenCalledWith(["file:///tmp/course-gallery.jpg"]);
    expect(mockCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        documents: expect.arrayContaining([
          expect.objectContaining({
            fileName: "course-workbook.pdf",
            storageUrl: "/uploads/course-workbook.pdf",
            status: "uploaded"
          })
        ]),
        mediaAssets: expect.arrayContaining([
          expect.objectContaining({
            fileName: "course-video.mp4",
            type: "video",
            storageUrl: "/uploads/course-video.mp4"
          }),
          expect.objectContaining({
            fileName: "gallery.jpg",
            type: "image",
            storageUrl: "/uploads/course-gallery.jpg"
          })
        ]),
        uploadedImageUrls: ["/uploads/course-gallery.jpg"],
        authoringPlan: expect.objectContaining({
          limits: expect.objectContaining({
            selectedDocuments: 1,
            selectedMedia: 2,
            videoStorage: "selected_for_upload"
          })
        })
      })
    );
  });
});
