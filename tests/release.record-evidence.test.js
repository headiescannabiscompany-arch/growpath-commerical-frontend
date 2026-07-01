const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");

function createRecorderRoot() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "growpath-record-evidence-"));
  fs.mkdirSync(path.join(tempRoot, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "scripts", "record-release-evidence.cjs"),
    path.join(tempRoot, "scripts", "record-release-evidence.cjs")
  );
  return tempRoot;
}

function runRecorder(tempRoot, args, env = {}) {
  return spawnSync(
    process.execPath,
    [path.join(tempRoot, "scripts", "record-release-evidence.cjs"), ...args],
    {
      cwd: tempRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        GROWPATH_RELEASE_EVIDENCE_CONFIRM: "",
        GROWPATH_EVIDENCE_RECORDED_BY: "",
        ...env
      }
    }
  );
}

function latestJson(tempRoot, relDir) {
  const absolute = path.join(tempRoot, relDir);
  const files = fs.readdirSync(absolute).filter((file) => file.endsWith(".json"));
  expect(files).toHaveLength(1);
  return JSON.parse(fs.readFileSync(path.join(absolute, files[0]), "utf8"));
}

describe("release evidence recorder", () => {
  it("prints exact templates for manual evidence types", () => {
    const tempRoot = createRecorderRoot();

    const result = runRecorder(tempRoot, ["--template", "device-smoke"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      '$env:GROWPATH_RELEASE_EVIDENCE_CONFIRM="RECORD_RELEASE_EVIDENCE"'
    );
    expect(result.stdout).toContain('$env:GROWPATH_SMOKE_RESULT="passed"');
    expect(result.stdout).toContain("npm.cmd run release:record-evidence -- device-smoke");
  });

  it("refuses to write evidence without explicit confirmation", () => {
    const tempRoot = createRecorderRoot();

    const result = runRecorder(tempRoot, ["monitoring"], {
      GROWPATH_SENTRY_EVENT_URL: "https://sentry.example.com/events/1",
      GROWPATH_MONITORING_BUILD: "ios-1",
      GROWPATH_CRASH_OWNER: "Crash Owner",
      GROWPATH_TRIAGE_SLA: "next business day"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Refusing to write release evidence/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/monitoring-validation"))).toBe(false);
  });

  it("rejects non-affirmative store submission confirmations", () => {
    const tempRoot = createRecorderRoot();

    const result = runRecorder(tempRoot, ["store-submission"], {
      GROWPATH_RELEASE_EVIDENCE_CONFIRM: "RECORD_RELEASE_EVIDENCE",
      GROWPATH_IOS_APP_RECORD_CONFIRMED: "yes",
      GROWPATH_ANDROID_APP_RECORD_CONFIRMED: "no",
      GROWPATH_IOS_PRIVACY_NUTRITION_COMPLETED: "yes",
      GROWPATH_GOOGLE_DATA_SAFETY_COMPLETED: "yes",
      GROWPATH_STORE_PRICING_CONFIRMED: "yes",
      GROWPATH_REVIEW_NOTES_CONFIRMED: "yes"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/GROWPATH_ANDROID_APP_RECORD_CONFIRMED must be yes/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/store-submission"))).toBe(false);
  });

  it("rejects device smoke evidence unless the result is passed", () => {
    const tempRoot = createRecorderRoot();

    const result = runRecorder(tempRoot, ["device-smoke"], {
      GROWPATH_RELEASE_EVIDENCE_CONFIRM: "RECORD_RELEASE_EVIDENCE",
      GROWPATH_SMOKE_TESTER: "QA Owner",
      GROWPATH_IOS_DEVICE: "iPhone",
      GROWPATH_ANDROID_DEVICE: "Pixel",
      GROWPATH_IOS_BUILD: "ios-1",
      GROWPATH_ANDROID_BUILD: "android-1",
      GROWPATH_SMOKE_RESULT: "failed"
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/GROWPATH_SMOKE_RESULT must equal passed/);
    expect(fs.existsSync(path.join(tempRoot, "tmp/spec/release-device-smoke"))).toBe(false);
  });

  it("writes approved owner evidence with recordedBy and values", () => {
    const tempRoot = createRecorderRoot();

    const result = runRecorder(tempRoot, ["owners"], {
      GROWPATH_RELEASE_EVIDENCE_CONFIRM: "RECORD_RELEASE_EVIDENCE",
      GROWPATH_EVIDENCE_RECORDED_BY: "release-machine-1",
      GROWPATH_RELEASE_OWNER: "Release Owner",
      GROWPATH_QA_OWNER: "QA Owner",
      GROWPATH_SUPPORT_OWNER: "Support Owner",
      GROWPATH_CRASH_OWNER: "Crash Owner",
      GROWPATH_RELEASE_MONITORING_OWNER: "Monitoring Owner",
      GROWPATH_TRIAGE_SLA: "next business day"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Recorded owners release evidence/);

    const body = latestJson(tempRoot, "tmp/spec/release-owners");
    expect(body).toEqual(
      expect.objectContaining({
        status: "approved",
        type: "owners",
        recordedBy: "release-machine-1",
        values: expect.objectContaining({
          GROWPATH_RELEASE_OWNER: "Release Owner",
          GROWPATH_QA_OWNER: "QA Owner",
          GROWPATH_SUPPORT_OWNER: "Support Owner",
          GROWPATH_CRASH_OWNER: "Crash Owner",
          GROWPATH_RELEASE_MONITORING_OWNER: "Monitoring Owner",
          GROWPATH_TRIAGE_SLA: "next business day"
        })
      })
    );
    expect(typeof body.recordedAt).toBe("string");
  });
});
