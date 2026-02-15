// Compatibility shim: some modules import "./apiClient.js" after the rename batch.
// Canonical implementation remains in "./client.js".
export { default } from "./client.js";
export * from "./client.js";
