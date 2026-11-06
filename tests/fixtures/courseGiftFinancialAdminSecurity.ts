let epoch = 1, identity = 1, expiry: string | null = null;
const listeners = new Set<() => void>();
export const adminVaultRequest = jest.fn();
export const getAdminSecurityEpoch = () => epoch;
export const getAdminSecurityIdentityEpoch = () => identity;
export const getAdminStepUpExpiry = () => expiry;
export const subscribeAdminSecurity = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function changeSecurity(accountChanged = false, expiresAt: string | null = new Date(Date.now() + 300000).toISOString()) {
  epoch++; if (accountChanged) identity++; expiry = expiresAt; for (const fn of [...listeners]) fn();
}
export function resetSecurity() { adminVaultRequest.mockReset(); changeSecurity(true); }
export const listenerCount = () => listeners.size;
