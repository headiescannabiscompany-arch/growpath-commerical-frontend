import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AdminEvidenceVaultCard from "../AdminEvidenceVaultCard";
import {
  getEvidenceVaultCapabilities,
  listAdminEvidenceRequests,
  listRemovedAccounts,
  listRestrictedCases,
  quarantineAccount,
  restoreQuarantinedAccount,
  reviewAccountRemoval,
  reviewAccountRestore
} from "@/api/adminEvidenceVault";

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
  });
});
