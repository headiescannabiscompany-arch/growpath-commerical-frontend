import { adminVaultRequest } from "@/api/adminPasskeys";
import {
  changeArchiveRetention,
  prepareRetentionConfirmation,
  retentionConfirmation,
  type RetentionProposal
} from "@/api/adminArchiveRetention";
jest.mock("@/api/adminPasskeys", () => ({ adminVaultRequest: jest.fn() }));
const request = adminVaultRequest as jest.Mock;
const input: RetentionProposal = {
  archiveId: "64b000000000000000000006",
  evidenceRequestId: "64b000000000000000000007",
  action: "apply",
  authority: "legal_hold",
  reason: "Synthetic reviewed reason",
  authorityReference: "MOCK-ONLY"
};
const result = () => ({
  ok: true,
  retention: {
    archiveId: input.archiveId,
    evidenceRequestId: input.evidenceRequestId,
    preservationHold: true,
    authority: "legal_hold",
    expiresAt: null,
    renewalCount: 0,
    externalTransmissionPerformed: false
  }
});
beforeEach(() => jest.clearAllMocks());

it("prepares only a phrase via GET, never sending the private reason in the URL", async () => {
  request.mockResolvedValue({ ok: true, nextConfirmation: retentionConfirmation(input) });
  await expect(prepareRetentionConfirmation(input)).resolves.toBe(
    retentionConfirmation(input)
  );
  const [path, options] = request.mock.calls[0];
  expect(path).toContain("/retention-confirmation?archiveId=");
  expect(path).not.toContain("Synthetic");
  expect(options).toEqual({ cache: "no-store", retries: 0 });
});
it.each(["apply", "renew", "release"] as const)(
  "validates and sends one %s without actor/expiry overrides",
  async (action) => {
    const proposal = {
      ...input,
      action,
      authority: action === "renew" ? ("2703f" as const) : input.authority,
      actorUserId: "forged",
      expiresAt: "forged"
    };
    request.mockResolvedValue({
      ok: true,
      retention: {
        ...result().retention,
        preservationHold: action !== "release",
        authority: action === "release" ? "none" : proposal.authority,
        renewalCount: action === "renew" ? 1 : 0,
        expiresAt: action === "renew" ? "2027-01-01T00:00:00.000Z" : null
      }
    });
    await changeArchiveRetention(proposal, retentionConfirmation(proposal));
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1]).toMatchObject({
      method: "POST",
      retries: 0,
      cache: "no-store"
    });
    expect(request.mock.calls[0][1].body).not.toHaveProperty("actorUserId");
    expect(request.mock.calls[0][1].body).not.toHaveProperty("expiresAt");
  }
);
it.each([
  { archiveId: "bad" },
  { evidenceRequestId: "bad" },
  { action: "" },
  { authority: "" },
  { action: "renew", authority: "legal_hold" },
  { reason: "short" },
  { authorityReference: "" },
  { authority: "emergency" },
  { authority: "2258a", agencyReference: "MOCK" },
  { authority: "2258a", agencyReference: "MOCK", reportSubmittedAt: "invalid" },
  { authority: "2258a", agencyReference: "MOCK", reportSubmittedAt: "2999-01-01" }
])("rejects incomplete or incompatible proposal: %j", async (change) => {
  await expect(
    prepareRetentionConfirmation({ ...input, ...change } as RetentionProposal)
  ).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});
it("requires the exact phrase and refuses a mismatched prepared phrase", async () => {
  await expect(changeArchiveRetention(input, "wrong")).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
  request.mockResolvedValue({ ok: true, nextConfirmation: "wrong" });
  await expect(prepareRetentionConfirmation(input)).rejects.toThrow("Invalid retention");
});
it.each([
  { archiveId: input.evidenceRequestId },
  { evidenceRequestId: input.archiveId },
  { preservationHold: false },
  { authority: "2703f" },
  { expiresAt: "invalid" },
  { renewalCount: -1 },
  { renewalCount: 2 },
  { externalTransmissionPerformed: true }
])("rejects an unconfirmed or mismatched outcome: %j", async (change) => {
  request.mockResolvedValue({
    ok: true,
    retention: { ...result().retention, ...change }
  });
  await expect(
    changeArchiveRetention(input, retentionConfirmation(input))
  ).rejects.toThrow("outcome was not confirmed");
});
