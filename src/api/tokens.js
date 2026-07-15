import { apiRequest } from "./apiRequest";
import routes from "./routes.js";

export function getTokenBalance(token, options = {}) {
  return apiRequest(routes.TOKENS.BALANCE, {
    ...options,
    auth: token ? true : options.auth !== false
  });
}

export function consumeTokens(data, token) {
  return apiRequest(routes.TOKENS.CONSUME, {
    method: "POST",
    auth: token ? true : false,
    body: data
  });
}

export function grantTokens(data, token) {
  return apiRequest(routes.TOKENS.GRANT, {
    method: "POST",
    auth: token ? true : false,
    body: data
  });
}
