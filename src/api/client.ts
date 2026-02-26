import { apiRequest, API_URL, ApiError, setOnUnauthorized } from "./apiRequest";

type RequestOptions = Record<string, any> | undefined;
type LegacyTokenArg = string | null | undefined;
type OptionsOrToken = RequestOptions | string | null | undefined;

let authToken: string | null = null;
let tokenGetter:
  | (() => string | null | undefined | Promise<string | null | undefined>)
  | null = null;

export { API_URL, ApiError, setOnUnauthorized, apiRequest };

export function setAuthToken(token: string | null | undefined) {
  authToken = token ? String(token) : null;
}

export function clearAuthToken() {
  authToken = null;
}

export function getAuthToken() {
  return authToken;
}

export function setTokenGetter(
  fn:
    | (() => string | null | undefined | Promise<string | null | undefined>)
    | null
    | undefined
) {
  tokenGetter = typeof fn === "function" ? fn : null;
}

function normalizeTokenArg(options?: OptionsOrToken, tokenArg?: LegacyTokenArg) {
  if (typeof options === "string" && !tokenArg) {
    return { options: {}, token: options };
  }
  return { options: (options as RequestOptions) || {}, token: tokenArg || null };
}

async function applyLegacyAuth(
  options: RequestOptions = {},
  tokenArg: LegacyTokenArg = null
) {
  const legacyOpts = { ...(options || {}) };
  const legacyHeaders = { ...(legacyOpts.headers || {}) };
  let token = tokenArg;

  if (!token && tokenGetter) {
    try {
      token = (await tokenGetter()) || null;
    } catch {
      token = null;
    }
  }
  if (!token) token = authToken;

  if (token && !legacyHeaders.Authorization) {
    legacyHeaders.Authorization = `Bearer ${token}`;
  }

  legacyOpts.headers = legacyHeaders;
  return legacyOpts;
}

async function apiClient(
  path: string,
  options: RequestOptions = {},
  tokenArg: LegacyTokenArg = null
) {
  const opts = await applyLegacyAuth(options, tokenArg);
  return apiRequest(path, opts);
}

apiClient.request = (
  path: string,
  options: RequestOptions = {},
  tokenArg?: LegacyTokenArg
) => apiClient(path, options, tokenArg || null);

apiClient.get = (
  path: string,
  options: OptionsOrToken = {},
  tokenArg?: LegacyTokenArg
) => {
  const norm = normalizeTokenArg(options, tokenArg);
  return apiClient(path, { ...(norm.options || {}), method: "GET" }, norm.token);
};

apiClient.delete = (
  path: string,
  options: OptionsOrToken = {},
  tokenArg?: LegacyTokenArg
) => {
  const norm = normalizeTokenArg(options, tokenArg);
  return apiClient(path, { ...(norm.options || {}), method: "DELETE" }, norm.token);
};

apiClient.post = (
  path: string,
  body?: any,
  options: OptionsOrToken = {},
  tokenArg?: LegacyTokenArg
) => {
  const norm = normalizeTokenArg(options, tokenArg);
  const postOpts: Record<string, any> = { ...(norm.options || {}), method: "POST" };
  if (body !== undefined) postOpts.body = body;
  return apiClient(path, postOpts, norm.token);
};

apiClient.put = (
  path: string,
  body?: any,
  options: OptionsOrToken = {},
  tokenArg?: LegacyTokenArg
) => {
  const norm = normalizeTokenArg(options, tokenArg);
  const putOpts: Record<string, any> = { ...(norm.options || {}), method: "PUT" };
  if (body !== undefined) putOpts.body = body;
  return apiClient(path, putOpts, norm.token);
};

apiClient.patch = (
  path: string,
  body?: any,
  options: OptionsOrToken = {},
  tokenArg?: LegacyTokenArg
) => {
  const norm = normalizeTokenArg(options, tokenArg);
  const patchOpts: Record<string, any> = { ...(norm.options || {}), method: "PATCH" };
  if (body !== undefined) patchOpts.body = body;
  return apiClient(path, patchOpts, norm.token);
};

apiClient.postMultipart = (
  path: string,
  formData: any,
  options: OptionsOrToken = {},
  tokenArg?: LegacyTokenArg
) => {
  const norm = normalizeTokenArg(options, tokenArg);
  const multipartOpts: Record<string, any> = {
    ...(norm.options || {}),
    method: "POST",
    body: formData
  };
  const multipartHeaders = { ...(multipartOpts.headers || {}) };
  delete multipartHeaders["Content-Type"];
  delete multipartHeaders["content-type"];
  multipartOpts.headers = multipartHeaders;
  return apiClient(path, multipartOpts, norm.token);
};

export const client = apiClient;
export { apiClient as api };
apiClient.del = apiClient.delete;
const defaultClientExport = apiClient;
export default defaultClientExport;
