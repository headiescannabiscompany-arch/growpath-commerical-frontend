import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import PrivateTestimonialPhoto from "@/components/testimonials/PrivateTestimonialPhoto";

const mockRequest = jest.fn();
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockRequest(...args)
}));
jest.mock("@/api/testimonials", () => ({
  testimonialPhotoUrl: (path: string) => `https://api.example.test${path}`
}));
const path = "/api/testimonials/photos/photo-1?version=version-1";
const originalBlob = globalThis.Blob;
const originalReader = globalThis.FileReader;
class TestBlob {
  type: string;
  size: number;
  constructor(_parts: any[], options = { type: "image/jpeg", size: 128 }) {
    this.type = options.type;
    this.size = options.size;
  }
}
class TestReader {
  result = "data:image/jpeg;base64,anBlZw==";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL() {
    this.onload?.();
  }
}
describe("private testimonial sanitized photo preview", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Object.defineProperty(globalThis, "Blob", {
      configurable: true,
      writable: true,
      value: TestBlob
    });
    Object.defineProperty(globalThis, "FileReader", {
      configurable: true,
      writable: true,
      value: TestReader
    });
    mockRequest.mockResolvedValue(new TestBlob([]));
  });
  afterEach(() => {
    Object.defineProperty(globalThis, "Blob", {
      configurable: true,
      writable: true,
      value: originalBlob
    });
    Object.defineProperty(globalThis, "FileReader", {
      configurable: true,
      writable: true,
      value: originalReader
    });
  });
  it("uses authenticated noncached bytes and only confirms readiness after image load", async () => {
    const ready = jest.fn();
    render(
      <PrivateTestimonialPhoto
        path={path}
        contextKey="account-1:preview-1"
        onReady={ready}
      />
    );
    const photo = await screen.findByLabelText("Exact selected feedback photo preview");
    expect(mockRequest).toHaveBeenCalledWith(
      `https://api.example.test${path}`,
      expect.objectContaining({
        responseType: "blob",
        cache: "no-store",
        signal: expect.any(AbortSignal)
      })
    );
    expect(mockRequest.mock.calls[0][1].auth).not.toBe(false);
    expect(photo.props.source.uri).toBe("data:image/jpeg;base64,anBlZw==");
    expect(ready).toHaveBeenLastCalledWith(false);
    fireEvent(photo, "load");
    expect(ready).toHaveBeenLastCalledWith(true);
  });
  it.each([
    new TestBlob([], { type: "image/png", size: 128 }),
    new TestBlob([], { type: "image/jpeg", size: 0 }),
    new TestBlob([], { type: "image/jpeg", size: 6 * 1024 * 1024 }),
    { type: "image/jpeg", size: 128 }
  ])("rejects unavailable or non-sanitized bytes %#", async (blob) => {
    mockRequest.mockResolvedValue(blob);
    const ready = jest.fn();
    render(
      <PrivateTestimonialPhoto path={path} contextKey="account-1" onReady={ready} />
    );
    await screen.findByText(/exact photo preview is unavailable/i);
    expect(screen.queryByLabelText("Exact selected feedback photo preview")).toBeNull();
    expect(ready).not.toHaveBeenCalledWith(true);
  });
  it("ignores a captured old image event after the identity/preview changes", async () => {
    const oldReady = jest.fn();
    const nextReady = jest.fn();
    const instance = render(
      <PrivateTestimonialPhoto path={path} contextKey="account-1" onReady={oldReady} />
    );
    const oldLoad = (
      await screen.findByLabelText("Exact selected feedback photo preview")
    ).props.onLoad;
    instance.rerender(
      <PrivateTestimonialPhoto path={path} contextKey="account-2" onReady={nextReady} />
    );
    await screen.findByLabelText("Exact selected feedback photo preview");
    await act(async () => oldLoad());
    expect(nextReady).not.toHaveBeenCalledWith(true);
  });
  it("aborts the private bytes request and rejects late image events after unmount", async () => {
    const ready = jest.fn();
    const instance = render(
      <PrivateTestimonialPhoto path={path} contextKey="account-1" onReady={ready} />
    );
    const oldLoad = (
      await screen.findByLabelText("Exact selected feedback photo preview")
    ).props.onLoad;
    const signal = mockRequest.mock.calls[0][1].signal;
    instance.unmount();
    await act(async () => oldLoad());
    expect(signal.aborted).toBe(true);
    expect(ready).not.toHaveBeenCalledWith(true);
  });
  it("turns a decoded image failure back into an unready preview", async () => {
    const ready = jest.fn();
    render(
      <PrivateTestimonialPhoto path={path} contextKey="account-1" onReady={ready} />
    );
    const image = await screen.findByLabelText("Exact selected feedback photo preview");
    fireEvent(image, "load");
    fireEvent(image, "error");
    expect(ready).toHaveBeenLastCalledWith(false);
    expect(screen.getByText(/exact photo preview is unavailable/i)).toBeTruthy();
  });
});
