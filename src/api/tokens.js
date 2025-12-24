import { client } from "./client.js";
import ROUTES from "./routes.js";

export function getTokenBalance(token) {
  return client.get(ROUTES.TOKENS.BALANCE, token);
}

export function consumeTokens(data, token) {
  return client.post(ROUTES.TOKENS.CONSUME, data, token);
}

export function grantTokens(data, token) {
  return client.post(ROUTES.TOKENS.GRANT, data, token);
}