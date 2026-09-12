import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { getThemePalette } from "@/theme/appTheme";

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
  Ionicons: () => null
}));

const mockBrowseMarketplace = jest.fn();
const mockGetMyUploads = jest.fn();
const mockGetSalesData = jest.fn();
const mockUploadContent = jest.fn();
const mockSetMarketplacePublication = jest.fn();
const mockUploadCourseMedia = jest.fn();
const mockUploadImage = jest.fn();
const mockAttachPhotos = jest.fn();
const mockGetDocumentAsync = jest.fn();
const mockRequestMediaPermission = jest.fn();
const mockLaunchImageLibrary = jest.fn();

jest.mock("@/api/marketplace.js", () => ({
  browseMarketplace: (...args: any[]) => mockBrowseMarketplace(...args),
  getMyUploads: (...args: any[]) => mockGetMyUploads(...args),
  getSalesData: (...args: any[]) => mockGetSalesData(...args),
  uploadContent: (...args: any[]) => mockUploadContent(...args),
  setMarketplacePublication: (...args: any[]) => mockSetMarketplacePublication(...args)
}));

jest.mock("@/api/uploads.js", () => ({
  uploadCourseMedia: (...args: any[]) => mockUploadCourseMedia(...args),
  uploadImage: (...args: any[]) => mockUploadImage(...args)
}));

