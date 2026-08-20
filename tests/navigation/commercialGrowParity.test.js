import fs from "fs";
import path from "path";

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("Commercial crop-aware grow parity", () => {
  it("keeps Commercial grows distinct from product trial evidence runs", () => {
    const source = read("src/app/home/commercial/_layout.tsx");

    expect(source).toMatch(
      /name="grows\/new"[\s\S]*?title: "Create Grow"/
    );
    expect(source).toMatch(
      /name="grows\/\[growId\]"[\s\S]*?title: "Grow Workspace"/
    );
    expect(source).toMatch(
      /name="evidence-runs\/new"[\s\S]*?title: "Create Product Trial Evidence Run"/
    );
    expect(source).toMatch(
      /name="evidence-runs\/\[id\]"[\s\S]*?title: "Product Trial Evidence Run Detail"/
    );
  });

  it("uses the canonical grow list and crop-aware creation form", () => {
    const listRoute = read("src/app/home/commercial/grows/index.tsx");
    const createRoute = read("src/app/home/commercial/grows/new.tsx");

    expect(listRoute).toContain('PersonalGrowsRoute workspace="commercial"');
    expect(createRoute).toContain('NewGrowScreen workspace="commercial"');
  });

  it("preserves Product Trial Evidence Runs as a separate destination", () => {
    const evidenceRoute = read("src/app/home/commercial/evidence-runs/index.tsx");
    const growRoute = read("src/app/home/commercial/grows/index.tsx");

    expect(evidenceRoute).toContain("CommercialEvidenceRunsScreen");
    expect(growRoute).not.toContain("CommercialEvidenceRunsScreen routeKey");
  });

  it("exposes every connected grow workspace section under Commercial", () => {
    for (const section of [
      "index",
      "plants",
      "journal",
      "tasks",
      "tools",
      "automation",
      "timeline",
      "compare"
    ]) {
      expect(
        fs.existsSync(
          path.join(
            process.cwd(),
            `src/app/home/commercial/grows/[growId]/${section}.tsx`
          )
        )
      ).toBe(true);
    }
  });
});
