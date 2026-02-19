// Re-export JS client so TS imports and JS imports behave identically.
export * from "./client.js";
import api from "./client.js";

export default api;
