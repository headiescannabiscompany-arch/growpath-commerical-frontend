const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const MATRIX_PATH = path.join(ROOT, "docs", "product", "V1_FEATURE_BACKEND_MATRIX.json");
const UI_SURFACE_PATH = path.join(ROOT, "docs", "product", "V1_UI_SURFACE.json");
const UI_ROUTES_PATH = path.join(ROOT, "tmp", "spec", "ui-routes.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function collectSurfaceRoutes(surface) {
  const routes = new Set();
  for (const mode of Object.values(surface.modes || {})) {
    for (const route of mode.routes || []) routes.add(route);
    for (const route of mode.outOfNavRoutes || []) routes.add(route);
  }
  return routes;
}

describe("v1 release matrix scope", () => {
  test("all public v1 matrix rows are visible, complete, and routable", () => {
    const matrix = readJson(MATRIX_PATH);
    const inventory = readJson(UI_ROUTES_PATH);
    const routes = new Set(inventory.routes || []);

    const publicRows = (matrix.features || []).filter(
      (row) => row.releaseScope === "v1" && row.userVisible === true
    );

    expect(publicRows.length).toBeGreaterThan(0);
    for (const row of publicRows) {
      expect(row.releaseDecision).toBe("complete");
      expect(row.status).toBe("Functional");
      expect(typeof row.ui?.route).toBe("string");
      expect(routes.has(row.ui.route)).toBe(true);
    }
  });

  test("every v1 surface route has a public matrix row", () => {
    const matrix = readJson(MATRIX_PATH);
    const surface = readJson(UI_SURFACE_PATH);
    const publicRoutes = new Set(
      (matrix.features || [])
        .filter((row) => row.releaseScope === "v1" && row.userVisible === true)
        .map((row) => row.ui?.route)
        .filter(Boolean)
    );

    for (const route of collectSurfaceRoutes(surface)) {
      expect(publicRoutes.has(route)).toBe(true);
    }
  });

  test("grow-scoped personal logs and tasks stay out of top-level v1 navigation", () => {
    const matrix = readJson(MATRIX_PATH);
    const surface = readJson(UI_SURFACE_PATH);
    const personal = surface.modes.personal;

    expect(personal.nav).not.toContain("Logs");
    expect(personal.nav).not.toContain("Tasks");
    expect(personal.routes).not.toContain("/home/personal/logs");
    expect(personal.routes).not.toContain("/home/personal/tasks");

    for (const route of ["/home/personal/logs", "/home/personal/tasks"]) {
      const rows = (matrix.features || []).filter((row) => row.ui?.route === route);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.userVisible).toBe(false);
        expect(row.releaseScope).not.toBe("v1");
      }
    }
  });
});
