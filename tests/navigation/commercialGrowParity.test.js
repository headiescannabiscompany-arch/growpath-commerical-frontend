import fs from "fs";
import path from "path";

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("Commercial crop-aware grow parity", () => {
  it("keeps Commercial grows distinct from product trial evidence runs", () => {
    const source = read("src/app/home/commercial/_layout.tsx");

    expect(source).toMatch(/name="grows\/new"[\s\S]*?title: "Create Grow"/);
    expect(source).toMatch(/name="grows\/\[growId\]"[\s\S]*?title: "Grow Workspace"/);
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

  it("passes an explicit Commercial workspace into every shared grow screen", () => {
    const wrappers = {
      index: "GrowOverviewScreen",
      plants: "GrowPlantsScreen",
      journal: "GrowJournalScreen",
      tasks: "GrowTasksScreen",
      timeline: "GrowTimelineScreen",
      tools: "GrowToolsScreen",
      compare: "GrowCompareScreen"
    };

    for (const [section, screen] of Object.entries(wrappers)) {
      const source = read(`src/app/home/commercial/grows/[growId]/${section}.tsx`);
      expect(source).toContain(`<${screen} workspace="commercial" />`);
    }
  });

  it("uses Commercial-scoped read and write adapters instead of Personal APIs", () => {
    const adapter = read("src/features/grows/workspaceData.ts");
    const sharedScreens = [
      "src/app/home/personal/(tabs)/grows/index.tsx",
      "src/app/home/personal/(tabs)/grows/new.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/index.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/plants.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/journal.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/tasks.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/timeline.tsx",
      "src/app/home/personal/(tabs)/grows/[growId]/tools.tsx",
      "src/app/home/personal/(tabs)/logs/new.tsx"
    ]
      .map(read)
      .join("\n");

    expect(adapter).toContain('"/api/commercial/grows"');
    expect(adapter).toContain('workspaceType: "commercial"');
    expect(adapter).toContain("listWorkspaceLogs(workspace, growId)");
    expect(adapter).toContain("listWorkspaceTasks(workspace, growId)");
    expect(adapter).toContain('commercialGrowChildPath(growId, "plants")');
    expect(adapter).toContain('commercialGrowChildPath(data.growId, "plants")');
    expect(adapter).toContain('commercialGrowChildPath(growId, "logs")');
    expect(adapter).toContain('commercialGrowChildPath(data.growId, "logs")');
    expect(adapter).toContain('commercialGrowChildPath(growId, "tasks")');
    expect(adapter).toContain('commercialGrowChildPath(data.growId, "tasks")');
    expect(adapter).toContain('commercialGrowChildPath(growId, "tasks", taskId)');
    expect(adapter).toContain('{ method: "DELETE" }');
    expect(adapter).not.toContain("plants: [...commercialPlants");
    expect(adapter).not.toContain("logs: [...commercialLogs");
    expect(adapter).not.toContain("tasks: [...commercialTasks");
    expect(adapter).not.toContain("updateWorkspaceGrow(workspace, growId, { tasks:");
    expect(adapter).not.toContain("endpoints.logsGlobal");
    expect(adapter).not.toContain("endpoints.tasksGlobal");
    expect(adapter).not.toContain("endpoints.taskGlobal");
    expect(adapter).toContain('listToolRuns({ growId, workspaceType: "commercial" })');
    expect(sharedScreens).toContain("createWorkspaceGrow(workspace");
    expect(sharedScreens).toContain("createWorkspacePlant(workspace");
    expect(sharedScreens).toContain("createWorkspaceLog(workspace");
    expect(sharedScreens).toContain("createWorkspaceTask(workspace");
    expect(sharedScreens).toMatch(/updateWorkspaceTask\(\s*workspace/);
    expect(sharedScreens).toMatch(/deleteWorkspaceTask\(\s*workspace/);
    expect(sharedScreens).toContain("workspaceType: workspace");
  });

  it("keeps Commercial automation on explicit Commercial policy operations", () => {
    const automation = read("src/app/home/commercial/grows/[growId]/automation.tsx");
    const sharedAutomation = read(
      "src/app/home/personal/(tabs)/grows/[growId]/automation.tsx"
    );
    const automationApi = read("src/api/automation.ts");
    const nav = read("src/components/personal/GrowWorkspaceNav.tsx");

    expect(nav).toContain('{ key: "automation", label: "Automation" }');
    expect(automation).toContain("@/app/home/personal/(tabs)/grows/[growId]/automation");
    expect(automation).toContain('workspace="commercial"');
    expect(automation).not.toMatch(/createPersonalAutomation|updatePersonalAutomation/);
    expect(sharedAutomation).toContain("createCommercialAutomationPolicy");
    expect(sharedAutomation).toContain("updateCommercialAutomationPolicy");
    expect(sharedAutomation).toContain("deleteCommercialAutomationPolicy");
    expect(sharedAutomation).toContain("testCommercialAutomationPolicy");
    expect(sharedAutomation).toContain('scope: "grow"');
    expect(automationApi).toContain('workspaceType: "commercial"');
    expect(automationApi).toContain("?workspaceType=commercial");
  });

  it("keeps Commercial tool-run source links and write actions Commercial-scoped", () => {
    const savedRunsAlias = read("src/app/home/commercial/tools/saved-runs.tsx");
    const ipmAlias = read("src/app/home/commercial/tools/ipm-scout.tsx");
    const sharedSavedRuns = read("src/app/home/personal/(tabs)/tools/saved-runs.tsx");
    const routeBuilder = read("src/features/personal/tools/savedRunRoutes.ts");
    const comparison = read("src/features/personal/tools/RunComparisonWorkspace.tsx");

    expect(savedRunsAlias).toContain('workspaceTypeOverride="commercial"');
    expect(ipmAlias).toContain('workspaceType="commercial"');
    expect(sharedSavedRuns).toContain("workspaceTypeOverride ||");
    expect(sharedSavedRuns).toContain("getEvidenceSourceMetadata(evidenceId, {");
    expect(sharedSavedRuns).toContain(
      "await updateToolRun(id, locationPatch, toolRunScope)"
    );
    expect(routeBuilder).toContain('workspaceType === "commercial"');
    expect(routeBuilder).toContain("${basePath}/tools/saved-runs?");
    expect(comparison).toContain('workspaceType: "commercial"');
    expect(comparison).toContain("listWorkspaceGrows(workspace)");
    expect(comparison).toContain("createTaskFromToolRun(");
  });

  it("routes Commercial grow sources and actions within the Commercial workspace", () => {
    const sourceLinks = read("src/utils/sourceLinks.ts");
    const growTools = read("src/app/home/personal/(tabs)/grows/[growId]/tools.tsx");

    expect(sourceLinks).toContain("/home/commercial/grows/${encoded(sourceId)}");
    expect(sourceLinks).toContain("/home/commercial/tools/diagnose");
    expect(sourceLinks).toContain("/home/commercial/tools/saved-runs");
    expect(growTools).toContain("workspaceGrowToolHref(path, growId, workspace)");
    expect(growTools).toContain("{ workspaceType: workspace }");
    expect(growTools).toContain('if (workspace === "commercial")');
    expect(growTools).toContain("createWorkspaceLog(workspace");
    expect(growTools).toContain("createWorkspaceTask(workspace");
  });

  it("keeps grow journal, integration, and report actions inside Commercial", () => {
    const overview = read("src/app/home/personal/(tabs)/grows/[growId]/index.tsx");
    const journal = read("src/app/home/commercial/grows/[growId]/journal.tsx");
    const newLog = read("src/app/home/commercial/logs/new.tsx");
    const integrations = read("src/app/home/commercial/tools/integrations.tsx");

    expect(overview).toContain(
      "href={`${basePath}/logs/new?growId=${encodeURIComponent(growId)}`}"
    );
    expect(overview).toContain(
      "href={`${basePath}/tools/integrations?growId=${encodeURIComponent(growId)}`}"
    );
    expect(overview).toContain(
      'basePath === "/home/commercial" ? "report" : "pdf-export"'
    );
    expect(journal).toContain('<GrowJournalScreen workspace="commercial" />');
    expect(newLog).toContain('<NewLogScreen workspace="commercial" />');
    expect(integrations).toContain('backFallbackHref="/home/commercial/grows"');
  });

  it("keeps post-create journal and lifecycle planning in the active workspace", () => {
    const createGrow = read("src/app/home/personal/(tabs)/grows/new.tsx");
    const commercialCalendar = read(
      "src/app/home/commercial/tools/auto-grow-calendar.tsx"
    );

    expect(createGrow).toContain(
      "`${basePath}/logs/new?growId=${encodeURIComponent(createdGrowId)}`"
    );
    expect(createGrow).toContain("`${basePath}/tools/auto-grow-calendar?${");
    expect(commercialCalendar).toContain(
      "@/app/home/personal/(tabs)/tools/auto-grow-calendar"
    );
    expect(commercialCalendar).toContain('workspaceType="commercial"');
  });

  it("passes Commercial scope into every shared grow-aware tool alias", () => {
    for (const route of [
      "auto-grow-calendar",
      "dry-amendment-mix",
      "environment",
      "history-import",
      "integrations",
      "npk",
      "report",
      "soil-builder"
    ]) {
      const source = read(`src/app/home/commercial/tools/${route}.tsx`);
      expect(source).toContain('workspaceType="commercial"');
      expect(source).not.toContain('workspaceType="personal"');
    }
    const soilBatch = read("src/app/home/personal/(tabs)/tools/soil-nutrient-batch.tsx");
    expect(soilBatch).toMatch(
      /CommercialSoilNutrientBatchToolRoute[\s\S]*?workspaceTypeOverride="commercial"/
    );
  });
});
