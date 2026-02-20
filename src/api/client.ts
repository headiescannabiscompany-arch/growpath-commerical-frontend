// Thin TypeScript wrapper around the canonical JS client.
// Keep this file implementation-free to avoid redeclare/parse issues in Jest/Babel.
export * from "./client.js";
export { default } from "./client.js";
export { default as api } from "./client.js";
