import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import ProtectedAttachmentField from "@/features/businessDesk/ProtectedAttachmentField";

const mockCancel = jest.fn();
const mockComplete = jest.fn();
const mockDownload = jest.fn();
const mockGet = jest.fn();
const mockPick = jest.fn();
const mockReserve = jest.fn();
const mockUpload = jest.fn();

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockPick(...args)
}));

jest.mock("@/api/businessDeskAttachments", () => ({
  cancelBusinessDeskAttachment: (...args: any[]) => mockCancel(...args),
  completeBusinessDeskAttachment: (...args: any[]) => mockComplete(...args),
  getBusinessDeskAttachment: (...args: any[]) => mockGet(...args),
  prepareBusinessDeskAttachmentDownload: (...args: any[]) => mockDownload(...args),
  reserveBusinessDeskAttachment: (...args: any[]) => mockReserve(...args),
  uploadBusinessDeskAttachmentBytes: (...args: any[]) => mockUpload(...args)
}));

const workspace = { workspaceType: "commercial" as const };
const expenseId = "507f191e810c19729de86301";

function attachment(
  lifecycle: "uploading" | "quarantined" | "ready" | "rejected" | "deleted",
  overrides: Record<string, unknown> = {}
) {
  return {
    id: expenseId,
    purpose: "expense_receipt" as const,
    lifecycle,
    version: lifecycle === "uploading" ? 1 : 2,
    originalFilename: "receipt.jpg",
    mimeType: "image/jpeg",
    expectedBytes: 1200,
    verifiedBytes: lifecycle === "ready" ? 1200 : null,
    expiresAt: "2026-08-23T12:00:00.000Z",
    confirmedAt: null,
    ...overrides
  };
}

function quota(reservedBytes = 1200, completedBytes = 0) {
  const limitBytes = 250 * 1024 * 1024;
  return {
    limitBytes,
    reservedBytes,
    completedBytes,
    remainingBytes: limitBytes - reservedBytes,
    version: 1
  };
}

function packet(
  lifecycle: "uploading" | "quarantined" | "ready" | "rejected" | "deleted",
  overrides: Record<string, unknown> = {}
) {
  return {
    attachment: attachment(lifecycle),
    quota: quota(lifecycle === "deleted" ? 0 : 1200, lifecycle === "ready" ? 1200 : 0),
    ...overrides
  };
}

function selectedReceipt() {
  return {
    canceled: false,
    assets: [
      {
        name: "receipt.jpg",
        mimeType: "image/jpeg",
        size: 1200,
        uri: "file:///receipt.jpg"
      }
    ]
  };
}

function renderExpenseField(
  overrides: Partial<React.ComponentProps<typeof ProtectedAttachmentField>> = {}
) {
  const onChange = jest.fn();
  const onUserEdit = jest.fn();
  const onBlockingChange = jest.fn();
  const screen = render(
    <ProtectedAttachmentField
      workspace={workspace}
      purpose="expense_receipt"
      maxCount={1}
      attachmentIds={[]}
      title="Protected receipt source"
      hint="Private receipt"
      onChange={onChange}
      onUserEdit={onUserEdit}
      onBlockingChange={onBlockingChange}
      {...overrides}
    />
  );
  return { screen, onChange, onUserEdit, onBlockingChange };
}

