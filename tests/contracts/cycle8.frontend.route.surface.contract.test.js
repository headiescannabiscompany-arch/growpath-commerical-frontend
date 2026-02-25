import fs from "fs";
import path from "path";
import { describe, expect, test } from "@jest/globals";

const ROOT = process.cwd();

const UI_ROUTES_PATH = path.join(ROOT, "tmp", "spec", "ui-routes.json");

const REQUIRED_ROUTES = [
  "/alerts/[id]",
  "/home/commercial",
  "/logs/[id]",
  "/tasks/[id]",
  "/home/facility"
];

describe("Cycle 8 frontend route surface", () => {
  test("required frontend-owned planned routes exist in inventory", () => {
    expect(fs.existsSync(UI_ROUTES_PATH)).toBe(true);
    const inv = JSON.parse(fs.readFileSync(UI_ROUTES_PATH, "utf8"));
    const routes = new Set(Array.isArray(inv?.routes) ? inv.routes : []);

    for (const route of REQUIRED_ROUTES) {
      expect(routes.has(route)).toBe(true);
    }
  });
});
