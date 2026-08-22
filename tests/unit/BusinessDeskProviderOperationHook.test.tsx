import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { ApiError } from "@/api/apiRequest";
import {
  getBusinessDeskProviderOperation,
  type BusinessAskResult
} from "@/api/businessDeskProvider";
import {
  forgetPersistedProviderIdentity,
  loadLatestPersistedProviderOperation
} from "@/features/businessDesk/providerOperationPersistence";
import { useBusinessDeskProviderOperation } from "@/features/businessDesk/useBusinessDeskProviderOperation";

let accountSubject = "account-one";
let facilityRole = "OWNER";

jest.mock("@/auth/AuthContext", () => ({
  useOptionalAuth: () => ({
    user: { id: accountSubject },
    ctx: { facilityRole }
  })
}));

jest.mock("@/api/businessDesk", () => ({
  businessDeskWorkspaceKey: (workspace: any) =>
    workspace.workspaceType === "facility"
      ? `facility:${workspace.facilityId}`
      : "commercial"
}));

jest.mock("@/api/businessDeskProvider", () => ({
  cancelBusinessDeskProviderOperation: jest.fn(),
  getBusinessDeskProviderCapabilities: jest.fn(),
  getBusinessDeskProviderOperation: jest.fn()
}));

jest.mock("@/features/businessDesk/providerOperationPersistence", () => ({
  businessDeskProviderPersistenceScopeKey: (subject: string, workspaceKey: string) =>
    subject ? `${subject}:${workspaceKey}` : "",
  forgetPersistedProviderIdentity: jest.fn(),
  getOrCreatePersistedProviderIdentity: jest.fn(),
  loadLatestPersistedProviderOperation: jest.fn(),
  rememberPersistedProviderOperation: jest.fn(
    async (identity: any, operationId: string) => ({
      ...identity,
      operationId
    })
  )
}));

const mockGetOperation = getBusinessDeskProviderOperation as jest.MockedFunction<
  typeof getBusinessDeskProviderOperation
>;
const mockLoadLatest = loadLatestPersistedProviderOperation as jest.MockedFunction<
  typeof loadLatestPersistedProviderOperation
>;
const mockForget = forgetPersistedProviderIdentity as jest.MockedFunction<
  typeof forgetPersistedProviderIdentity
>;

function persisted(scopeKey: string, operationId: string) {
  return {
    scopeKey,
    slot: "business_ask" as const,
    signatureSha256: "a".repeat(64),
    clientOperationKey: "stable-key",
    operationId,
    updatedAt: "2026-08-22T12:00:00.000Z"
  };
}

function terminalPacket(operationId: string) {
  return {
    operation: {
      id: operationId,
      kind: "business_ask",
      state: "succeeded",
      version: 2,
      clientOperationKey: "stable-key",
      requestDigest: "b".repeat(64),
      cancellable: false,
      timestamps: {
        createdAt: "2026-08-22T12:00:00.000Z",
        updatedAt: "2026-08-22T12:00:01.000Z",
        queuedAt: "2026-08-22T12:00:00.000Z",
        processingAt: "2026-08-22T12:00:00.500Z",
        completedAt: "2026-08-22T12:00:01.000Z",
        cancelledAt: null
      },
      error: null,
      credit: { credits: 1, status: "charged" },
      result: { type: "business_ask" } as BusinessAskResult
    },
    idempotentReplay: null
  } as any;
}

function Probe({
  workspace
}: {
  workspace:
    | { workspaceType: "commercial" }
    | { workspaceType: "facility"; facilityId: string };
}) {
  const operation = useBusinessDeskProviderOperation<BusinessAskResult>({
    workspace,
    kind: "business_ask",
    slot: "business_ask",
    keyPrefix: "ask"
  });
  return (
    <Text>
      {operation.busy || "idle"}|{operation.operation?.id || "none"}|{operation.notice}|
      {operation.error?.message || "no-error"}
    </Text>
  );
}

describe("Business Desk provider operation recovery", () => {
  beforeEach(() => {
    accountSubject = "account-one";
    facilityRole = "OWNER";
    mockGetOperation.mockReset();
    mockLoadLatest.mockReset();
    mockForget.mockReset();
  });

  it("restores a terminal operation only inside the signed-in account scope", async () => {
    mockLoadLatest.mockResolvedValue(
      persisted("account-one:commercial", "terminal-operation")
    );
    mockGetOperation.mockResolvedValue(terminalPacket("terminal-operation"));

    const screen = render(<Probe workspace={{ workspaceType: "commercial" }} />);

    expect(await screen.findByText(/idle\|terminal-operation\|Recovered/i)).toBeTruthy();
    expect(mockLoadLatest).toHaveBeenCalledWith("account-one:commercial", "business_ask");
  });

  it("drops prior recovery state when the authorized workspace changes", async () => {
    mockLoadLatest.mockImplementation(async (scopeKey) =>
      scopeKey === "account-one:commercial"
        ? persisted(scopeKey, "commercial-operation")
        : null
    );
    mockGetOperation.mockResolvedValue(terminalPacket("commercial-operation"));
    const screen = render(<Probe workspace={{ workspaceType: "commercial" }} />);
    expect(await screen.findByText(/commercial-operation/i)).toBeTruthy();

    screen.rerender(
      <Probe workspace={{ workspaceType: "facility", facilityId: "facility-2" }} />
    );
    await waitFor(() => expect(screen.getByText(/idle\|none\|\|no-error/i)).toBeTruthy());
    expect(mockLoadLatest).toHaveBeenLastCalledWith(
      "account-one:facility-role:OWNER:facility:facility-2",
      "business_ask"
    );
  });

  it("drops a Facility result when the same account role changes", async () => {
    mockLoadLatest.mockImplementation(async (scopeKey) =>
      scopeKey.includes("facility-role:OWNER")
        ? persisted(scopeKey, "owner-operation")
        : null
    );
    mockGetOperation.mockResolvedValue(terminalPacket("owner-operation"));
    const screen = render(
      <Probe workspace={{ workspaceType: "facility", facilityId: "facility-2" }} />
    );
    expect(await screen.findByText(/owner-operation/i)).toBeTruthy();

    facilityRole = "MANAGER";
    screen.rerender(
      <Probe workspace={{ workspaceType: "facility", facilityId: "facility-2" }} />
    );
    await waitFor(() => expect(screen.getByText(/idle\|none\|\|no-error/i)).toBeTruthy());
    expect(mockLoadLatest).toHaveBeenLastCalledWith(
      "account-one:facility-role:MANAGER:facility:facility-2",
      "business_ask"
    );
  });

  it("removes metadata when backend authorization is revoked or the operation is gone", async () => {
    const identity = persisted("account-one:commercial", "revoked-operation");
    mockLoadLatest.mockResolvedValue(identity);
    const denied = new ApiError("FORBIDDEN", 403);
    denied.message = "Forbidden";
    mockGetOperation.mockRejectedValue(denied);

    const screen = render(<Probe workspace={{ workspaceType: "commercial" }} />);

    expect(await screen.findByText(/local retry metadata was removed/i)).toBeTruthy();
    expect(mockForget).toHaveBeenCalledWith(
      identity.scopeKey,
      identity.slot,
      identity.signatureSha256
    );
    expect(screen.getByText(/idle\|none/i)).toBeTruthy();
  });
});
