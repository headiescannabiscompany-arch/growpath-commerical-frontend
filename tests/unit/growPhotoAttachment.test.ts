import { Alert } from "react-native";

import { maybePromptAttachPhotosToGrow } from "@/utils/growPhotoAttachment";

describe("grow photo attachment prompt", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("asks to attach uploaded photos to a selected grow", async () => {
    const appendPhotos = jest.fn().mockResolvedValue({});
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      buttons?.[0]?.onPress?.();
    });

    await expect(
      maybePromptAttachPhotosToGrow(["/uploads/trichome.jpg"], {
        listGrows: async () => [{ id: "grow-1", name: "Tent A" }],
        appendPhotos
      })
    ).resolves.toEqual({ prompted: true, attached: true, growId: "grow-1" });

    expect(appendPhotos).toHaveBeenCalledWith("grow-1", ["/uploads/trichome.jpg"]);
  });

  it("skips prompting when upload already has grow context", async () => {
    const appendPhotos = jest.fn();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    await expect(
      maybePromptAttachPhotosToGrow(["/uploads/trichome.jpg"], {
        skip: true,
        appendPhotos
      })
    ).resolves.toEqual({ prompted: false, attached: false });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(appendPhotos).not.toHaveBeenCalled();
  });

  it("does not prompt for local-only image uris", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    await expect(
      maybePromptAttachPhotosToGrow(["file:///tmp/photo.jpg"], {
        listGrows: async () => [{ id: "grow-1", name: "Tent A" }]
      })
    ).resolves.toEqual({ prompted: false, attached: false });

    expect(alertSpy).not.toHaveBeenCalled();
  });
});
