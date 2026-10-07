import {
  documentStatus,
  getFacilityDocument,
  listRecentFacilityDocuments,
  findFacilityDocument,
  getDocumentCapabilities,
  promoteFacilityDocument,
  validateFacilityPdfInput,
  uploadFacilityPdf,
  getDocumentUploadPolicy,
  DOCUMENT_FORMATS,
  validateFacilityDocumentInput,
  uploadFacilityDocument
} from "../facilityDocuments";
import { apiRequest, ApiError } from "../apiRequest";
import { getToken } from "@/auth/tokenStore";
import { Platform } from "react-native";
jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn(),
  ApiError: class extends Error {
    code: string;
    constructor(value: string) {
      super(value);
      this.code = value;
    }
  }
}));
jest.mock("@/auth/tokenStore", () => ({ getToken: jest.fn() }));
jest.mock("../uriToBlob", () => ({ uriToBlob: jest.fn() }));
const mock = (fn: any) => fn as jest.Mock;
const ID = "111111111111111111111111",
  KEY = "synthetic-request",
  TOKEN = "synthetic";
const pending = {
  ok: true,
  assetId: ID,
  status: "scan_pending",
  activationAllowed: false
};
const recent = { ...pending, filename: "synthetic.pdf", bytes: 100, createdAt: null };
beforeEach(() => {
  mock(getToken).mockResolvedValue(TOKEN);
  mock(apiRequest).mockResolvedValue(pending);
});
test("recent-upload metadata is minimized and does not implicitly retry", async () => {
  mock(apiRequest).mockResolvedValue({
    ok: true,
    items: [{ ...recent, sourceKey: "private" }]
  });
  expect(await listRecentFacilityDocuments("facility", TOKEN)).toEqual([
    {
      assetId: ID,
      status: "scan_pending",
      activationAllowed: false,
      filename: "synthetic.pdf",
      mimeType: "application/pdf",
      bytes: 100,
      createdAt: null
    }
  ]);
  expect(apiRequest).toHaveBeenCalledWith(
    "/api/facility/facility/course-documents/uploads/recent",
    expect.objectContaining({ retries: 0, cache: "no-store" })
  );
});
test.each([
  { ok: false, items: [] },
  { ok: true, items: [recent, recent] },
  { ok: true, items: [{ ...recent, bytes: -1 }] },
  { ok: true, items: [{ ...recent, createdAt: "bad" }] },
  { ok: true, items: [{ ...recent, filename: "x".repeat(161) }] },
  { ok: true, items: Array(11).fill(recent) }
])("rejects malformed or unbounded recovery response %#", async (result) => {
  mock(apiRequest).mockResolvedValue(result);
  await expect(listRecentFacilityDocuments("facility", TOKEN)).rejects.toThrow();
});
test("recovered status is still an authenticated read of an exact asset", async () => {
  await getFacilityDocument("facility", ID, TOKEN);
  expect(apiRequest).toHaveBeenCalledWith(
    `/api/facility/facility/course-documents/${ID}`,
    expect.objectContaining({ headers: { Authorization: `Bearer ${TOKEN}` } })
  );
});
test("pending response cannot leak provider paths or an unverified URL", () => {
  expect(
    documentStatus({ ...pending, url: "https://private.invalid", sourceKey: "secret" })
  ).toEqual({ assetId: ID, status: "scan_pending", activationAllowed: false });
});
test.each([
  { ok: false },
  { assetId: "invalid" },
  { status: "active" },
  { activationAllowed: true },
  { status: "unknown" }
])("rejects invalid status %p", (patch) => {
  expect(() => documentStatus({ ...pending, ...patch })).toThrow();
});
test.each([
  "https://wrong.invalid/file",
  `/api/course-media/${ID}/file?token=secret`,
  "/api/course-media/222222222222222222222222/file"
])("rejects unexpected active URL %s", (url) => {
  expect(() =>
    documentStatus({ ...pending, status: "active", activationAllowed: true, url })
  ).toThrow();
});
test("only exact active protected URL is accepted", () => {
  expect(
    documentStatus({
      ...pending,
      status: "active",
      activationAllowed: true,
      url: `/api/course-media/${ID}/file`
    }).url
  ).toBe(`/api/course-media/${ID}/file`);
});
test("read recovery uses exact key and disables implicit retries/caching", async () => {
  await findFacilityDocument("facility", KEY, TOKEN);
  expect(apiRequest).toHaveBeenCalledWith(
    `/api/facility/facility/course-documents/uploads/by-key/${KEY}`,
    expect.objectContaining({
      retries: 0,
      cache: "no-store",
      headers: { Authorization: `Bearer ${TOKEN}` }
    })
  );
});
test("existing colon-delimited Facility alias is encoded, not rejected", async () => {
  await findFacilityDocument("qa-facility:public-id", KEY, TOKEN);
  expect(apiRequest).toHaveBeenCalledWith(
    `/api/facility/qa-facility%3Apublic-id/course-documents/uploads/by-key/${KEY}`,
    expect.anything()
  );
});
test("session mismatch never sends a request", async () => {
  mock(getToken).mockResolvedValue("other");
  await expect(findFacilityDocument("facility", KEY, TOKEN)).rejects.toThrow();
  expect(apiRequest).not.toHaveBeenCalled();
});

