import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import AdminEvidenceApprovalPanel, {
  RestrictedEvidenceRequestSummary
} from "../AdminEvidenceApprovalPanel";
import {
  approveLegalEvidenceRequest,
  getEvidenceVaultCapabilities,
  reviewLegalEvidenceApproval,
  updateLegalEvidenceRequestReview
} from "@/api/adminEvidenceVault";

jest.mock("@/api/adminEvidenceVault", () => {
  const actual = jest.requireActual("@/api/adminEvidenceVault");
  return {
    ...actual,
    approveLegalEvidenceRequest: jest.fn(),
    getEvidenceVaultCapabilities: jest.fn(),
    reviewLegalEvidenceApproval: jest.fn(),
    updateLegalEvidenceRequestReview: jest.fn()
  };
});

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      surface: "#fff",
      surfaceMuted: "#eef7ef",
      border: "#ccd9cc",
      borderSoft: "#dde7dd",
      text: "#122012",
      textSoft: "#344434",
      textMuted: "#5f6f5f",
      link: "#166534",
      accent: "#166534",
      accentSoft: "#dcfce7",
      accentText: "#fff",
      success: "#166534",
      warning: "#b45309"
    }
  })
}));

const REQUEST_ID = "64b000000000000000000011";
const TARGET_ID = "64b000000000000000000012";
const CONFIRMATION = `APPROVE EVIDENCE REQUEST ${REQUEST_ID} FOR ${TARGET_ID}`;
const REVIEW_TOKEN = "ULTRA_SECRET_REVIEW_TOKEN_DO_NOT_RENDER";

const mockCapabilities = getEvidenceVaultCapabilities as jest.MockedFunction<
  typeof getEvidenceVaultCapabilities
>;
const mockUpdate = updateLegalEvidenceRequestReview as jest.MockedFunction<
  typeof updateLegalEvidenceRequestReview
>;
const mockReview = reviewLegalEvidenceApproval as jest.MockedFunction<
  typeof reviewLegalEvidenceApproval
>;
const mockApprove = approveLegalEvidenceRequest as jest.MockedFunction<
  typeof approveLegalEvidenceRequest
>;

function capabilityReceipt(evidenceApproval = true) {
  return {
    configured: evidenceApproval,
    capabilities: {
      accountRemovalOwner: false,
      evidenceAccess: evidenceApproval,
      evidenceApproval,
      severeHarmReview: false
    }
  };
}

function legalRequest(overrides: Record<string, unknown> = {}) {
  return {
    _id: REQUEST_ID,
    requestType: "court_order",
    status: "legal_review",
    preservationHold: true,
    preservationExpiresAt: "2099-01-01T00:00:00.000Z",
    targetBound: true,
    targetUserId: TARGET_ID,
    detailsAvailable: true,
    requesterIdentityVerification: {
      verified: true,
      method: "government ID",
      reference: "ID-REVIEW-21"
    },
    requesterAuthorityVerification: {
      verified: true,
      method: "agency callback",
      reference: "AUTH-REVIEW-22"
    },
    jurisdiction: "Maryland",
    jurisdictionReview: {
      reviewed: true,
      determination: "Order is within the issuing court's jurisdiction.",
      reference: "JUR-REVIEW-23"
    },
    minimumNecessaryScope: "Account identity records only.",
    userNoticeStatus: "delayed",
    ...overrides
  };
}

function fillApproval(screen: ReturnType<typeof render>) {
  fireEvent(
    screen.getByLabelText("Archive scope to add"),
    "valueChange",
    "payments.activity"
  );
  fireEvent.press(screen.getByLabelText("Add selected archive scope"));
  fireEvent(
    screen.getByLabelText("Archive scope to add"),
    "valueChange",
    "account.identity"
  );
  fireEvent.press(screen.getByLabelText("Add selected archive scope"));
  fireEvent.changeText(
    screen.getByLabelText("Legal approval reason"),
    "Court order independently reviewed."
  );
  fireEvent.changeText(screen.getByLabelText("Legal approver name"), "Erick Admin");
  fireEvent.changeText(
    screen.getByLabelText("Legal approver email"),
    "ERICK@EXAMPLE.COM"
  );
  fireEvent.changeText(
    screen.getByLabelText("Legal approver role"),
    "Independent legal approver"
  );
  fireEvent.changeText(
    screen.getByLabelText("Legal approval reference"),
    "COUNSEL-2026-44"
  );
}

describe("AdminEvidenceApprovalPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilities.mockResolvedValue(capabilityReceipt(true));
    mockUpdate.mockResolvedValue(legalRequest() as never);
    mockReview.mockResolvedValue({
      evidenceRequestId: REQUEST_ID,
      targetUserId: TARGET_ID,
      scopes: ["account.identity", "payments.activity"],
      reviewToken: REVIEW_TOKEN,
      reviewExpiresAt: "2099-01-01T00:05:00.000Z",
      nextConfirmation: CONFIRMATION,
      externalTransmissionPerformed: false
    });
    mockApprove.mockResolvedValue({
      evidenceRequestId: REQUEST_ID,
      targetUserId: TARGET_ID,
      status: "approved",
      approvedArchiveScopes: ["account.identity", "payments.activity"],
      approvedAt: "2099-01-01T00:01:00.000Z",
      approvedBy: "64b000000000000000000013",
      externalTransmissionPerformed: false
    });
  });

  it("renders only a non-sensitive summary for an ordinary Admin redacted row", async () => {
    const redacted = {
      _id: REQUEST_ID,
      requestType: "subpoena",
      status: "legal_review",
      preservationHold: true,
      targetBound: true,
      detailsAvailable: false,
      createdAt: "2026-09-07T12:00:00.000Z",
      requesterName: "SECRET REQUESTER",
      requesterEmail: "secret@example.gov",
      targetUserId: TARGET_ID
    };
    const summary = render(<RestrictedEvidenceRequestSummary request={redacted} />);

    expect(summary.getByText("subpoena · legal_review")).toBeTruthy();
    expect(summary.getByText(/target linked/)).toBeTruthy();
    expect(summary.queryByText(/SECRET REQUESTER/)).toBeNull();
    expect(summary.queryByText(/secret@example.gov/)).toBeNull();
    expect(summary.queryByText(new RegExp(TARGET_ID))).toBeNull();
    expect(summary.queryByRole("button")).toBeNull();

    const panel = render(
      <AdminEvidenceApprovalPanel requests={[redacted]} onUpdated={jest.fn()} />
    );
    await waitFor(() => expect(mockCapabilities).toHaveBeenCalledTimes(1));
    expect(panel.queryByLabelText("Independent legal evidence approval")).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockReview).not.toHaveBeenCalled();
  });

  it("shows no workflow controls without the configured approval capability", async () => {
    mockCapabilities.mockResolvedValue(capabilityReceipt(false));
    const screen = render(
      <AdminEvidenceApprovalPanel requests={[legalRequest()]} onUpdated={jest.fn()} />
    );

    await waitFor(() => expect(mockCapabilities).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText(`Review legal workflow for ${REQUEST_ID}`)).toBeNull();
    expect(screen.queryByLabelText("Review exact legal evidence approval")).toBeNull();
  });

  it("records identity and authority verification with the exact bounded PATCH", async () => {
    const identityRequest = legalRequest({
      status: "identity_review",
      preservationHold: false,
      requesterIdentityVerification: null,
      requesterAuthorityVerification: null,
      jurisdiction: "",
      jurisdictionReview: null,
      minimumNecessaryScope: "",
      userNoticeStatus: ""
    });
    const screen = render(
      <AdminEvidenceApprovalPanel requests={[identityRequest]} onUpdated={jest.fn()} />
    );

    fireEvent.press(
      await screen.findByLabelText(`Review legal workflow for ${REQUEST_ID}`)
    );
    fireEvent.changeText(
      screen.getByLabelText("Identity verification method"),
      "government ID"
    );
    fireEvent.changeText(
      screen.getByLabelText("Identity verification reference"),
      "ID-REVIEW-21"
    );
    fireEvent.changeText(
      screen.getByLabelText("Authority verification method"),
      "agency callback"
    );
    fireEvent.changeText(
      screen.getByLabelText("Authority verification reference"),
      "AUTH-REVIEW-22"
    );
    fireEvent.changeText(
      screen.getByLabelText("Identity review reason"),
      "Verified requester and authority independently."
    );
    fireEvent.press(screen.getByLabelText("Record identity and authority reviews"));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(REQUEST_ID, {
        requesterIdentityVerification: {
          verified: true,
          method: "government ID",
          reference: "ID-REVIEW-21"
        },
        requesterAuthorityVerification: {
          verified: true,
          method: "agency callback",
          reference: "AUTH-REVIEW-22"
        },
        reason: "Verified requester and authority independently."
      })
    );
  });

  it("records legal prerequisites without sending legacy approval fields", async () => {
    const request = legalRequest({
      jurisdiction: "",
      jurisdictionReview: null,
      minimumNecessaryScope: "",
      userNoticeStatus: ""
    });
    const screen = render(
      <AdminEvidenceApprovalPanel requests={[request]} onUpdated={jest.fn()} />
    );

    fireEvent.press(
      await screen.findByLabelText(`Review legal workflow for ${REQUEST_ID}`)
    );
    fireEvent.changeText(screen.getByLabelText("Reviewed jurisdiction"), "Maryland");
    fireEvent.changeText(
      screen.getByLabelText("Jurisdiction determination"),
      "Order is within the issuing court's jurisdiction."
    );
    fireEvent.changeText(
      screen.getByLabelText("Jurisdiction review reference"),
      "JUR-REVIEW-23"
    );
    fireEvent.changeText(
      screen.getByLabelText("Minimum necessary scope"),
      "Account identity records only."
    );
    fireEvent(screen.getByLabelText("User notice decision"), "valueChange", "delayed");
    fireEvent.changeText(
      screen.getByLabelText("Legal prerequisite review reason"),
      "Counsel completed the bounded prerequisite review."
    );
    fireEvent.press(screen.getByLabelText("Record legal approval prerequisites"));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const body = mockUpdate.mock.calls[0][1];
    expect(body).toEqual({
      jurisdiction: "Maryland",
      jurisdictionReview: {
        reviewed: true,
        determination: "Order is within the issuing court's jurisdiction.",
        reference: "JUR-REVIEW-23"
      },
      minimumNecessaryScope: "Account identity records only.",
      userNoticeStatus: "delayed",
      reason: "Counsel completed the bounded prerequisite review."
    });
    expect(body).not.toHaveProperty("legalReview");
    expect(body).not.toHaveProperty("approved");
    expect(body).not.toHaveProperty("disclosed");
  });

  it("reviews and executes the exact same approval without displaying its token", async () => {
    const onUpdated = jest.fn();
    const screen = render(
      <AdminEvidenceApprovalPanel requests={[legalRequest()]} onUpdated={onUpdated} />
    );
    fireEvent.press(
      await screen.findByLabelText(`Review legal workflow for ${REQUEST_ID}`)
    );
    fillApproval(screen);
    fireEvent.press(screen.getByLabelText("Review exact legal evidence approval"));

    const proposal = {
      targetUserId: TARGET_ID,
      scopes: ["account.identity", "payments.activity"],
      reason: "Court order independently reviewed.",
      legalReview: {
        decision: "approve",
        approverName: "Erick Admin",
        approverEmail: "erick@example.com",
        approverRole: "Independent legal approver",
        reference: "COUNSEL-2026-44"
      }
    };
    await waitFor(() => expect(mockReview).toHaveBeenCalledWith(REQUEST_ID, proposal));
    expect(await screen.findByText("Approval review ready")).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain(REVIEW_TOKEN);

    fireEvent.changeText(
      screen.getByLabelText("Exact legal approval confirmation"),
      CONFIRMATION
    );
    fireEvent.press(screen.getByLabelText("Approve evidence request without disclosure"));

    await waitFor(() =>
      expect(mockApprove).toHaveBeenCalledWith(REQUEST_ID, {
        ...proposal,
        reviewToken: REVIEW_TOKEN,
        confirmation: CONFIRMATION
      })
    );
    expect(await screen.findByText(/Evidence request approved/)).toBeTruthy();
    expect(screen.getByText(/No data was disclosed or transmitted/)).toBeTruthy();
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it("invalidates a reviewed approval when any proposal field changes", async () => {
    const screen = render(
      <AdminEvidenceApprovalPanel requests={[legalRequest()]} onUpdated={jest.fn()} />
    );
    fireEvent.press(
      await screen.findByLabelText(`Review legal workflow for ${REQUEST_ID}`)
    );
    fillApproval(screen);
    fireEvent.press(screen.getByLabelText("Review exact legal evidence approval"));
    expect(await screen.findByText("Approval review ready")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Legal approver role"), "Changed role");

    expect(screen.queryByText("Approval review ready")).toBeNull();
    expect(screen.queryByLabelText("Exact legal approval confirmation")).toBeNull();
    expect(mockApprove).not.toHaveBeenCalled();
  });
});
