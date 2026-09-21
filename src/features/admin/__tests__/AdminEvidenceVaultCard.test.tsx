import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import AdminEvidenceVaultCard from "../AdminEvidenceVaultCard";
import {
  addRestrictedCaseNote,
  getEvidenceVaultCapabilities,
  listAdminEvidenceRequests,
  listRemovedAccounts,
  listRestrictedCases,
  listRestrictedCaseRecords,
  recordRestrictedExternalReport,
  quarantineAccount,
  restoreQuarantinedAccount,
  reviewAccountRemoval,
  reviewAccountRestore
} from "@/api/adminEvidenceVault";
import { clearAdminStepUp } from "@/api/adminPasskeys";

jest.mock("@/api/adminEvidenceVault", () => ({
  addRestrictedCaseNote: jest.fn(),
  getEvidenceVaultCapabilities: jest.fn(),
  listAdminEvidenceRequests: jest.fn(),
  listRemovedAccounts: jest.fn(),
  listRestrictedCaseRecords: jest.fn(),
  listRestrictedCases: jest.fn(),
  quarantineAccount: jest.fn(),
  recordRestrictedExternalReport: jest.fn(),
  restoreQuarantinedAccount: jest.fn(),
  reviewAccountRemoval: jest.fn(),
  reviewAccountRestore: jest.fn()
}));

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      surface: "#fff",
      surfaceMuted: "#eef7ef",
      border: "#ccd9cc",
      borderSoft: "#dde7dd",
      text: "#122012",
      textMuted: "#5f6f5f",
      link: "#166534",
      accent: "#166534",
      success: "#166534",
      warning: "#b45309",
      danger: "#dc2626",
      dangerText: "#fff",
      shadow: "#000"
    }
  })
}));

const TARGET_ID = "64b000000000000000000005";
const ARCHIVE_ID = "64b000000000000000000006";
const SECOND_ARCHIVE_ID = "64b000000000000000000008";
const FIRST_USER = { id: TARGET_ID, email: "member@example.com" };
const SECOND_USER = { id: "64b000000000000000000007", email: "second@example.com" };
const USERS = [FIRST_USER, SECOND_USER];
const PASSED_FEEDBACK =
  "Safety review passed. No billing action occurred. Type the exact phrase to quarantine.";
const BLOCKED_FEEDBACK =
  "Removal is blocked. No account, Stripe, gift, payout, or invoice state changed.";
const RESTORE_FEEDBACK =
  "Restore review passed. Type the exact phrase to restore the account.";
const mockCapabilities = getEvidenceVaultCapabilities as jest.MockedFunction<
  typeof getEvidenceVaultCapabilities
>;
const mockEvidenceRequests = listAdminEvidenceRequests as jest.MockedFunction<
  typeof listAdminEvidenceRequests
>;
const mockRemoved = listRemovedAccounts as jest.MockedFunction<
  typeof listRemovedAccounts
>;
const mockCases = listRestrictedCases as jest.MockedFunction<typeof listRestrictedCases>;
const mockReview = reviewAccountRemoval as jest.MockedFunction<
  typeof reviewAccountRemoval
>;
const mockQuarantine = quarantineAccount as jest.MockedFunction<typeof quarantineAccount>;
const mockRestoreReview = reviewAccountRestore as jest.MockedFunction<
  typeof reviewAccountRestore
>;
const mockRestore = restoreQuarantinedAccount as jest.MockedFunction<
  typeof restoreQuarantinedAccount
>;

function capabilityReceipt() {
  return {
    configured: true,
    capabilities: {
      accountRemovalOwner: true,
      evidenceAccess: false,
      evidenceApproval: false,
      severeHarmReview: false
    }
  };
}

function removalReview(allowed = true) {
  return {
    allowed,
    target: { id: TARGET_ID, email: "member@example.com" },
    blockers: allowed ? [] : ["stripe_reconciliation_unverified"],
    advisories: { facilityOwnership: 0, courseOwnership: 1, storefrontOwnership: 0 },
    stripe: {
      verified: allowed,
      customerCount: 0,
      subscriptionCount: 0,
      unsettledInvoiceCount: 0
    },
    billingEffect: {
      automaticCancellationPerformed: false as const,
      automaticRefundPerformed: false as const,
      requiredAction: allowed ? "none" : "Resolve billing separately."
    },
    retentionDays: 90,
    nextConfirmation: `QUARANTINE ${TARGET_ID} member@example.com`,
    ...(allowed
      ? { reviewToken: "single-use-review-token", reviewExpiresAt: "2030-01-01" }
      : {})
  };
}

function fillRemovalInputs(screen: ReturnType<typeof render>, email = FIRST_USER.email) {
  fireEvent.changeText(screen.getByLabelText("Type the reviewed account email"), email);
  fireEvent.changeText(
    screen.getByLabelText("Account removal reason"),
    "Owner reviewed safety acceptance"
  );
  fireEvent.changeText(
    screen.getByLabelText("Account removal case reference"),
    "ADMIN-204"
  );
}

async function requestedRemovalScreen() {
  const screen = render(
    <AdminEvidenceVaultCard users={USERS} requestedUser={FIRST_USER} />
  );
  await screen.findByLabelText("Account selected for removal review");
  fillRemovalInputs(screen);
  return screen;
}

