import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import FacilityLessonDocument from "@/components/learning/FacilityLessonDocument";
import * as api from "@/api/facilityDocuments";
import * as picker from "expo-document-picker";
import { ApiError } from "@/api/apiRequest";
let mockToken = "synthetic";
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    token: mockToken,
    user: { id: "test-user" },
    isHydrating: false,
    meStatus: "ready"
  })
}));
jest.mock("@/api/facilityDocuments", () => ({
  DOCUMENT_FORMATS: jest.requireActual("@/api/facilityDocuments").DOCUMENT_FORMATS,
  getDocumentUploadPolicy: jest.fn(),
  uploadFacilityDocument: jest.fn(),
  findFacilityDocument: jest.fn(),
  getFacilityDocument: jest.fn(),
  listRecentFacilityDocuments: jest.fn(),
  promoteFacilityDocument: jest.fn(),
  validateFacilityDocumentInput: jest.fn(),
  newDocumentRequestKey: () => "synthetic-attempt-01"
}));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
const ID = "111111111111111111111111";
const pending = { assetId: ID, status: "scan_pending", activationAllowed: false };
const ready = {
  assetId: ID,
  status: "active",
  activationAllowed: true,
  url: `/api/course-media/${ID}/file`
};
const mock = (fn: any) => fn as jest.Mock;
function setup() {
  const onReady = jest.fn(),
    onBusy = jest.fn();
  const props = {
    facilityId: "test-facility",
    contextId: "test-lesson",
    onReady,
    onBusy
  };
  return { ...render(<FacilityLessonDocument {...props} />), props, onReady, onBusy };
}
beforeEach(() => {
  mockToken = "synthetic";
  mock(api.getDocumentUploadPolicy).mockResolvedValue({ mimeTypes: ["application/pdf"] });
  mock(api.validateFacilityDocumentInput).mockReturnValue("application/pdf");
  mock(api.uploadFacilityDocument).mockResolvedValue(pending);
  mock(api.findFacilityDocument).mockResolvedValue(pending);
  mock(api.getFacilityDocument).mockResolvedValue(pending);
  mock(api.listRecentFacilityDocuments).mockResolvedValue([
    {
      ...pending,
      filename: "earlier.pdf",
      mimeType: "application/pdf",
      bytes: 100,
      createdAt: "2026-10-06T00:00:00.000Z"
    }
  ]);
  mock(api.promoteFacilityDocument).mockResolvedValue(ready);
  mock(picker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///synthetic.pdf", name: "synthetic.pdf", size: 100 }]
  });
});
test("disabled server keeps existing document and never offers upload", async () => {
  mock(api.getDocumentUploadPolicy).mockResolvedValue(null);
  const s = setup();
  expect(await s.findByText(/temporarily unavailable/)).toBeTruthy();
  expect(s.queryByText("Choose and scan document")).toBeNull();
  expect(s.onReady).not.toHaveBeenCalled();
});
test("private upload stays pending until explicit check confirms active, then returns protected URL", async () => {
  const s = setup();
  fireEvent.press(await s.findByText("Choose and scan document"));
  expect(await s.findByText(/Scanning is still pending/)).toBeTruthy();
  expect(s.onReady).not.toHaveBeenCalled();
  fireEvent.press(s.getByText("Check document status"));
  await waitFor(() =>
    expect(s.onReady).toHaveBeenCalledWith(
      ready.url,
      expect.objectContaining({ name: "synthetic.pdf", size: 100 })
    )
  );
  expect(api.uploadFacilityDocument).toHaveBeenCalledTimes(1);
  expect(api.findFacilityDocument).toHaveBeenCalledWith(
    "test-facility",
    "synthetic-attempt-01",
    "synthetic",
    expect.anything()
  );
});
test("lost upload response retains key and checks reservation without resending bytes", async () => {
  mock(api.uploadFacilityDocument).mockRejectedValue(new Error("lost response"));
  mock(api.findFacilityDocument).mockResolvedValue(ready);
  const s = setup();
  fireEvent.press(await s.findByText("Choose and scan document"));
  expect(await s.findByText(/verification is unavailable/)).toBeTruthy();
  fireEvent.press(s.getByText("Check document status"));
  await waitFor(() =>
    expect(s.onReady).toHaveBeenCalledWith(
      ready.url,
      expect.objectContaining({ name: "synthetic.pdf", size: 100 })
    )
  );
  expect(api.uploadFacilityDocument).toHaveBeenCalledTimes(1);
  expect(api.promoteFacilityDocument).not.toHaveBeenCalled();
});
test("held files never select a lesson resource", async () => {
  mock(api.findFacilityDocument).mockResolvedValue({ ...pending, status: "held" });
  const s = setup();
  fireEvent.press(await s.findByText("Choose and scan document"));
  fireEvent.press(await s.findByText("Check document status"));
  expect(await s.findByText(/cannot be attached/)).toBeTruthy();
  expect(api.promoteFacilityDocument).not.toHaveBeenCalled();
  expect(s.onReady).not.toHaveBeenCalled();
});
test("duplicate upload clicks are single flight and unmount ignores late completion", async () => {
  let finish: (v: any) => void = () => {};
  mock(api.uploadFacilityDocument).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const s = setup();
  const button = await s.findByText("Choose and scan document");
  fireEvent.press(button);
  fireEvent.press(button);
  await waitFor(() => expect(api.uploadFacilityDocument).toHaveBeenCalledTimes(1));
  s.unmount();
  await act(async () => finish(ready));
  expect(s.onReady).not.toHaveBeenCalled();
  expect(mock(api.uploadFacilityDocument).mock.calls[0][4].aborted).toBe(true);
});
test.each(["session", "facility", "lesson"])(
  "%s switch discards previous upload completion",
  async (kind) => {
    let finish: (v: any) => void = () => {};
    mock(api.uploadFacilityDocument).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const s = setup();
    fireEvent.press(await s.findByText("Choose and scan document"));
    await waitFor(() => expect(api.uploadFacilityDocument).toHaveBeenCalledTimes(1));
    if (kind === "session") mockToken = "changed-session";
    s.rerender(
      <FacilityLessonDocument
        {...s.props}
        facilityId={kind === "facility" ? "new-facility" : s.props.facilityId}
        contextId={kind === "lesson" ? "new-lesson" : s.props.contextId}
      />
    );
    await act(async () => finish(ready));
    expect(s.onReady).not.toHaveBeenCalled();
  }
);
test("canceling picker creates no reservation and preserves existing media", async () => {
  mock(picker.getDocumentAsync).mockResolvedValue({ canceled: true });
  const s = setup();
  fireEvent.press(await s.findByText("Choose and scan document"));
  await waitFor(() => expect(s.onBusy).toHaveBeenLastCalledWith(false));
  expect(api.uploadFacilityDocument).not.toHaveBeenCalled();
  expect(s.onReady).not.toHaveBeenCalled();
});

