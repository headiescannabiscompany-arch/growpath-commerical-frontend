import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockBrowseMarketplace = jest.fn();
const mockGetMyUploads = jest.fn();
const mockGetSalesData = jest.fn();
const mockUploadContent = jest.fn();
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
  uploadContent: (...args: any[]) => mockUploadContent(...args)
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

describe("ContentMarketplaceScreen uploads", () => {
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

  it("uploads selected content and thumbnail before saving a marketplace draft", async () => {
    const ContentMarketplaceScreen =
      require("@/screens/commercial/ContentMarketplaceScreen").default;
    const screen = render(<ContentMarketplaceScreen />);

    fireEvent.press(screen.getByText("My Uploads"));
    await waitFor(() => expect(screen.getByText("Upload Content")).toBeTruthy());
    fireEvent.press(screen.getByText("Upload Content"));

    fireEvent.changeText(screen.getByPlaceholderText("Title"), "IPM Guide");
    fireEvent.changeText(screen.getByPlaceholderText("Description"), "A useful guide");
    fireEvent.changeText(screen.getByPlaceholderText("Price"), "12");
    fireEvent.press(screen.getByText("Select Content File"));
    await waitFor(() => expect(mockGetDocumentAsync).toHaveBeenCalled());
    fireEvent.press(screen.getByText("Select Thumbnail Image"));
    await waitFor(() => expect(mockLaunchImageLibrary).toHaveBeenCalled());
    fireEvent.press(screen.getByText("Save Draft"));

    await waitFor(() => expect(mockUploadContent).toHaveBeenCalled());
    expect(mockUploadCourseMedia).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///tmp/guide.pdf" })
    );
    expect(mockUploadImage).toHaveBeenCalledWith("file:///tmp/thumb.jpg");
    expect(mockAttachPhotos).toHaveBeenCalledWith(["/uploads/thumb.jpg"]);
    expect(mockUploadContent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "IPM Guide",
        description: "A useful guide",
        price: 12,
        fileUrl: "/uploads/guide.pdf",
        thumbnailUrl: "/uploads/thumb.jpg"
      })
    );
  });
});
