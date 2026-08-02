export const CLAIM_RETURN_PATH = "/claim-gift";
const MAX_TOKEN_LENGTH = 512;

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === "string" ? value : "";
}

export function normalizeGiftClaimToken(value: unknown): string {
  const token = firstString(value).trim();
  if (!token || token.length > MAX_TOKEN_LENGTH || /[\s&#?]/.test(token)) return "";
  return token;
}

export function buildClaimReturnPath(value: unknown): string {
  const token = normalizeGiftClaimToken(value);
  return token ? CLAIM_RETURN_PATH : "";
}

export function parseClaimReturnPath(value: unknown): string {
  const raw = firstString(value).trim();
  if (!raw || raw.length > 2048 || raw.includes("#")) return "";

  if (raw === CLAIM_RETURN_PATH) return CLAIM_RETURN_PATH;

  const queryIndex = raw.indexOf("?");
  if (queryIndex < 0 || raw.slice(0, queryIndex) !== CLAIM_RETURN_PATH) return "";

  const params = new URLSearchParams(raw.slice(queryIndex + 1));
  const entries = Array.from(params.entries());
  if (entries.length !== 1 || entries[0][0] !== "token") return "";

  return normalizeGiftClaimToken(entries[0][1]) ? CLAIM_RETURN_PATH : "";
}

export function giftClaimTokenFromFragment(value: unknown): string {
  const raw = firstString(value).trim().replace(/^#\??/, "");
  if (!raw || raw.length > 2048) return "";
  const params = new URLSearchParams(raw);
  const entries = Array.from(params.entries());
  if (entries.length !== 1 || entries[0][0] !== "token") return "";
  return normalizeGiftClaimToken(entries[0][1]);
}

export function browserGiftClaimTokenFromFragment(): string {
  const hash = (globalThis as any)?.window?.location?.hash;
  return giftClaimTokenFromFragment(hash);
}

export function scrubGiftClaimTokenFromBrowserUrl(): void {
  const browserWindow = (globalThis as any)?.window;
  const location = browserWindow?.location;
  const history = browserWindow?.history;
  if (!location || typeof history?.replaceState !== "function") return;

  const searchParams = new URLSearchParams(String(location.search || ""));
  const hadQueryToken = searchParams.has("token");
  searchParams.delete("token");

  const rawHash = String(location.hash || "");
  const fragmentBody = rawHash.trim().replace(/^#\??/, "");
  const fragmentParams = new URLSearchParams(fragmentBody);
  const hadFragmentToken = fragmentParams.has("token");
  fragmentParams.delete("token");
  if (!hadQueryToken && !hadFragmentToken) return;

  const nextSearch = searchParams.toString();
  const nextFragment = fragmentParams.toString();
  const nextUrl = `${String(location.pathname || CLAIM_RETURN_PATH)}${
    nextSearch ? `?${nextSearch}` : ""
  }${hadFragmentToken ? (nextFragment ? `#${nextFragment}` : "") : rawHash}`;
  history.replaceState(history.state ?? null, "", nextUrl);
}

export function claimLoginPath(email: unknown, next: unknown): string {
  const params = new URLSearchParams();
  const normalizedEmail = firstString(email).trim().toLowerCase();
  const claimNext = parseClaimReturnPath(next);
  if (normalizedEmail) params.set("email", normalizedEmail);
  if (claimNext) params.set("next", claimNext);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