describe("ProtectedAttachmentField", () => {
  let openUrl: jest.SpyInstance;

  beforeEach(() => {
    mockCancel.mockReset().mockResolvedValue(packet("deleted"));
    mockComplete.mockReset().mockResolvedValue(packet("ready"));
    mockDownload.mockReset().mockResolvedValue({
      attachment: attachment("ready"),
      download: {
        url: "https://downloads.example.test/signed",
        expiresInSeconds: 300,
        contentDisposition: 'attachment; filename="receipt.jpg"',
        mimeType: "image/jpeg",
        deliveryStatus: "not_observed"
      }
    });
    mockGet.mockReset().mockResolvedValue(packet("ready"));
    mockPick.mockReset().mockResolvedValue(selectedReceipt());
    mockReserve.mockReset().mockResolvedValue({
      ...packet("uploading"),
      upload: { url: "https://uploads.example.test/signed", expiresInSeconds: 900 }
    });
    mockUpload.mockReset().mockImplementation(async (_reservation, _file, options) => {
      options.onProgress(1);
      return { status: 200, etag: '"etag"' };
    });
    openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  });

  afterEach(() => {
    openUrl.mockRestore();
  });

  it("shows upload progress and binds the file only after READY", async () => {
    let releaseUpload!: () => void;
    const pendingUpload = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    mockUpload.mockImplementation(async (_reservation, _file, options) => {
      options.onProgress(0.42);
      await pendingUpload;
      options.onProgress(1);
      return { status: 200, etag: '"etag"' };
    });
    const { screen, onChange, onBlockingChange } = renderExpenseField();

    fireEvent.press(screen.getByLabelText("Add expense receipt attachment"));
    expect(await screen.findByText(/Uploading to protected storage: 42%/i)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    expect(onBlockingChange).toHaveBeenCalledWith(true);

    await act(async () => releaseUpload());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([expenseId]));
    expect(await screen.findByText(/Security checks passed/i)).toBeTruthy();
    expect(mockReserve.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        purpose: "expense_receipt",
        filename: "receipt.jpg",
        declaredMimeType: "image/jpeg",
        expectedBytes: 1200,
        idempotencyKey: expect.stringMatching(/^expense_receipt-reserve-/)
      })
    );
    expect(mockComplete.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        expectedVersion: 1,
        idempotencyKey: expect.stringMatching(/^expense_receipt-complete-/)
      })
    );
  });

  it("keeps a quarantined upload out of the record and retries the same completion safely", async () => {
    mockComplete
      .mockRejectedValueOnce(new Error("Check response interrupted"))
      .mockResolvedValueOnce(packet("quarantined"));
    const { screen, onChange } = renderExpenseField();
    fireEvent.press(screen.getByLabelText("Add expense receipt attachment"));
    expect(await screen.findByText("Check response interrupted")).toBeTruthy();
    const firstKey = mockComplete.mock.calls[0][2].idempotencyKey;
    fireEvent.press(screen.getByLabelText("Retry secure check receipt.jpg"));

    expect(await screen.findByText(/Uploaded and quarantined/i)).toBeTruthy();
    expect(mockComplete.mock.calls[1][2].idempotencyKey).toBe(firstKey);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a rejected file and requires an explicit draft removal", async () => {
    mockComplete.mockResolvedValue(packet("rejected"));
    const { screen, onChange, onBlockingChange } = renderExpenseField();
    fireEvent.press(screen.getByLabelText("Add expense receipt attachment"));

    expect(await screen.findByText(/Security checks rejected this file/i)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    expect(onBlockingChange).toHaveBeenCalledWith(true);
    fireEvent.press(screen.getByLabelText("Remove receipt.jpg from current draft"));
    await waitFor(() => expect(onBlockingChange).toHaveBeenLastCalledWith(false));
  });

  it("cancels an in-flight upload and exposes pending cleanup truthfully", async () => {
    mockUpload.mockImplementation(
      async (_reservation, _file, options) =>
        new Promise((_resolve, reject) => {
          options.onProgress(0.2);
          options.signal.addEventListener("abort", () => reject(new Error("Canceled")));
        })
    );
    mockCancel.mockResolvedValue(
      packet("deleted", {
        cleanupPending: true
      })
    );
    const { screen, onChange } = renderExpenseField();
    fireEvent.press(screen.getByLabelText("Add expense receipt attachment"));
    await screen.findByText(/Uploading to protected storage: 20%/i);
    fireEvent.press(screen.getByLabelText("Cancel receipt.jpg"));

    expect(
      await screen.findByText(/Protected-storage cleanup is still pending/i)
    ).toBeTruthy();
    expect(mockCancel).toHaveBeenCalledWith(
      workspace,
      expenseId,
      expect.objectContaining({
        expectedVersion: 1,
        idempotencyKey: expect.stringMatching(/^expense_receipt-cancel-/)
      }),
      expect.objectContaining({ signal: expect.any(Object) })
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    ["expense_receipt", 1],
    ["job_attachment", 10]
  ] as const)("enforces the %s maximum of %s", async (purpose, maxCount) => {
    const ids = Array.from(
      { length: maxCount },
      (_, index) => `507f191e810c19729d${String(864000 + index).padStart(6, "0")}`
    );
    mockGet.mockImplementation(async (_workspace, id) => ({
      attachment: attachment("ready", { id, purpose }),
      quota: quota(1200, 1200)
    }));
    const screen = render(
      <ProtectedAttachmentField
        workspace={workspace}
        purpose={purpose}
        maxCount={maxCount}
        attachmentIds={ids}
        title="Attachments"
        hint="Private"
        onChange={jest.fn()}
      />
    );
    expect(
      screen.getByLabelText(
        `Add ${purpose === "expense_receipt" ? "expense receipt" : "job"} attachment`
      ).props.accessibilityState.disabled
    ).toBe(true);
    await waitFor(() =>
      expect(screen.getAllByText(/Security checks passed/i)).toHaveLength(maxCount)
    );
  });

  it("preserves an existing saved ID when status loading fails, then allows retry", async () => {
    mockGet.mockRejectedValueOnce(new Error("Status unavailable"));
    const onChange = jest.fn();
    const { screen, onBlockingChange } = renderExpenseField({
      attachmentIds: [expenseId],
      onChange
    });
    expect(
      await screen.findByText(/saved reference remains in this draft/i)
    ).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    expect(onBlockingChange).toHaveBeenLastCalledWith(true);

    mockGet.mockResolvedValueOnce(packet("ready"));
    fireEvent.press(screen.getByLabelText("Refresh status Saved attachment"));
    expect(await screen.findByText(/Security checks passed/i)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    expect(onBlockingChange).toHaveBeenLastCalledWith(false);
  });

  it("opens only the prepared five-minute download for a READY attachment", async () => {
    const { screen } = renderExpenseField({ attachmentIds: [expenseId] });
    await screen.findByText(/Security checks passed/i);
    fireEvent.press(screen.getByLabelText("Download receipt.jpg"));

    await waitFor(() =>
      expect(openUrl).toHaveBeenCalledWith("https://downloads.example.test/signed")
    );
    expect(
      await screen.findByText(/authorized five-minute download was opened/i)
    ).toBeTruthy();
  });

  it("rejects selected files whose size or type is unknown instead of inventing it", async () => {
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          name: "receipt.jpg",
          mimeType: null,
          size: null,
          uri: "file:///receipt.jpg"
        }
      ]
    });
    const { screen } = renderExpenseField();
    fireEvent.press(screen.getByLabelText("Add expense receipt attachment"));

    expect(await screen.findByText(/known file type/i)).toBeTruthy();
    expect(mockReserve).not.toHaveBeenCalled();
  });
});
