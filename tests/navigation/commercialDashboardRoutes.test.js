import fs from "fs";
import path from "path";

describe("CommercialDashboardScreen route targets", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/screens/commercial/CommercialDashboardScreen.js"),
    "utf8"
  );

  it("routes primary setup actions to connected commercial workspaces", () => {
    expect(source).toContain('navigation.navigate("Storefront")');
    expect(source).toContain('navigation.navigate("NewCommercialProduct")');
    expect(source).toContain('navigation.navigate("Courses")');
    expect(source).toContain('navigation.navigate("CommercialLives")');
    expect(source).toContain('route="Feed"');
    expect(source).toContain("fetchProductTrialEvidenceRuns");
    expect(source).not.toContain("fetchCommercialGrows");
    expect(source).not.toContain('navigation.navigate("CreateCourse")');
  });
});
