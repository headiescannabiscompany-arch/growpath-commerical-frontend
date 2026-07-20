import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("personal tool ownership", () => {
  test("keeps task-producing planners in task workspaces", () => {
    const taskCenter = read("src/app/home/personal/(tabs)/tasks.tsx");
    const growTasks = read("src/app/home/personal/(tabs)/grows/[growId]/tasks.tsx");

    for (const workflow of [
      "auto-grow-calendar",
      "watering",
      "feeding-schedule",
      "topdress",
      "timeline-planner"
    ]) {
      expect(taskCenter).toContain(`"${workflow}"`);
      expect(growTasks).toContain(`"${workflow}"`);
    }
  });

  test("keeps integrations and reports in grow/profile ownership surfaces", () => {
    const grows = read("src/app/home/personal/(tabs)/grows/index.tsx");
    const growOverview = read("src/app/home/personal/(tabs)/grows/[growId]/index.tsx");
    const growTools = read("src/app/home/personal/(tabs)/grows/[growId]/tools.tsx");
    const profile = read("src/app/home/personal/(tabs)/profile/index.tsx");

    expect(grows).toContain("/home/personal/tools/integrations?growId=${id}");
    expect(grows).toContain("/home/personal/tools/pdf-export?growId=${id}");
    expect(growOverview).toContain("/home/personal/tools/integrations?growId=");
    expect(growOverview).toContain("/home/personal/tools/pdf-export?growId=");
    expect(growTools).toContain(
      '["Data integrations", "/home/personal/tools/integrations"]'
    );
    expect(growTools).toContain(
      '["Export grow report", "/home/personal/tools/pdf-export"]'
    );
    expect(profile).toContain('router.push("/home/personal/tools/pdf-export"');
  });

  test("removes small AI-facing calculators from user discovery while preserving routes", () => {
    const growPlants = read("src/app/home/personal/(tabs)/grows/[growId]/plants.tsx");
    const growTools = read("src/app/home/personal/(tabs)/grows/[growId]/tools.tsx");
    const legacyBatch = read(
      "src/app/home/personal/(tabs)/tools/soil-nutrient-batch.tsx"
    );

    expect(growPlants).not.toContain('withPlant("/home/personal/tools/vpd"');
    expect(growTools).not.toContain('["pH / EC", "/home/personal/tools/ph-ec"]');
    expect(legacyBatch).toContain(
      '<Redirect href="/home/commercial/tools/soil-nutrient-batch" />'
    );
  });
});