jest.mock("@/utils/growPhotoAttachment", () => ({
  maybePromptAttachPhotosToGrow: (...args: any[]) => mockAttachPhotos(...args)
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockGetDocumentAsync(...args)
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestMediaPermission(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibrary(...args)
}));

jest.setTimeout(15000);

describe("ContentMarketplaceScreen storefront offers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockBrowseMarketplace.mockResolvedValue({ data: [] });
    mockGetMyUploads.mockResolvedValue({ data: [] });
    mockGetSalesData.mockResolvedValue({
      data: { summary: {}, monthly: [], recentSales: [] }
    });
    mockUploadContent.mockResolvedValue({ _id: "upload-1" });
    mockUploadCourseMedia.mockResolvedValue({ url: "/uploads/guide.pdf" });
    mockUploadImage.mockResolvedValue({ url: "/uploads/thumb.jpg" });
    mockAttachPhotos.mockResolvedValue({ prompted: true, attached: false });
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/guide.pdf",
          name: "guide.pdf",
          mimeType: "application/pdf"
        }
      ]
    });
    mockRequestMediaPermission.mockResolvedValue({ granted: true });
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/thumb.jpg", fileName: "thumb.jpg" }]
    });
  });

  it("uploads selected offer content and thumbnail before saving a storefront offer draft", async () => {
    const ContentMarketplaceScreen =
      require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<ContentMarketplaceScreen />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Search storefront offers...")).toBeTruthy()
    );
    expect(screen.queryByPlaceholderText("Search marketplace...")).toBeNull();

    fireEvent.press(screen.getByText("My Offers"));
    await waitFor(() =>
      expect(screen.getAllByText("Create Offer").length).toBeGreaterThan(0)
    );
    fireEvent.press(screen.getAllByText("Create Offer")[0]);

    fireEvent.changeText(screen.getByPlaceholderText("Title"), "IPM Guide");
    fireEvent.changeText(screen.getByPlaceholderText("Description"), "A useful guide");
    fireEvent.changeText(screen.getByPlaceholderText("Price"), "12");
    fireEvent.press(screen.getByText("Select Offer File"));
    await waitFor(() => expect(mockGetDocumentAsync).toHaveBeenCalled());
    fireEvent.press(screen.getByText("Select Thumbnail Image"));
    await waitFor(() => expect(mockLaunchImageLibrary).toHaveBeenCalled());
    fireEvent.press(screen.getByText("Save Draft"));

    await waitFor(() => expect(mockUploadContent).toHaveBeenCalled());
    expect(mockUploadCourseMedia).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///tmp/guide.pdf" })
    );
    expect(mockUploadImage).toHaveBeenCalledWith("file:///tmp/thumb.jpg");
    expect(mockAttachPhotos).not.toHaveBeenCalled();
    expect(mockUploadContent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "IPM Guide",
        description: "A useful guide",
        price: 12,
        fileUrl: "/uploads/guide.pdf",
        thumbnailUrl: "/uploads/thumb.jpg"
      })
    );
    await waitFor(() => expect(screen.getByText(/saved as a draft/)).toBeTruthy());
    expect(mockSetMarketplacePublication).not.toHaveBeenCalled();
  });

  const draft = {
    _id: "offer-1",
    title: "Saved guide",
    description: "Downloadable guide",
    fileUrl: "/uploads/guide.pdf",
    price: 10,
    isPublished: false
  };

  it("requires confirmation, publishes the exact saved offer once, and shows persisted visibility", async () => {
    mockGetMyUploads.mockResolvedValue({ data: [draft] });
    let resolveSave: (value: any) => void = () => {};
    mockSetMarketplacePublication.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    const open = jest.fn();
    const Screen = require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<Screen initialTab="uploads" onOpenOffer={open} />);
    await waitFor(() => expect(screen.getByText("Saved guide")).toBeTruthy());
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.queryByText("View public offer")).toBeNull();
    fireEvent.press(screen.getByLabelText("Publish Saved guide"));
    expect(mockSetMarketplacePublication).not.toHaveBeenCalled();
    expect(screen.getByText(/Make this saved offer visible/)).toBeTruthy();
    fireEvent.press(screen.getByText("Confirm publish"));
    fireEvent.press(screen.getByText("Saving publication..."));
    expect(mockSetMarketplacePublication).toHaveBeenCalledTimes(1);
    expect(mockSetMarketplacePublication).toHaveBeenCalledWith("offer-1", true);
    expect(screen.getByText("Draft")).toBeTruthy();
    await act(async () => {
      resolveSave({ ...draft, isPublished: true });
    });
    expect(screen.getByText("Published")).toBeTruthy();
    expect(screen.getByText(/is now published/)).toBeTruthy();
    fireEvent.press(screen.getByText("View public offer"));
    expect(open).toHaveBeenCalledWith("offer-1");
    expect(mockUploadContent).not.toHaveBeenCalled();
  });

  it("retains publication state and review after an error, then permits explicit retry", async () => {
    mockGetMyUploads.mockResolvedValue({ data: [{ ...draft, isPublished: true }] });
    mockSetMarketplacePublication.mockRejectedValueOnce(
      new Error("Saved state unavailable")
    );
    const Screen = require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<Screen initialTab="uploads" />);
    await waitFor(() => expect(screen.getByText("Published")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Unpublish Saved guide"));
    expect(screen.getByText(/payment history are retained/)).toBeTruthy();
    fireEvent.press(screen.getByText("Confirm unpublish"));
    await waitFor(() => expect(screen.getByText("Saved state unavailable")).toBeTruthy());
    expect(screen.getByText("Published")).toBeTruthy();
    expect(screen.getByText("Confirm unpublish")).toBeTruthy();
    mockSetMarketplacePublication.mockResolvedValue({ ...draft, isPublished: false });
    fireEvent.press(screen.getByText("Confirm unpublish"));
    await waitFor(() => expect(screen.getByText("Draft")).toBeTruthy());
    expect(mockSetMarketplacePublication).toHaveBeenLastCalledWith("offer-1", false);
    expect(screen.getByText(/is now a draft/)).toBeTruthy();
  });

  it("does not claim success for a mismatched publication response", async () => {
    mockGetMyUploads.mockResolvedValue({ data: [draft] });
    mockSetMarketplacePublication.mockResolvedValue({
      ...draft,
      _id: "different",
      isPublished: true
    });
    const Screen = require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<Screen initialTab="uploads" />);
    await waitFor(() => expect(screen.getByText("Draft")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Publish Saved guide"));
    fireEvent.press(screen.getByText("Confirm publish"));
    await waitFor(() =>
      expect(screen.getByText(/publication state could not be verified/)).toBeTruthy()
    );
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.queryByText(/is now published/)).toBeNull();
  });

  it("does not publish after keeping current visibility or for incomplete saved drafts", async () => {
    mockGetMyUploads.mockResolvedValue({
      data: [draft, { ...draft, _id: "missing", title: "Incomplete", fileUrl: "" }]
    });
    const Screen = require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<Screen initialTab="uploads" />);
    await waitFor(() => expect(screen.getByText("Saved guide")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Publish Saved guide"));
    fireEvent.press(screen.getByText("Keep current visibility"));
    expect(screen.queryByText("Confirm publish")).toBeNull();
    fireEvent.press(screen.getByLabelText("Publish Incomplete"));
    expect(screen.getByText(/needs a title, description, delivery file/)).toBeTruthy();
    expect(mockSetMarketplacePublication).not.toHaveBeenCalled();
  });

  it("locks a single draft write and retains inputs after failure", async () => {
    let rejectSave: (error: Error) => void = () => {};
    mockUploadContent.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectSave = reject;
        })
    );
    const Screen = require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<Screen initialTab="uploads" />);
    await waitFor(() => expect(screen.queryByText("Refreshing offers...")).toBeNull());
    fireEvent.press(screen.getAllByText("Create Offer")[0]);
    fireEvent.changeText(screen.getByPlaceholderText("Title"), "Retained guide");
    fireEvent.changeText(screen.getByPlaceholderText("Description"), "Retained draft");
    fireEvent.changeText(screen.getByPlaceholderText("Price"), "10");
    fireEvent.changeText(screen.getByPlaceholderText("File URL"), "/uploads/guide.pdf");
    fireEvent.press(screen.getByText("Save Draft"));
    await waitFor(() => expect(mockUploadContent).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByText("Saving..."));
    expect(screen.getByPlaceholderText("Title").props.editable).toBe(false);
    fireEvent.press(screen.getByLabelText("Close offer draft"));
    expect(screen.getByText("Saving...")).toBeTruthy();
    await act(async () => {
      rejectSave(new Error("Save failed"));
    });
    expect(screen.getByText("Save failed")).toBeTruthy();
    expect(screen.getByPlaceholderText("Title").props.value).toBe("Retained guide");
    expect(mockUploadContent).toHaveBeenCalledTimes(1);
    expect(mockSetMarketplacePublication).not.toHaveBeenCalled();
  });

  it("retains saved offers when refresh fails", async () => {
    mockGetMyUploads.mockResolvedValueOnce({ data: [draft] });
    const Screen = require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<Screen initialTab="uploads" />);
    await waitFor(() => expect(screen.getByText("Saved guide")).toBeTruthy());
    mockGetMyUploads.mockRejectedValueOnce(new Error("Refresh unavailable"));
    fireEvent.press(screen.getByText("Refresh offers"));
    await waitFor(() => expect(screen.getByText("Refresh unavailable")).toBeTruthy());
    expect(screen.getByText("Saved guide")).toBeTruthy();
  });

  it("dismisses a stale publication review before refreshing saved title and price", async () => {
    mockGetMyUploads.mockResolvedValueOnce({ data: [draft] });
    const Screen = require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<Screen initialTab="uploads" />);
    await waitFor(() => expect(screen.getByText("Saved guide")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Publish Saved guide"));
    mockGetMyUploads.mockResolvedValueOnce({
      data: [{ ...draft, title: "Updated guide", price: 20 }]
    });
    fireEvent.press(screen.getByText("Refresh offers"));
    await waitFor(() => expect(screen.getByText("Updated guide")).toBeTruthy());
    expect(screen.queryByText("Confirm publish")).toBeNull();
    expect(mockSetMarketplacePublication).not.toHaveBeenCalled();
  });

  it("does not create an offer after the author route unmounts during file upload", async () => {
    let resolveMedia: (value: any) => void = () => {};
    mockUploadCourseMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMedia = resolve;
        })
    );
    const Screen = require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<Screen initialTab="uploads" />);
    await waitFor(() => expect(screen.queryByText("Refreshing offers...")).toBeNull());
    fireEvent.press(screen.getAllByText("Create Offer")[0]);
    fireEvent.changeText(screen.getByPlaceholderText("Title"), "Original owner's guide");
    fireEvent.changeText(screen.getByPlaceholderText("Description"), "Original draft");
    fireEvent.press(screen.getByText("Select Offer File"));
    await waitFor(() => expect(screen.getByText("guide.pdf")).toBeTruthy());
    fireEvent.press(screen.getByText("Save Draft"));
    await waitFor(() => expect(mockUploadCourseMedia).toHaveBeenCalledTimes(1));
    screen.unmount();
    await act(async () => {
      resolveMedia({ url: "/uploads/guide.pdf" });
    });
    expect(mockUploadContent).not.toHaveBeenCalled();
  });

  it.each(["day", "night"] as const)(
    "uses the active %s palette without a white header override",
    (mode) => {
      const {
        createMarketplaceOwnerStyles
      } = require("@/screens/commercial/ContentMarketplaceScreen");
      const palette = getThemePalette(mode, mode === "night" ? "dark" : "light");
      const styles = createMarketplaceOwnerStyles(palette);
      expect(styles.container.backgroundColor).toBe(palette.page);
      expect(styles.tabBar.backgroundColor).toBe(palette.surface);
      expect(styles.input.backgroundColor).toBe(palette.surface);
      expect(styles.input.color).toBe(palette.text);
      expect(styles.primaryBtnText.color).toBe(palette.accentText);
      expect(styles.errorText.color).toBe(palette.danger);
    }
  );
});
