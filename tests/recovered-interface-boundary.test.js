const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  assertCompleteHistory,
  verifyRedesignAncestry
} = require("../scripts/verify-recovered-interface-boundary.cjs");

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout || "git failed").trim());
  }
  return result.stdout.trim();
}

function createHistory() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-interface-guard-"));
  git(cwd, ["init"]);
  git(cwd, ["config", "user.email", "interface-guard@example.invalid"]);
  git(cwd, ["config", "user.name", "GrowPath Interface Guard"]);

  fs.writeFileSync(path.join(cwd, "README.md"), "recovered interface\n");
  git(cwd, ["add", "README.md"]);
  git(cwd, ["commit", "-m", "recovered interface"]);

  fs.writeFileSync(path.join(cwd, "redesign.txt"), "rejected redesign\n");
  git(cwd, ["add", "redesign.txt"]);
  git(cwd, ["commit", "-m", "rejected redesign"]);
  const redesignSha = git(cwd, ["rev-parse", "HEAD"]);

  git(cwd, ["revert", "--no-edit", redesignSha]);
  const revertSha = git(cwd, ["rev-parse", "HEAD"]);

  return { cwd, redesignSha, revertSha };
}

describe("recovered interface ancestry guard", () => {
  let history;

  beforeAll(() => {
    history = createHistory();
  });

  afterAll(() => {
    fs.rmSync(history.cwd, { force: true, recursive: true });
  });

  it("rejects a branch containing the redesign without the exact revert", () => {
    git(history.cwd, ["switch", "--detach", history.redesignSha]);

    expect(() =>
      verifyRedesignAncestry({
        cwd: history.cwd,
        rejectedRedesignSha: history.redesignSha,
        exactRevertSha: history.revertSha
      })
    ).toThrow(/without its reviewed exact revert/);
  });

  it("allows the redesign ancestry only after the exact revert", () => {
    git(history.cwd, ["switch", "--detach", history.revertSha]);

    expect(() =>
      verifyRedesignAncestry({
        cwd: history.cwd,
        rejectedRedesignSha: history.redesignSha,
        exactRevertSha: history.revertSha
      })
    ).not.toThrow();
  });

  it("fails closed when the repository history is shallow", () => {
    const shallow = createHistory();
    try {
      fs.writeFileSync(
        path.join(shallow.cwd, ".git", "shallow"),
        `${shallow.redesignSha}\n`
      );
      expect(() => assertCompleteHistory({ cwd: shallow.cwd })).toThrow(
        /requires complete Git history/
      );
    } finally {
      fs.rmSync(shallow.cwd, { force: true, recursive: true });
    }
  });

  it("fails closed when a pinned ancestry object is unavailable", () => {
    expect(() =>
      verifyRedesignAncestry({
        cwd: history.cwd,
        rejectedRedesignSha: "f".repeat(40),
        exactRevertSha: history.revertSha
      })
    ).toThrow(/Fetch the complete Git history/);
  });

  it("keeps the guard and complete history wired into release workflows", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
    );
    const ci = fs.readFileSync(
      path.join(__dirname, "..", ".github", "workflows", "ci.yml"),
      "utf8"
    );
    const productionPreflight = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        ".github",
        "workflows",
        "production-build-preflight.yml"
      ),
      "utf8"
    );

    expect(packageJson.scripts.guard).toContain("npm run guard:recovered-interface");
    expect(ci).toMatch(/fetch-depth:\s*0/);
    expect(productionPreflight).toMatch(/fetch-depth:\s*0/);
  });
});
