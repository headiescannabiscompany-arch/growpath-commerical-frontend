import fs from "fs";
import path from "path";

const dashboardSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/home/facility/(tabs)/dashboard.tsx"),
  "utf8"
);

describe("facility learning and community access", () => {
  it("promotes Forum / Q&A and Courses near the top of the facility dashboard", () => {
    const sectionIndex = dashboardSource.indexOf("Learning &amp; community");
    const operationsIndex = dashboardSource.indexOf("At a glance");

    expect(sectionIndex).toBeGreaterThan(-1);
    expect(sectionIndex).toBeLessThan(operationsIndex);
    expect(dashboardSource).toContain('label: "Forum / Q&A"');
    expect(dashboardSource).toContain('action: "Open forum"');
    expect(dashboardSource).toContain('to: "/forum"');
    expect(dashboardSource).toContain('label: "Courses"');
    expect(dashboardSource).toContain('action: "Browse courses"');
    expect(dashboardSource).toContain('to: "/courses"');
  });
});
