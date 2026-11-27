import { apiRequest } from "./apiRequest";

const acceptancePaths = {
  complimentary: "/api/subscription/complimentary-grants/claim/accept",
  prepaid: "/api/subscription/gifts/claim/accept"
} as const;

export type GuestGiftKind = keyof typeof acceptancePaths;

export async function acceptGuestGift(kind: GuestGiftKind, token: string): Promise<void> {
  const response = await apiRequest(acceptancePaths[kind], {
    method: "POST",
    auth: false,
    cache: "no-store",
    body: { token }
  });
  if ((response?.data ?? response)?.accepted !== true) {
    throw new Error("Gift acceptance could not be confirmed.");
  }
}
