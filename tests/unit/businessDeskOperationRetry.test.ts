import {
  businessDeskMutationSignature,
  resolveBusinessDeskRetryIdentity
} from "@/features/businessDesk/operationRetry";

describe("Business Desk ambiguous-operation retry identity", () => {
  it("reuses one key for the same attempted operation despite object key order", () => {
    const createKey = jest
      .fn()
      .mockReturnValueOnce("expense-create-key-1")
      .mockReturnValueOnce("expense-create-key-2");
    const first = resolveBusinessDeskRetryIdentity(
      null,
      {
        workspace: "commercial",
        operation: "create",
        input: { title: "Receipt", payload: { amountMinor: 1234, currency: "USD" } }
      },
      createKey
    );
    const retry = resolveBusinessDeskRetryIdentity(
      first,
      {
        input: { payload: { currency: "USD", amountMinor: 1234 }, title: "Receipt" },
        operation: "create",
        workspace: "commercial"
      },
      createKey
    );

    expect(retry).toBe(first);
    expect(retry.key).toBe("expense-create-key-1");
    expect(createKey).toHaveBeenCalledTimes(1);
  });

  it("issues a new key when payload, version, operation, or workspace changes", () => {
    let sequence = 0;
    const createKey = () => `key-${++sequence}`;
    const first = resolveBusinessDeskRetryIdentity(
      null,
      {
        workspace: "facility:one",
        operation: "update",
        recordId: "expense-1",
        expectedVersion: 2,
        input: { title: "Receipt" }
      },
      createKey
    );
    const changed = resolveBusinessDeskRetryIdentity(
      first,
      {
        workspace: "facility:two",
        operation: "update",
        recordId: "expense-1",
        expectedVersion: 3,
        input: { title: "Receipt revised" }
      },
      createKey
    );

    expect(changed.key).toBe("key-2");
    expect(changed.signature).not.toBe(first.signature);
  });

  it("matches JSON request semantics for omitted fields and rejects cyclic input", () => {
    expect(businessDeskMutationSignature({ a: 1, omitted: undefined })).toBe(
      businessDeskMutationSignature({ a: 1 })
    );
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => businessDeskMutationSignature(cyclic)).toThrow("cyclic");
  });
});
