const { hasDefaultRouteExport } = require("../../scripts/audit-routes.cjs");
const {
  findNormalizedDuplicateRoutePatterns,
  normalizeRoutePattern,
  toRoute
} = require("../../scripts/inventory-ui-routes.cjs");

describe("route tooling", () => {
  it("accepts direct and re-exported default route modules", () => {
    expect(hasDefaultRouteExport("export default function Route() {}")).toBe(true);
    expect(hasDefaultRouteExport('export { default } from "./Route";')).toBe(true);
    expect(hasDefaultRouteExport('export {\n  default\n} from "./Route";')).toBe(true);
    expect(hasDefaultRouteExport('export { default as Route } from "./Route";')).toBe(
      false
    );
    expect(hasDefaultRouteExport("export const Route = () => null;")).toBe(false);
  });

  it("normalizes route groups and parameter names before duplicate detection", () => {
    expect(toRoute("home/facility/(tabs)/audit-logs.tsx")).toBe(
      "/home/facility/audit-logs"
    );
    expect(toRoute("home/facility/audit-logs/index.tsx")).toBe(
      "/home/facility/audit-logs"
    );
    expect(normalizeRoutePattern("/plants/[id]/[[...rest]]")).toBe(
      "/plants/[param]/[[...param]]"
    );

    const duplicates = findNormalizedDuplicateRoutePatterns([
      {
        file: "src/app/plants/[id].tsx",
        route: "/plants/[id]",
        kind: "screen"
      },
      {
        file: "src/app/(catalog)/plants/[slug].tsx",
        route: "/plants/[slug]",
        kind: "screen"
      },
      {
        file: "src/app/plants/_layout.tsx",
        route: "/plants",
        kind: "layout"
      }
    ]);

    expect(duplicates).toEqual([
      {
        pattern: "/plants/[param]",
        matches: [
          expect.objectContaining({ file: "src/app/plants/[id].tsx" }),
          expect.objectContaining({ file: "src/app/(catalog)/plants/[slug].tsx" })
        ]
      }
    ]);
  });
});