test("temporary lesson save lock preserves the pending request key", async () => {
  const s = setup();
  fireEvent.press(await s.findByText("Choose and scan document"));
  await s.findByText(/Scanning is still pending/);
  s.rerender(<FacilityLessonDocument {...s.props} disabled />);
  s.rerender(<FacilityLessonDocument {...s.props} disabled={false} />);
  fireEvent.press(s.getByText("Check document status"));
  await waitFor(() =>
    expect(s.onReady).toHaveBeenCalledWith(
      ready.url,
      expect.objectContaining({ name: "synthetic.pdf", size: 100 })
    )
  );
  expect(api.uploadFacilityDocument).toHaveBeenCalledTimes(1);
  expect(api.getDocumentUploadPolicy).toHaveBeenCalledTimes(1);
});

test("reopened editor explicitly recovers a previous PDF without reuploading or automatic attachment", async () => {
  const s = setup();
  fireEvent.press(await s.findByText("Recover a previous document upload"));
  const row = await s.findByText(/Recheck earlier.pdf/);
  expect(s.onReady).not.toHaveBeenCalled();
  expect(api.getFacilityDocument).not.toHaveBeenCalled();
  fireEvent.press(row);
  await s.findByText(/Scanning is still pending/);
  expect(s.onReady).not.toHaveBeenCalled();
  fireEvent.press(s.getByText("Check document status"));
  await waitFor(() =>
    expect(s.onReady).toHaveBeenCalledWith(ready.url, {
      name: "earlier.pdf",
      size: 100,
      mimeType: "application/pdf"
    })
  );
  expect(api.getFacilityDocument).toHaveBeenCalledWith(
    "test-facility",
    ID,
    "synthetic",
    expect.anything()
  );
  expect(api.findFacilityDocument).not.toHaveBeenCalled();
  expect(api.uploadFacilityDocument).not.toHaveBeenCalled();
});
test("ambiguous recovery retains asset identity and repeats only the status read", async () => {
  mock(api.getFacilityDocument)
    .mockRejectedValueOnce(new Error("lost reply"))
    .mockResolvedValueOnce(ready);
  const s = setup();
  fireEvent.press(await s.findByText("Recover a previous document upload"));
  fireEvent.press(await s.findByText(/Recheck earlier.pdf/));
  await s.findByText(/verification is unavailable/);
  fireEvent.press(s.getByText("Check document status"));
  await waitFor(() => expect(s.onReady).toHaveBeenCalledTimes(1));
  expect(api.uploadFacilityDocument).not.toHaveBeenCalled();
  expect(api.promoteFacilityDocument).not.toHaveBeenCalled();
});
test("switching account discards late recent-upload metadata", async () => {
  let finish: (v: any) => void = () => {};
  mock(api.listRecentFacilityDocuments).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const s = setup();
  fireEvent.press(await s.findByText("Recover a previous document upload"));
  await waitFor(() => expect(api.listRecentFacilityDocuments).toHaveBeenCalledTimes(1));
  mockToken = "new-session";
  s.rerender(<FacilityLessonDocument {...s.props} />);
  await act(async () =>
    finish([{ ...pending, filename: "old-private.pdf", bytes: 100, createdAt: null }])
  );
  expect(s.queryByText(/old-private/)).toBeNull();
  expect(s.onReady).not.toHaveBeenCalled();
});

