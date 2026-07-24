import fs from "fs";
import path from "path";

describe("Commercial Inventory accessibility", () => {
  it("exposes the capability-gated create route as a named button", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/home/commercial/inventory.tsx"),
      "utf8"
    );

    expect(source).toMatch(
      /canCreate[\s\S]*?<TouchableOpacity[\s\S]*?accessibilityRole="button"[\s\S]*?accessibilityLabel="Create inventory support record"[\s\S]*?router\.push\("\/home\/commercial\/inventory\/new"\)/
    );
    expect(source).toContain("setError(mapApiError(e))");
  });
});
