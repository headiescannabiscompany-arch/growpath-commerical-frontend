import { giftObjectId, giftUuid } from "./courseGiftSaleContract";

export function validGiftRenewalBody(value: unknown): boolean {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const body = value as Record<string, unknown>;
  return (
    Object.keys(body).length === 3 &&
    ["giftId", "token", "operationId"].every((key) => Object.hasOwn(body, key)) &&
    giftObjectId(body.giftId) &&
    giftUuid(body.operationId) &&
    typeof body.token === "string" &&
    /^[a-f0-9]{64}$/.test(body.token)
  );
}
export type GiftRenewalResult = { giftId: string; deliveryStatus: string };
export function boundGiftRenewal(
  value: unknown,
  giftId: string
): value is GiftRenewalResult {
  const row = value as GiftRenewalResult;
  return Boolean(
    row &&
    row.giftId === giftId &&
    ["pending", "sending", "retry", "accepted", "failed", "unknown", "canceled"].includes(
      row.deliveryStatus
    )
  );
}