function changeRemovalContext(
  screen: ReturnType<typeof render>,
  change: "row" | "picker" | "input"
) {
  if (change === "row") {
    screen.rerender(<AdminEvidenceVaultCard users={USERS} requestedUser={SECOND_USER} />);
  } else if (change === "picker") {
    fireEvent(
      screen.getByLabelText("Account selected for removal review"),
      "valueChange",
      SECOND_USER.id
    );
  } else {
    fireEvent.changeText(
      screen.getByLabelText("Account removal reason"),
      "Updated owner safety acceptance"
    );
  }
}

function restoreReviewFor(archiveId = ARCHIVE_ID, target = FIRST_USER) {
  return {
    target,
    archiveId,
    nextConfirmation: `RESTORE ${archiveId} ${target.id}`,
    reviewToken: `restore-review-${archiveId}`,
    reviewExpiresAt: "2030-01-01T00:05:00.000Z"
  };
}

async function twoArchiveRestoreScreen() {
  mockRemoved.mockResolvedValue({
    accounts: [ARCHIVE_ID, SECOND_ARCHIVE_ID].map((archiveId) => ({
      archiveId,
      anonymousAccountLabel: `removed-account-${archiveId}`,
      status: "ready",
      removalStatus: "completed",
      quarantineStatus: "quarantined",
      archivedAt: "2030-01-01T00:00:00.000Z",
      quarantinedAt: "2030-01-01T00:00:00.000Z",
      restoredAt: null,
      purgeAfter: "2030-04-01T00:00:00.000Z",
      legalHold: false,
      legalHoldAuthority: "none",
      legalHoldExpiresAt: null,
      purgedAt: null,
      operationalIssue: false
    })),
    nextCursor: null
  });
  const screen = render(<AdminEvidenceVaultCard users={USERS} />);
  fireEvent.press(screen.getByLabelText("Open evidence vault controls"));
  await screen.findByText(`removed-account-${SECOND_ARCHIVE_ID}`);
  fireEvent.press(screen.getAllByText("Start reviewed restore")[0]);
  return screen;
}

async function readyAccountAction(
  action: "quarantine" | "restore",
  onAccountsChanged: () => void | Promise<void>
) {
  mockReview.mockResolvedValue(removalReview());
  mockRestoreReview.mockResolvedValue(restoreReviewFor());
  mockQuarantine.mockResolvedValue({
    archiveId: ARCHIVE_ID,
    targetUserId: TARGET_ID,
    quarantineStatus: "quarantined",
    quarantinedAt: "2030-01-01T00:00:00.000Z",
    purgeAfter: "2030-04-01T00:00:00.000Z",
    reversible: true
  });
  mockRestore.mockResolvedValue({
    archiveId: ARCHIVE_ID,
    targetUserId: TARGET_ID,
    quarantineStatus: "restored"
  });
  const screen = render(
    <AdminEvidenceVaultCard
      users={USERS}
      requestedUser={FIRST_USER}
      onAccountsChanged={onAccountsChanged}
    />
  );
  await screen.findByText(`removed-account-${ARCHIVE_ID}`);
  if (action === "quarantine") {
    fillRemovalInputs(screen);
    fireEvent.press(screen.getByText("Review account removal"));
    await screen.findByText(PASSED_FEEDBACK);
    fireEvent.changeText(
      screen.getByLabelText("Exact account quarantine confirmation"),
      removalReview().nextConfirmation
    );
  } else {
    fireEvent.press(screen.getByText("Start reviewed restore"));
    fireEvent.press(screen.getByLabelText("Review selected account restore"));
    await screen.findByText(RESTORE_FEEDBACK);
    fireEvent.changeText(
      screen.getByLabelText("Exact account restore confirmation"),
      restoreReviewFor().nextConfirmation
    );
  }
  return screen;
}

