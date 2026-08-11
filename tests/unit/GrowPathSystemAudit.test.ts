import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

describe("GrowPath system audit decisions", () => {
  it("recognizes the current canonical compatibility and workspace routes", () => {
    execFileSync(process.execPath, ["scripts/audit-growpath-system.cjs"], {
      cwd: process.cwd(),
      stdio: "pipe"
    });

    const report = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "tmp", "scan", "growpath-system-audit.json"),
        "utf8"
      )
    );
    const decisions = report.decisionChecks;

    expect(decisions).toMatchObject({
      legacyGlobalCampaignsRedirectOnly: true,
      legacyGlobalCampaignsVisibleModule: false,
      legacyCreatePostWorkspaceRedirect: true,
      legacyCreatePostVisibleComposer: false,
      personalCommunityForumOnly: true,
      legacyPostsApiForumOnly: true,
      facilityIntegrationsRoomImport: true,
      deprecatedBusinessHelperCopyHits: []
    });
  });
});