const officeTypes = Object.keys(api.DOCUMENT_FORMATS).filter((mime) =>
  mime.includes("openxmlformats")
);
test.each(officeTypes)(
  "capability-gated Office choice keeps correct metadata: %s",
  async (mimeType) => {
    const name = mimeType === officeTypes[0] ? "handout.docx" : "worksheet.xlsx";
    mock(api.getDocumentUploadPolicy).mockResolvedValue({
      mimeTypes: ["application/pdf", mimeType]
    });
    mock(api.validateFacilityDocumentInput).mockReturnValue(mimeType);
    mock(picker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: `file:///${name}`, name, size: 100, mimeType }]
    });
    const s = setup();
    fireEvent.press(await s.findByText("Choose and scan document"));
    await s.findByText(/Scanning is still pending/);
    expect(picker.getDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: ["application/pdf", mimeType] })
    );
    expect(s.getByText(/Some otherwise valid Office files/)).toBeTruthy();
    expect(s.onReady).not.toHaveBeenCalled();
    fireEvent.press(s.getByText("Check document status"));
    await waitFor(() =>
      expect(s.onReady).toHaveBeenCalledWith(ready.url, { name, size: 100, mimeType })
    );
  }
);
test("PDF-only server never offers unsupported Office choices", async () => {
  const s = setup();
  fireEvent.press(await s.findByText("Choose and scan document"));
  await waitFor(() =>
    expect(picker.getDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: ["application/pdf"] })
    )
  );
  expect(s.queryByText(/Some otherwise valid Office files/)).toBeNull();
});
test("server content rejection explains restrictions and allows another choice without attaching", async () => {
  mock(api.uploadFacilityDocument).mockRejectedValueOnce(
    new ApiError("DOCUMENT_FILE_REJECTED", 422)
  );
  const s = setup();
  fireEvent.press(await s.findByText("Choose and scan document"));
  await s.findByText(/This file is invalid or uses unsupported content/);
  expect(s.getByText("Choose and scan document")).toBeTruthy();
  expect(s.queryByText("Check document status")).toBeNull();
  expect(s.onReady).not.toHaveBeenCalled();
  expect(api.findFacilityDocument).not.toHaveBeenCalled();
});
test("recent Office recovery uses saved MIME and never reuploads or shares bytes", async () => {
  mock(api.listRecentFacilityDocuments).mockResolvedValue([
    {
      ...pending,
      filename: "earlier.xlsx",
      mimeType: officeTypes[1],
      bytes: 100,
      createdAt: null
    }
  ]);
  const s = setup();
  fireEvent.press(await s.findByText("Recover a previous document upload"));
  fireEvent.press(await s.findByText(/Recheck earlier.xlsx/));
  await s.findByText(/Scanning is still pending/);
  fireEvent.press(s.getByText("Check document status"));
  await waitFor(() =>
    expect(s.onReady).toHaveBeenCalledWith(ready.url, {
      name: "earlier.xlsx",
      size: 100,
      mimeType: officeTypes[1]
    })
  );
  expect(api.uploadFacilityDocument).not.toHaveBeenCalled();
});
test("rejected local selection never allocates an upload attempt", async () => {
  mock(api.validateFacilityDocumentInput).mockImplementationOnce(() => {
    throw new Error("unsupported");
  });
  const s = setup();
  fireEvent.press(await s.findByText("Choose and scan document"));
  await s.findByText(/No upload was started/);
  expect(api.uploadFacilityDocument).not.toHaveBeenCalled();
  expect(s.queryByText("Check document status")).toBeNull();
});
