import { client } from "./client.js";
import routes from "./routes.js";

export function getTokenBalance(token) {
  return client.get(routes.TOKENS.BALANCE, token);
}

export function consumeTokens(data, token) {
  return client.post(routes.TOKENS.CONSUME, data, token);
}

export function grantTokens(data, token) {
  return client.post(routes.TOKENS.GRANT, data, token);
}
