import { client } from "./client";

export function getTokenBalance(token) {
  return client.get("/api/tokens/balance", token);
}

export function consumeTokens(data, token) {
  return client.post("/api/tokens/consume", data, token);
}

export function grantTokens(data, token) {
  return client.post("/api/tokens/grant", data, token);
}
