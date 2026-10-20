// Only synthetic tokens supplied by the owned loopback fixture, in memory.
let token = (globalThis as any).__supportFixture.token as string;
export async function getToken() {
  return token;
}
export function switchSyntheticIdentity() {
  token = (globalThis as any).__supportFixture.otherToken;
}
export async function setToken() {
  throw new Error("Real credential writes forbidden");
}
export async function clearToken() {
  throw new Error("Real sign-out forbidden");
}