test("policy intersects server capabilities with reviewed client types", async () => {
  mock(apiRequest).mockResolvedValue({
    ok: true,
    enabled: true,
    maxBytes: 10485760,
    mimeTypes: [...Object.keys(DOCUMENT_FORMATS), "application/x-msdownload"]
  });
  expect(await getDocumentUploadPolicy("facility", TOKEN)).toEqual({
    mimeTypes: Object.keys(DOCUMENT_FORMATS)
  });
});
test.each(Object.entries(DOCUMENT_FORMATS))(
  "canonical upload metadata for %s",
  async (mimeType, ext) => {
    const append = jest.spyOn(FormData.prototype, "append").mockImplementation(() => {});
    const file = {
      uri: `file:///sample.${ext}`,
      name: `sample.${ext}`,
      size: 100,
      mimeType
    };
    expect(validateFacilityDocumentInput(file, [mimeType])).toBe(mimeType);
    await uploadFacilityDocument("facility", file, KEY, TOKEN, undefined, [mimeType]);
    expect(append).toHaveBeenCalledWith("document", {
      uri: file.uri,
      name: file.name,
      type: mimeType
    });
  }
);
test.each(Object.entries(DOCUMENT_FORMATS))(
  "web multipart carries exact selected bytes and canonical MIME: %s",
  async (mimeType, ext) => {
    jest.replaceProperty(Platform, "OS", "web");
    const append = jest.spyOn(FormData.prototype, "append").mockImplementation(() => {});
    const BrowserBlob = require("node:buffer").Blob;
    const blob = new BrowserBlob(["synthetic bytes"]);
    await uploadFacilityDocument(
      "facility",
      { uri: "blob:synthetic", name: `sample.${ext}`, file: blob },
      KEY,
      TOKEN,
      undefined,
      [mimeType]
    );
    const submitted = append.mock.calls[0][1] as Blob;
    expect(submitted.type).toBe(mimeType);
    expect(await submitted.text()).toBe("synthetic bytes");
    expect(append.mock.calls[0][2]).toBe(`sample.${ext}`);
  }
);
test.each(["wrong-type", "empty", "oversize"])(
  "web file bytes reject %s before a request",
  async (kind) => {
    jest.replaceProperty(Platform, "OS", "web");
    const BrowserBlob = require("node:buffer").Blob;
    const blob = new BrowserBlob(
      [
        kind === "oversize"
          ? new Uint8Array(10485761)
          : kind === "empty"
            ? ""
            : "synthetic"
      ],
      { type: kind === "wrong-type" ? "text/html" : "application/pdf" }
    );
    await expect(
      uploadFacilityDocument(
        "facility",
        { uri: "blob:synthetic", name: "sample.pdf", file: blob },
        KEY,
        TOKEN,
        undefined,
        ["application/pdf"]
      )
    ).rejects.toThrow();
    expect(apiRequest).not.toHaveBeenCalled();
  }
);
test.each([
  { name: "sample.doc" },
  { name: "sample.xls" },
  { name: "sample.docm" },
  { name: "sample.xlsx", mimeType: "application/pdf" },
  { name: "../sample.pdf" },
  { name: "sample.pdf", size: 10485761 },
  { name: "sample.pdf", size: 0 },
  { name: "sample.pdf", size: NaN }
])("unsupported/mismatched input never sends bytes %p", async (patch) => {
  await expect(
    uploadFacilityDocument(
      "facility",
      { uri: "file:///sample", size: 100, ...patch },
      KEY,
      TOKEN,
      undefined,
      Object.keys(DOCUMENT_FORMATS)
    )
  ).rejects.toThrow();
  expect(apiRequest).not.toHaveBeenCalled();
});
test("Office file cannot bypass a PDF-only server capability", async () => {
  await expect(
    uploadFacilityDocument(
      "facility",
      { uri: "file:///sample.docx", name: "sample.docx" },
      KEY,
      TOKEN,
      undefined,
      ["application/pdf"]
    )
  ).rejects.toThrow();
  expect(apiRequest).not.toHaveBeenCalled();
});
test.each(Object.entries(DOCUMENT_FORMATS))(
  "recovery preserves reviewed MIME %s",
  async (mimeType, ext) => {
    mock(apiRequest).mockResolvedValue({
      ok: true,
      items: [{ ...recent, filename: `sample.${ext}`, mimeType }]
    });
    expect((await listRecentFacilityDocuments("facility", TOKEN))[0].mimeType).toBe(
      mimeType
    );
  }
);
test.each([
  { filename: "sample.docx" },
  { filename: "sample.xlsx", mimeType: "application/pdf" },
  { filename: "sample.docx", mimeType: "application/x-msdownload" }
])("ambiguous recovery type fails closed %p", async (patch) => {
  mock(apiRequest).mockResolvedValue({ ok: true, items: [{ ...recent, ...patch }] });
  await expect(listRecentFacilityDocuments("facility", TOKEN)).rejects.toThrow();
});
test("session switch before response rejects the old result", async () => {
  mock(getToken).mockResolvedValueOnce(TOKEN).mockResolvedValueOnce("other");
  await expect(promoteFacilityDocument("facility", ID, TOKEN)).rejects.toThrow();
});
test("disabled scanner response stays unavailable, network failure is not ready", async () => {
  mock(apiRequest).mockRejectedValueOnce(new ApiError("DOCUMENT_UPLOADS_DISABLED", 503));
  expect(await getDocumentCapabilities("facility", TOKEN)).toBe(false);
  mock(apiRequest).mockRejectedValueOnce(new Error("network"));
  await expect(getDocumentCapabilities("facility", TOKEN)).rejects.toThrow();
});
test.each([
  { name: "bad.docx" },
  { mimeType: "text/plain" },
  { size: 0 },
  { size: 10 * 1024 * 1024 + 1 },
  { size: NaN }
])("invalid local PDF selection never uploads %p", async (patch) => {
  const file = {
    uri: "file:///synthetic.pdf",
    name: "synthetic.pdf",
    size: 100,
    ...patch
  };
  expect(() => validateFacilityPdfInput(file)).toThrow();
  await expect(uploadFacilityPdf("facility", file, KEY, TOKEN)).rejects.toThrow();
  expect(apiRequest).not.toHaveBeenCalled();
});
