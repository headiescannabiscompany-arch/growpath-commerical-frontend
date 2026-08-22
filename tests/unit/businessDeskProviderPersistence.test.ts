import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  businessDeskProviderPersistenceScopeKey,
  businessDeskProviderSignatureSha256,
  forgetPersistedProviderIdentity,
  getOrCreatePersistedProviderIdentity,
  loadLatestPersistedProviderOperation,
  rememberPersistedProviderOperation
} from "@/features/businessDesk/providerOperationPersistence";

const ACCOUNT_ONE = businessDeskProviderPersistenceScopeKey("account-one", "commercial");
const ACCOUNT_TWO = businessDeskProviderPersistenceScopeKey("account-two", "commercial");
const OPERATION_ONE = "507f191e810c19729de86001";
const OPERATION_TWO = "507f191e810c19729de86002";
const OPERATION_THREE = "507f191e810c19729de86003";
const OPERATION_FOUR = "507f191e810c19729de86004";

describe("Business Desk provider retry metadata", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("matches standard SHA-256 vectors including UTF-8 surrogate pairs", () => {
    expect(businessDeskProviderSignatureSha256("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    expect(businessDeskProviderSignatureSha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    expect(businessDeskProviderSignatureSha256("Grow🌱")).toBe(
      "e8e705427032700ab754c2a94a85d43f4566c8f5b8761cb7b37549bf8ace76d3"
    );
  });

  it("reuses a key only for the same immutable signature", async () => {
    const first = await getOrCreatePersistedProviderIdentity({
      scopeKey: ACCOUNT_ONE,
      slot: "business_ask",
      signature: JSON.stringify({ question: "What needs attention?" }),
      keyPrefix: "business-ask"
    });
    const replay = await getOrCreatePersistedProviderIdentity({
      scopeKey: ACCOUNT_ONE,
      slot: "business_ask",
      signature: JSON.stringify({ question: "What needs attention?" }),
      keyPrefix: "business-ask"
    });
    const changed = await getOrCreatePersistedProviderIdentity({
      scopeKey: ACCOUNT_ONE,
      slot: "business_ask",
      signature: JSON.stringify({ question: "What is overdue?" }),
      keyPrefix: "business-ask"
    });

    expect(replay.clientOperationKey).toBe(first.clientOperationKey);
    expect(changed.clientOperationKey).not.toBe(first.clientOperationKey);
  });

  it("persists only digests and non-sensitive operation metadata", async () => {
    const sensitiveQuestion = "What did Roberto pay for the private soil shipment?";
    const sensitiveMerchant = "Private Merchant 4821";
    const identity = await getOrCreatePersistedProviderIdentity({
      scopeKey: businessDeskProviderPersistenceScopeKey(
        "private-account-id",
        "facility:facility-1"
      ),
      slot: "business_ask",
      signature: JSON.stringify({
        question: sensitiveQuestion,
        merchant: sensitiveMerchant
      }),
      keyPrefix: "business-ask"
    });
    await rememberPersistedProviderOperation(identity, OPERATION_ONE);

    const keys = await AsyncStorage.getAllKeys();
    const values = await AsyncStorage.multiGet(keys);
    const serialized = JSON.stringify(values);
    expect(serialized).not.toContain(sensitiveQuestion);
    expect(serialized).not.toContain(sensitiveMerchant);
    expect(serialized).not.toContain("private-account-id");
    expect(serialized).toContain(identity.signatureSha256);
    expect(serialized).toContain(OPERATION_ONE);
  });

  it("serializes simultaneous metadata mutations so neither slot is lost", async () => {
    const [receipt, ask] = await Promise.all([
      getOrCreatePersistedProviderIdentity({
        scopeKey: ACCOUNT_ONE,
        slot: "expense_receipt_extraction",
        signature: "receipt-immutable-request",
        keyPrefix: "receipt"
      }),
      getOrCreatePersistedProviderIdentity({
        scopeKey: ACCOUNT_ONE,
        slot: "business_ask",
        signature: "ask-immutable-request",
        keyPrefix: "ask"
      })
    ]);
    await Promise.all([
      rememberPersistedProviderOperation(receipt, OPERATION_ONE),
      rememberPersistedProviderOperation(ask, OPERATION_TWO)
    ]);

    const keys = await AsyncStorage.getAllKeys();
    const values = await AsyncStorage.multiGet(keys);
    const serialized = JSON.stringify(values);
    expect(serialized).toContain(OPERATION_ONE);
    expect(serialized).toContain(OPERATION_TWO);
  });

  it("isolates two commercial accounts on one device and restores only their latest operation", async () => {
    const firstAccount = await getOrCreatePersistedProviderIdentity({
      scopeKey: ACCOUNT_ONE,
      slot: "business_ask",
      signature: "first-account-question",
      keyPrefix: "ask"
    });
    const secondAccount = await getOrCreatePersistedProviderIdentity({
      scopeKey: ACCOUNT_TWO,
      slot: "business_ask",
      signature: "second-account-question",
      keyPrefix: "ask"
    });
    await rememberPersistedProviderOperation(firstAccount, OPERATION_ONE);
    await rememberPersistedProviderOperation(secondAccount, OPERATION_TWO);

    await expect(
      loadLatestPersistedProviderOperation(ACCOUNT_ONE, "business_ask")
    ).resolves.toMatchObject({ operationId: OPERATION_ONE, scopeKey: ACCOUNT_ONE });
    await expect(
      loadLatestPersistedProviderOperation(ACCOUNT_TWO, "business_ask")
    ).resolves.toMatchObject({ operationId: OPERATION_TWO, scopeKey: ACCOUNT_TWO });
  });

  it("removes revoked or stale restore metadata without affecting another account", async () => {
    const revoked = await getOrCreatePersistedProviderIdentity({
      scopeKey: ACCOUNT_ONE,
      slot: "business_ask",
      signature: "revoked-question",
      keyPrefix: "ask"
    });
    const retained = await getOrCreatePersistedProviderIdentity({
      scopeKey: ACCOUNT_TWO,
      slot: "business_ask",
      signature: "retained-question",
      keyPrefix: "ask"
    });
    await rememberPersistedProviderOperation(revoked, OPERATION_THREE);
    await rememberPersistedProviderOperation(retained, OPERATION_FOUR);
    await forgetPersistedProviderIdentity(
      revoked.scopeKey,
      revoked.slot,
      revoked.signatureSha256
    );

    await expect(
      loadLatestPersistedProviderOperation(ACCOUNT_ONE, "business_ask")
    ).resolves.toBeNull();
    await expect(
      loadLatestPersistedProviderOperation(ACCOUNT_TWO, "business_ask")
    ).resolves.toMatchObject({ operationId: OPERATION_FOUR });
  });

  it("refuses to persist or restore a legacy non-ObjectId operation identifier", async () => {
    const identity = await getOrCreatePersistedProviderIdentity({
      scopeKey: ACCOUNT_ONE,
      slot: "business_ask",
      signature: "legacy-id",
      keyPrefix: "ask"
    });
    await expect(
      rememberPersistedProviderOperation(identity, "legacy-operation-id")
    ).rejects.toThrow("identifier was invalid");
    await expect(
      loadLatestPersistedProviderOperation(ACCOUNT_ONE, "business_ask")
    ).resolves.toBeNull();
  });
});