describe("AdminEvidenceVaultCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilities.mockResolvedValue(capabilityReceipt());
    mockEvidenceRequests.mockResolvedValue([]);
    mockRemoved.mockResolvedValue({
      accounts: [
        {
          archiveId: ARCHIVE_ID,
          anonymousAccountLabel: `removed-account-${ARCHIVE_ID}`,
          status: "ready",
          removalStatus: "completed",
          quarantineStatus: "quarantined",
          archivedAt: "2030-01-01T00:00:00.000Z",
          quarantinedAt: "2030-01-01T00:00:00.000Z",
          restoredAt: null,
          purgeAfter: "2030-04-01T00:00:00.000Z",
          legalHold: false,
          legalHoldAuthority: "none",
          legalHoldExpiresAt: null,
          purgedAt: null,
          operationalIssue: false
        }
      ],
      nextCursor: null
    });
    mockCases.mockResolvedValue([]);
  });

  const CASE_A = "64b000000000000000000021";
  const CASE_B = "64b000000000000000000022";
  const mockRecords = listRestrictedCaseRecords as jest.MockedFunction<
    typeof listRestrictedCaseRecords
  >;
  const mockNote = addRestrictedCaseNote as jest.MockedFunction<
    typeof addRestrictedCaseNote
  >;
  const mockReport = recordRestrictedExternalReport as jest.MockedFunction<
    typeof recordRestrictedExternalReport
  >;
  const savedNote = {
    id: "note-a",
    caseId: CASE_A,
    actorUserId: TARGET_ID,
    agencyCategory: "",
    submittedAt: null,
    recordType: "case_note" as const,
    createdAt: "2026-09-20T12:00:00Z",
    data: { note: "Synthetic private case A note" }
  };

  async function caseScreen() {
    mockCapabilities.mockResolvedValue({
      ...capabilityReceipt(),
      capabilities: {
        accountRemovalOwner: false,
        evidenceAccess: false,
        evidenceApproval: false,
        severeHarmReview: true
      }
    });
    mockCases.mockResolvedValue(
      [CASE_A, CASE_B].map((id) => ({
        id,
        restricted: true,
        status: "open",
        severity: "low",
        assigned: false,
        createdAt: "2026-09-20T12:00:00Z",
        updatedAt: "2026-09-20T12:00:00Z",
        resolvedAt: null
      }))
    );
    mockRecords.mockResolvedValue([]);
    const screen = render(<AdminEvidenceVaultCard users={[]} />);
    fireEvent.press(screen.getByLabelText("Open evidence vault controls"));
    await screen.findAllByText("Open encrypted case record");
    fireEvent.press(screen.getAllByText("Open encrypted case record")[0]);
    await waitFor(() => expect(mockRecords).toHaveBeenCalledWith(CASE_A));
    await act(async () => {});
    return screen;
  }

  test("records only the selected case with exact note confirmation", async () => {
    const screen = await caseScreen();
    mockNote.mockResolvedValue({ id: "note-a" });
    fireEvent.changeText(
      screen.getByLabelText("Restricted case note"),
      "  Synthetic private note  "
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact restricted case note confirmation"),
      `ADD RESTRICTED NOTE ${CASE_B}`
    );
    fireEvent.press(screen.getByText("Encrypt and add case note"));
    expect(mockNote).not.toHaveBeenCalled();
    fireEvent.changeText(
      screen.getByLabelText("Exact restricted case note confirmation"),
      `ADD RESTRICTED NOTE ${CASE_A}`
    );
    fireEvent.press(screen.getByText("Encrypt and add case note"));
    await screen.findByText(
      "Encrypted restricted case note recorded. Nothing was transmitted."
    );
    expect(mockNote).toHaveBeenCalledTimes(1);
    expect(mockNote).toHaveBeenCalledWith(CASE_A, {
      note: "Synthetic private note",
      confirmation: `ADD RESTRICTED NOTE ${CASE_A}`
    });
    expect(mockReport).not.toHaveBeenCalled();
  });

  test("clears private records and drafts before loading another case, including failed loads", async () => {
    const screen = await caseScreen();
    mockRecords.mockResolvedValueOnce([savedNote]);
    fireEvent.press(screen.getAllByText("Open encrypted case record")[0]);
    await screen.findByText(/Synthetic private case A note/);
    fireEvent.changeText(
      screen.getByLabelText("Restricted case note"),
      "Case A unsaved draft"
    );
    fireEvent.press(screen.getByText("Record an outside report already submitted"));
    fireEvent.changeText(
      screen.getByLabelText("Outside agency reference"),
      "Case A agency"
    );
    mockRecords.mockRejectedValueOnce(new Error("Synthetic case B load denied"));
    fireEvent.press(screen.getAllByText("Open encrypted case record")[1]);
    await screen.findByText("Synthetic case B load denied");
    expect(screen.queryByText(/Synthetic private case A note/)).toBeNull();
    expect(screen.getByLabelText("Restricted case note")).toHaveProp("value", "");
    expect(screen.queryByLabelText("Outside agency reference")).toBeNull();
  });

  test("a successful note with failed list refresh is not presented as a failed save", async () => {
    const screen = await caseScreen();
    mockNote.mockResolvedValue({ id: "note-a" });
    mockRecords.mockRejectedValueOnce(new Error("Synthetic refresh unavailable"));
    fireEvent.changeText(
      screen.getByLabelText("Restricted case note"),
      "Synthetic private note"
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact restricted case note confirmation"),
      `ADD RESTRICTED NOTE ${CASE_A}`
    );
    fireEvent.press(screen.getByText("Encrypt and add case note"));
    await screen.findByText(/recorded.*refresh failed/i);
    expect(mockNote).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Restricted case note")).toHaveProp("value", "");
  });

  test("does not restore case data after security is locked while a load is pending", async () => {
    const screen = await caseScreen();
    let finish!: (records: (typeof savedNote)[]) => void;
    mockRecords.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    fireEvent.press(screen.getAllByText("Open encrypted case record")[0]);
    act(() => clearAdminStepUp());
    await act(async () => finish([savedNote]));
    expect(screen.queryByLabelText("Restricted case note")).toBeNull();
    expect(screen.queryByText(/Synthetic private case A note/)).toBeNull();
    mockRecords.mockResolvedValueOnce([]);
    fireEvent.press(screen.getAllByText("Open encrypted case record")[1]);
    await act(async () => {});
    expect(screen.queryByText(/Synthetic private case A note/)).toBeNull();
  });

  test("does not load or expose restricted case controls without the reviewer capability", async () => {
    const screen = render(<AdminEvidenceVaultCard users={[]} />);
    fireEvent.press(screen.getByLabelText("Open evidence vault controls"));
    await waitFor(() => expect(mockCapabilities).toHaveBeenCalled());
    expect(mockCases).not.toHaveBeenCalled();
    expect(mockRecords).not.toHaveBeenCalled();
    expect(screen.queryByText("Restricted severe-harm cases")).toBeNull();
  });

  test.each([false, true])(
    "records a previously submitted report once, with refresh failure=%s",
    async (refreshFails) => {
      const screen = await caseScreen();
      mockReport.mockResolvedValue({
        id: "report-a",
        externalTransmissionPerformed: false
      });
      fireEvent.press(screen.getByText("Record an outside report already submitted"));
      fireEvent.changeText(
        screen.getByLabelText("Outside agency reference"),
        " Synthetic agency "
      );
      fireEvent.changeText(
        screen.getByLabelText("Outside report reference"),
        " Synthetic reference "
      );
      fireEvent.changeText(
        screen.getByLabelText("Outside report submitted at"),
        "2026-09-20T12:00:00Z"
      );
      fireEvent.changeText(
        screen.getByLabelText("Outside report summary"),
        " Synthetic report summary "
      );
      fireEvent.changeText(
        screen.getByLabelText("Exact outside report confirmation"),
        `RECORD EXTERNAL REPORT ${CASE_B}`
      );
      fireEvent.press(screen.getByText("Encrypt submitted-report record"));
      expect(mockReport).not.toHaveBeenCalled();
      fireEvent.changeText(
        screen.getByLabelText("Exact outside report confirmation"),
        `RECORD EXTERNAL REPORT ${CASE_A}`
      );
      if (refreshFails)
        mockRecords.mockRejectedValueOnce(new Error("Synthetic refresh failed"));
      fireEvent.press(screen.getByText("Encrypt submitted-report record"));
      await screen.findByText(
        refreshFails
          ? /recorded.*refresh failed/i
          : "The external report was recorded and encrypted. GrowPath did not send or disclose anything."
      );
      expect(mockReport).toHaveBeenCalledTimes(1);
      expect(mockReport).toHaveBeenCalledWith(CASE_A, {
        agencyCategory: "local",
        agencyReference: "Synthetic agency",
        reportReference: "Synthetic reference",
        submittedAt: "2026-09-20T12:00:00Z",
        summary: "Synthetic report summary",
        confirmation: `RECORD EXTERNAL REPORT ${CASE_A}`
      });
      expect(mockNote).not.toHaveBeenCalled();
      expect(screen.queryByLabelText("Outside report summary")).toBeNull();
    }
  );

  test("ignores a late note receipt after security lock and does not fetch its records", async () => {
    const screen = await caseScreen();
    let finish!: (receipt: { id: string }) => void;
    mockNote.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    fireEvent.changeText(
      screen.getByLabelText("Restricted case note"),
      "Synthetic private note"
    );
    fireEvent.changeText(
      screen.getByLabelText("Exact restricted case note confirmation"),
      `ADD RESTRICTED NOTE ${CASE_A}`
    );
    fireEvent.press(screen.getByText("Encrypt and add case note"));
    act(() => clearAdminStepUp());
    await act(async () => finish({ id: "note-a" }));
    expect(mockRecords).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Restricted case note")).toBeNull();
    expect(screen.queryByText(/Encrypted restricted case note recorded/)).toBeNull();
  });

  test("stays collapsed and makes no restricted request until explicitly opened", () => {
    const screen = render(
      <AdminEvidenceVaultCard users={[{ id: TARGET_ID, email: "member@example.com" }]} />
    );

    expect(screen.getByText("Removed accounts / Evidence vault")).toBeTruthy();
    expect(screen.queryByLabelText("Account selected for removal review")).toBeNull();
    expect(mockCapabilities).not.toHaveBeenCalled();
    expect(mockEvidenceRequests).not.toHaveBeenCalled();
    expect(mockRemoved).not.toHaveBeenCalled();
  });

  test("loads the legal queue only after opening and shows it only to an approver", async () => {
    mockCapabilities.mockResolvedValue({
      configured: true,
      capabilities: {
        accountRemovalOwner: false,
        evidenceAccess: true,
        evidenceApproval: true,
        severeHarmReview: false
      }
    });
    mockEvidenceRequests.mockResolvedValue([
      {
        _id: "64b000000000000000000011",
        requestType: "court_order",
        status: "legal_review",
        preservationHold: true,
        preservationExpiresAt: "2099-01-01T00:00:00.000Z",
        targetBound: true,
        targetUserId: TARGET_ID,
        detailsAvailable: true,
        restricted: true,
        requesterName: "Reviewed requester",
        scope: "Account identity records only."
      }
    ]);
    const screen = render(<AdminEvidenceVaultCard users={[]} />);

    expect(mockEvidenceRequests).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Open evidence vault controls"));

    expect(await screen.findByText("Independent legal review")).toBeTruthy();
    expect(mockEvidenceRequests).toHaveBeenCalledTimes(1);
  });

  test("opens on a requested account but still requires the exact email and reviewed inputs", async () => {
    const requestedUser = {
      id: TARGET_ID,
      email: "member@example.com",
      label: "Member"
    };
    const screen = render(
      <AdminEvidenceVaultCard users={[requestedUser]} requestedUser={requestedUser} />
    );

    expect(
      await screen.findByText(
        "Selected account: member@example.com. Type the exact email and complete both review steps below."
      )
    ).toBeTruthy();
    await waitFor(() => expect(mockEvidenceRequests).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Type the reviewed account email")).toHaveProp(
      "value",
      ""
    );
    expect(
      screen.getByRole("button", { name: "Review account removal" }).props
        .accessibilityState
    ).toEqual(expect.objectContaining({ disabled: true }));
    expect(mockReview).not.toHaveBeenCalled();
    expect(mockQuarantine).not.toHaveBeenCalled();
  });

  test("requires review token and exact confirmation before quarantine", async () => {
    mockReview.mockResolvedValue(removalReview(true));
    mockQuarantine.mockResolvedValue({
      archiveId: ARCHIVE_ID,
      targetUserId: TARGET_ID,
      quarantineStatus: "quarantined",
      quarantinedAt: "2030-01-01T00:00:00.000Z",
      purgeAfter: "2030-04-01T00:00:00.000Z",
      reversible: true
    });
    const screen = render(
      <AdminEvidenceVaultCard
        users={[{ id: TARGET_ID, email: "member@example.com", label: "Member" }]}
      />
    );

    fireEvent.press(screen.getByLabelText("Open evidence vault controls"));
    await screen.findByLabelText("Account selected for removal review");
    fireEvent(
      screen.getByLabelText("Account selected for removal review"),
      "valueChange",
      TARGET_ID
    );
    fireEvent.changeText(
      screen.getByLabelText("Type the reviewed account email"),
      "member@example.com"
    );
    fireEvent.changeText(
      screen.getByLabelText("Account removal reason"),
      "Owner reviewed cleanup"
    );
    fireEvent.changeText(
      screen.getByLabelText("Account removal case reference"),
      "SUP-204"
    );
    fireEvent.press(screen.getByText("Review account removal"));

    await waitFor(() => expect(mockReview).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Review passed")).toBeTruthy();
    expect(screen.getByText(/Billing action: none/)).toBeTruthy();
    expect(mockQuarantine).not.toHaveBeenCalled();

    fireEvent.changeText(
      screen.getByLabelText("Exact account quarantine confirmation"),
      `QUARANTINE ${TARGET_ID} member@example.com`
    );
    fireEvent.press(screen.getByText("Quarantine reviewed account"));

    await waitFor(() =>
      expect(mockQuarantine).toHaveBeenCalledWith(
        TARGET_ID,
        expect.objectContaining({
          expectedEmail: "member@example.com",
          reviewToken: "single-use-review-token",
          confirmation: `QUARANTINE ${TARGET_ID} member@example.com`
        })
      )
    );
    expect(
      await screen.findByText(
        `Account quarantined in private archive ${ARCHIVE_ID}. It remains reversible until retention permits verified finalization.`
      )
    ).toBeTruthy();
    expect(screen.queryByText(/^Selected account:/)).toBeNull();
  });

  test("shows fail-closed Stripe blockers and never exposes a quarantine action", async () => {
    mockReview.mockResolvedValue(removalReview(false));
    const screen = render(
      <AdminEvidenceVaultCard users={[{ id: TARGET_ID, email: "member@example.com" }]} />
    );

    fireEvent.press(screen.getByLabelText("Open evidence vault controls"));
    await screen.findByLabelText("Account selected for removal review");
    fireEvent(
      screen.getByLabelText("Account selected for removal review"),
      "valueChange",
      TARGET_ID
    );
    fireEvent.changeText(
      screen.getByLabelText("Type the reviewed account email"),
      "member@example.com"
    );
    fireEvent.changeText(
      screen.getByLabelText("Account removal reason"),
      "Owner reviewed cleanup"
    );
    fireEvent.changeText(
      screen.getByLabelText("Account removal case reference"),
      "SUP-204"
    );
    fireEvent.press(screen.getByText("Review account removal"));

    expect(await screen.findByText("Removal blocked")).toBeTruthy();
    expect(screen.getByText(/Stripe could not be verified/)).toBeTruthy();
    expect(screen.queryByText("Quarantine reviewed account")).toBeNull();
    expect(mockQuarantine).not.toHaveBeenCalled();
  });

  test.each([
    ["row", true],
    ["row", false],
    ["picker", true],
    ["picker", false]
  ] as const)(
    "clears feedback on %s selection after an allowed=%s review",
    async (change, allowed) => {
      mockReview.mockResolvedValue(removalReview(allowed));
      const screen = await requestedRemovalScreen();
      fireEvent.press(screen.getByText("Review account removal"));
      await screen.findByText(allowed ? PASSED_FEEDBACK : BLOCKED_FEEDBACK);
      if (allowed) {
        fireEvent.changeText(
          screen.getByLabelText("Exact account quarantine confirmation"),
          removalReview().nextConfirmation
        );
      }

      changeRemovalContext(screen, change);

      expect(
        screen.getByText(
          `Selected account: ${SECOND_USER.email}. Type the exact email and complete both review steps below.`
        )
      ).toBeTruthy();
      expect(screen.getByLabelText("Type the reviewed account email")).toHaveProp(
        "value",
        ""
      );
      expect(screen.queryByText(PASSED_FEEDBACK)).toBeNull();
      expect(screen.queryByText(BLOCKED_FEEDBACK)).toBeNull();
      expect(screen.queryByLabelText("Account removal safety review")).toBeNull();
      expect(screen.queryByLabelText("Exact account quarantine confirmation")).toBeNull();
      expect(screen.queryByText("Quarantine reviewed account")).toBeNull();
      expect(screen.getByRole("button", { name: "Review account removal" })).toHaveProp(
        "accessibilityState",
        expect.objectContaining({ disabled: true })
      );
      expect(mockReview).toHaveBeenCalledTimes(1);
      expect(mockQuarantine).not.toHaveBeenCalled();
    }
  );

  test.each([
    ["Type the reviewed account email", "changed@example.com", "changeText"],
    ["Account removal category", "other", "valueChange"],
    ["Account removal reason", "Updated owner safety acceptance", "changeText"],
    ["Account removal case reference", "ADMIN-205", "changeText"]
  ] as const)(
    "clears the reviewed result and feedback when %s changes",
    async (label, value, event) => {
      mockReview.mockResolvedValue(removalReview());
      const screen = await requestedRemovalScreen();
      fireEvent.press(screen.getByText("Review account removal"));
      await screen.findByText(PASSED_FEEDBACK);
      fireEvent.changeText(
        screen.getByLabelText("Exact account quarantine confirmation"),
        removalReview().nextConfirmation
      );

      fireEvent(screen.getByLabelText(label), event, value);

      expect(screen.queryByText(PASSED_FEEDBACK)).toBeNull();
      expect(screen.queryByLabelText("Account removal safety review")).toBeNull();
      expect(screen.queryByLabelText("Exact account quarantine confirmation")).toBeNull();
      expect(screen.queryByText("Quarantine reviewed account")).toBeNull();
      expect(mockReview).toHaveBeenCalledTimes(1);
      expect(mockQuarantine).not.toHaveBeenCalled();
    }
  );

  test.each([
    ["row", "success"],
    ["row", "error"],
    ["picker", "success"],
    ["picker", "error"],
    ["input", "success"],
    ["input", "error"]
  ] as const)(
    "ignores a late review after a %s change (%s) and permits a current review",
    async (change, result) => {
      let resolveReview!: (value: ReturnType<typeof removalReview>) => void;
      let rejectReview!: (error: Error) => void;
      mockReview.mockReturnValueOnce(
        new Promise((resolve, reject) => {
          resolveReview = resolve;
          rejectReview = reject;
        })
      );
      const screen = await requestedRemovalScreen();
      fireEvent.press(screen.getByText("Review account removal"));
      expect(mockReview).toHaveBeenCalledTimes(1);

      changeRemovalContext(screen, change);
      await act(async () => {
        if (result === "success") resolveReview(removalReview());
        else rejectReview(new Error("Obsolete review failure"));
      });

      expect(screen.queryByText(PASSED_FEEDBACK)).toBeNull();
      expect(screen.queryByText("Obsolete review failure")).toBeNull();
      expect(screen.queryByLabelText("Account removal safety review")).toBeNull();
      expect(screen.queryByText("Quarantine reviewed account")).toBeNull();
      expect(mockReview).toHaveBeenCalledTimes(1);

      const currentUser = change === "input" ? FIRST_USER : SECOND_USER;
      mockReview.mockResolvedValueOnce({
        ...removalReview(false),
        target: currentUser,
        blockers: ["protected_platform_identity"]
      });
      fillRemovalInputs(screen, currentUser.email);
      fireEvent.press(screen.getByText("Review account removal"));
      expect(await screen.findByText(BLOCKED_FEEDBACK)).toBeTruthy();
      expect(
        screen.getByText("This immutable platform identity is protected.")
      ).toBeTruthy();
      expect(mockReview).toHaveBeenLastCalledWith(
        currentUser.id,
        expect.objectContaining({ expectedEmail: currentUser.email })
      );
      expect(mockReview).toHaveBeenCalledTimes(2);
      expect(mockQuarantine).not.toHaveBeenCalled();
    }
  );

  test("preserves an unchanged current review across rerenders", async () => {
    mockReview.mockResolvedValue(removalReview());
    const screen = await requestedRemovalScreen();
    fireEvent.press(screen.getByText("Review account removal"));
    await screen.findByText(PASSED_FEEDBACK);
    fireEvent.changeText(
      screen.getByLabelText("Exact account quarantine confirmation"),
      "Not the complete confirmation"
    );

    screen.rerender(<AdminEvidenceVaultCard users={USERS} requestedUser={FIRST_USER} />);

    expect(screen.getByText(PASSED_FEEDBACK)).toBeTruthy();
    expect(screen.getByText("Review passed")).toBeTruthy();
    expect(screen.getByLabelText("Exact account quarantine confirmation")).toHaveProp(
      "value",
      "Not the complete confirmation"
    );
    expect(mockReview).toHaveBeenCalledTimes(1);
    expect(mockQuarantine).not.toHaveBeenCalled();
  });

  test("shows a current review error and clears it when retrying successfully", async () => {
    mockReview.mockRejectedValueOnce(new Error("Current review failed closed"));
    const screen = await requestedRemovalScreen();
    fireEvent.press(screen.getByText("Review account removal"));
    expect(await screen.findByText("Current review failed closed")).toBeTruthy();
    expect(screen.queryByLabelText("Account removal safety review")).toBeNull();

    mockReview.mockResolvedValueOnce(removalReview());
    fireEvent.press(screen.getByText("Review account removal"));

    expect(await screen.findByText(PASSED_FEEDBACK)).toBeTruthy();
    expect(screen.queryByText("Current review failed closed")).toBeNull();
    expect(mockReview).toHaveBeenCalledTimes(2);
    expect(mockQuarantine).not.toHaveBeenCalled();
  });

  test("restores from an opaque archive without making the Admin find a hidden user ID", async () => {
    mockRestoreReview.mockResolvedValue({
      target: { id: TARGET_ID, email: "member@example.com" },
      archiveId: ARCHIVE_ID,
      nextConfirmation: `RESTORE ${ARCHIVE_ID} ${TARGET_ID}`,
      reviewToken: "restore-review-token",
      reviewExpiresAt: "2030-01-01T00:05:00.000Z"
    });
    mockRestore.mockResolvedValue({
      archiveId: ARCHIVE_ID,
      targetUserId: TARGET_ID,
      quarantineStatus: "restored"
    });
    const screen = render(
      <AdminEvidenceVaultCard users={[{ id: TARGET_ID, email: "member@example.com" }]} />
    );

    fireEvent.press(screen.getByLabelText("Open evidence vault controls"));
    await screen.findByText(`removed-account-${ARCHIVE_ID}`);
    fireEvent.press(screen.getByText("Start reviewed restore"));

    expect(screen.queryByLabelText("Exact target user ID for restore")).toBeNull();
    fireEvent.press(screen.getByLabelText("Review selected account restore"));
    await waitFor(() => expect(mockRestoreReview).toHaveBeenCalledWith(ARCHIVE_ID));

    fireEvent.changeText(
      screen.getByLabelText("Exact account restore confirmation"),
      `RESTORE ${ARCHIVE_ID} ${TARGET_ID}`
    );
    fireEvent.press(screen.getByText("Restore reviewed account"));

    await waitFor(() =>
      expect(mockRestore).toHaveBeenCalledWith(ARCHIVE_ID, {
        reviewToken: "restore-review-token",
        confirmation: `RESTORE ${ARCHIVE_ID} ${TARGET_ID}`
      })
    );
    expect(
      await screen.findByText(
        "The quarantined account was restored. The action remains audited."
      )
    ).toBeTruthy();
    expect(screen.queryByText(`Restore ${ARCHIVE_ID}`)).toBeNull();
    expect(screen.queryByLabelText("Exact account restore confirmation")).toBeNull();
  });

  test.each(["success", "error"] as const)(
    "clears a completed restore review %s when selecting another archive",
    async (result) => {
      if (result === "success")
        mockRestoreReview.mockResolvedValueOnce(restoreReviewFor());
      else
        mockRestoreReview.mockRejectedValueOnce(new Error("First archive review failed"));
      const screen = await twoArchiveRestoreScreen();
      fireEvent.press(screen.getByLabelText("Review selected account restore"));
      await screen.findByText(
        result === "success" ? RESTORE_FEEDBACK : "First archive review failed"
      );
      if (result === "success") {
        fireEvent.changeText(
          screen.getByLabelText("Exact account restore confirmation"),
          restoreReviewFor().nextConfirmation
        );
      }

      fireEvent.press(screen.getAllByText("Start reviewed restore")[1]);

      expect(screen.getByText(`Restore ${SECOND_ARCHIVE_ID}`)).toBeTruthy();
      expect(screen.queryByText(`Restore ${ARCHIVE_ID}`)).toBeNull();
      expect(screen.queryByText(RESTORE_FEEDBACK)).toBeNull();
      expect(screen.queryByText("First archive review failed")).toBeNull();
      expect(screen.queryByLabelText("Exact account restore confirmation")).toBeNull();
      expect(screen.queryByText("Restore reviewed account")).toBeNull();
      expect(mockRestoreReview).toHaveBeenCalledTimes(1);
      expect(mockRestore).not.toHaveBeenCalled();
    }
  );

  test.each(["success", "error"] as const)(
    "ignores a late restore review %s for the previous archive and restores only the new reviewed target",
    async (result) => {
      let resolveReview!: (value: ReturnType<typeof restoreReviewFor>) => void;
      let rejectReview!: (error: Error) => void;
      mockRestoreReview.mockReturnValueOnce(
        new Promise((resolve, reject) => {
          resolveReview = resolve;
          rejectReview = reject;
        })
      );
      const screen = await twoArchiveRestoreScreen();
      fireEvent.press(screen.getByLabelText("Review selected account restore"));
      expect(mockRestoreReview).toHaveBeenCalledWith(ARCHIVE_ID);
      fireEvent.press(screen.getAllByText("Start reviewed restore")[1]);

      await act(async () => {
        if (result === "success") resolveReview(restoreReviewFor());
        else rejectReview(new Error("Obsolete restore review failure"));
      });

      expect(screen.getByText(`Restore ${SECOND_ARCHIVE_ID}`)).toBeTruthy();
      expect(screen.queryByText(`Restore ${ARCHIVE_ID}`)).toBeNull();
      expect(screen.queryByText(RESTORE_FEEDBACK)).toBeNull();
      expect(screen.queryByText("Obsolete restore review failure")).toBeNull();
      expect(screen.queryByLabelText("Exact account restore confirmation")).toBeNull();
      expect(screen.queryByText("Restore reviewed account")).toBeNull();
      expect(mockRestore).not.toHaveBeenCalled();

      const currentReview = restoreReviewFor(SECOND_ARCHIVE_ID, SECOND_USER);
      mockRestoreReview.mockResolvedValueOnce(currentReview);
      mockRestore.mockResolvedValueOnce({
        archiveId: SECOND_ARCHIVE_ID,
        targetUserId: SECOND_USER.id,
        quarantineStatus: "restored"
      });
      fireEvent.press(screen.getByLabelText("Review selected account restore"));
      expect(await screen.findByText(RESTORE_FEEDBACK)).toBeTruthy();
      expect(mockRestoreReview).toHaveBeenLastCalledWith(SECOND_ARCHIVE_ID);
      expect(mockRestoreReview).toHaveBeenCalledTimes(2);
      fireEvent.changeText(
        screen.getByLabelText("Exact account restore confirmation"),
        currentReview.nextConfirmation
      );
      fireEvent.press(screen.getByText("Restore reviewed account"));

      await waitFor(() =>
        expect(mockRestore).toHaveBeenCalledWith(SECOND_ARCHIVE_ID, {
          reviewToken: currentReview.reviewToken,
          confirmation: currentReview.nextConfirmation
        })
      );
      expect(mockRestore).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByText(
          "The quarantined account was restored. The action remains audited."
        )
      ).toBeTruthy();
    }
  );

  test.each([
    ["quarantine", "none"],
    ["quarantine", "archives"],
    ["quarantine", "accounts"],
    ["quarantine", "both"],
    ["restore", "none"],
    ["restore", "archives"],
    ["restore", "accounts"],
    ["restore", "both"]
  ] as const)(
    "refreshes both lists once after committed %s and preserves success when %s refresh fails",
    async (action, failure) => {
      const onAccountsChanged = jest.fn(async () => {
        if (failure === "accounts" || failure === "both") {
          throw new Error("Active list unavailable");
        }
      });
      const screen = await readyAccountAction(action, onAccountsChanged);
      expect(onAccountsChanged).not.toHaveBeenCalled();
      expect(mockRemoved).toHaveBeenCalledTimes(1);
      if (failure === "archives" || failure === "both") {
        mockRemoved.mockRejectedValueOnce(new Error("Archive list unavailable"));
      } else {
        mockRemoved.mockResolvedValueOnce({ accounts: [], nextCursor: null });
      }

      fireEvent.press(
        screen.getByText(
          action === "quarantine"
            ? "Quarantine reviewed account"
            : "Restore reviewed account"
        )
      );

      const successMessage =
        action === "quarantine"
          ? `Account quarantined in private archive ${ARCHIVE_ID}. It remains reversible until retention permits verified finalization.`
          : "The quarantined account was restored. The action remains audited.";
      const failedLists = [
        ...(failure === "archives" || failure === "both"
          ? ["removed-account archive list"]
          : []),
        ...(failure === "accounts" || failure === "both" ? ["active-account list"] : [])
      ];
      expect(
        await screen.findByText(
          failedLists.length
            ? `${successMessage}\nList refresh failed (${failedLists.join(", ")}). The account change succeeded; refresh the lists before another action.`
            : successMessage
        )
      ).toBeTruthy();
      await waitFor(() => expect(onAccountsChanged).toHaveBeenCalledTimes(1));
      expect(mockRemoved).toHaveBeenCalledTimes(2);
      expect(
        action === "quarantine" ? mockQuarantine : mockRestore
      ).toHaveBeenCalledTimes(1);
      expect(screen.queryByLabelText("Exact account quarantine confirmation")).toBeNull();
      expect(screen.queryByLabelText("Exact account restore confirmation")).toBeNull();
      if (failure === "none" || failure === "accounts") {
        await waitFor(() =>
          expect(screen.queryByText(`removed-account-${ARCHIVE_ID}`)).toBeNull()
        );
      }
    }
  );

  test.each(["quarantine", "restore"] as const)(
    "does not refresh the parent or archive list after a failed %s",
    async (action) => {
      const onAccountsChanged = jest.fn();
      const screen = await readyAccountAction(action, onAccountsChanged);
      const mutation = action === "quarantine" ? mockQuarantine : mockRestore;
      mutation.mockRejectedValueOnce(new Error("Mutation refused"));

      fireEvent.press(
        screen.getByText(
          action === "quarantine"
            ? "Quarantine reviewed account"
            : "Restore reviewed account"
        )
      );

      expect(await screen.findByText(/Mutation refused/)).toBeTruthy();
      expect(mutation).toHaveBeenCalledTimes(1);
      expect(onAccountsChanged).not.toHaveBeenCalled();
      expect(mockRemoved).toHaveBeenCalledTimes(1);
    }
  );
});
