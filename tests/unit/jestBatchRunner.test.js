const fs = require("fs");
const path = require("path");
const vm = require("vm");

describe("batched Jest CI runner", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../../scripts/run-jest-batched.cjs"),
    "utf8"
  );
  const frontendConfig = require("../../jest.config.cjs");
  const backendConfig = require("../../jest.backend.config.cjs");

  it("excludes archived and tool-owned worktrees from both Jest projects", () => {
    const repositoryRoot = path.resolve(__dirname, "../..");

    for (const config of [frontendConfig, backendConfig]) {
      const patterns = [
        ...(config.testPathIgnorePatterns || []),
        ...(config.modulePathIgnorePatterns || [])
      ];

      for (const directory of [".artifacts", ".tools"]) {
        const candidate = path.join(
          repositoryRoot,
          directory,
          "nested",
          "example.test.js"
        );
        expect(
          patterns.some((pattern) => {
            if (pattern.startsWith("<rootDir>")) {
              return candidate
                .replace(/\\/g, "/")
                .startsWith(
                  pattern.replace("<rootDir>", repositoryRoot.replace(/\\/g, "/"))
                );
            }
            return new RegExp(pattern).test(candidate);
          })
        ).toBe(true);
      }
    }
  });

  it("allows noisy test batches to exceed Node's default sync output buffer", () => {
    expect(source).toContain("JEST_CI_OUTPUT_BUFFER_MB");
    expect(source).toContain("maxBuffer: outputBufferMb * 1024 * 1024");
  });

  it("prints child-process errors instead of returning an unexplained exit code", () => {
    expect(source).toContain("[jest-batches] child process failed:");
    expect(source).toContain("result.error.message");
    expect(source).toContain("reportBatchFailure(result");
    expect(source).toContain("status=${String(result.status)}");
  });

  it("keeps passing batch logs concise and expands output only for failures", () => {
    expect(source).toContain("{ echo: false }");
    expect(source).toContain("✓ Jest batch ${batchNumber}/${totalBatches} passed");
    expect(source).toContain("if (result.stdout) process.stdout.write(result.stdout)");
  });

  function simulateRun({ collectFailures = false, statuses = [], listStatus = 0 } = {}) {
    const exitSignal = {};
    const output = [];
    let exitCode = 0;
    let calls = 0;
    const testPaths = [
      "/repo/ContentMarketplaceScreen.test.tsx",
      "/repo/one.test.js",
      "/repo/two.test.js"
    ];
    const spawnSync = jest.fn(() => {
      calls += 1;
      if (calls === 1) {
        return { status: listStatus, stdout: JSON.stringify(testPaths), stderr: "" };
      }
      return { status: statuses[calls - 2] ?? 0, stdout: "", stderr: "" };
    });
    try {
      vm.runInNewContext(source, {
        __dirname: "/repo/scripts",
        require: (name) => (name === "child_process" ? { spawnSync } : require(name)),
        console: {
          log: (message) => output.push(message),
          error: (message) => output.push(message)
        },
        process: {
          execPath: "node",
          env: {
            JEST_CI_BATCH_SIZE: "1",
            JEST_CI_LANES: "1",
            JEST_CI_COLLECT_FAILURES: collectFailures ? "1" : "0"
          },
          stdout: { write: () => {} },
          stderr: { write: () => {} },
          exit: (code) => {
            exitCode = code;
            throw exitSignal;
          }
        }
      });
    } catch (error) {
      if (error !== exitSignal) throw error;
    }
    return { exitCode, calls, output };
  }

  it("collects solo and regular batch failures but still exits unsuccessfully", () => {
    const result = simulateRun({ collectFailures: true, statuses: [1, 2, 0] });
    expect(result.calls).toBe(4);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("[jest-batches] 2/3 batches failed: 1, 2");
    expect(result.output.filter((line) => line.startsWith("✓"))).toEqual([
      "✓ Jest batch 3/3 passed"
    ]);
  });

  it("keeps fail-fast behavior unless failure collection is explicitly enabled", () => {
    const result = simulateRun({ statuses: [2, 0, 0] });
    expect(result.calls).toBe(2);
    expect(result.exitCode).toBe(2);
  });

  it("succeeds only when every collected batch passes", () => {
    const result = simulateRun({ collectFailures: true });
    expect(result.calls).toBe(4);
    expect(result.exitCode).toBe(0);
    expect(result.output.filter((line) => line.startsWith("✓"))).toHaveLength(3);
  });

  it("stops immediately if test discovery fails even in collection mode", () => {
    const result = simulateRun({ collectFailures: true, listStatus: 3 });
    expect(result.calls).toBe(1);
    expect(result.exitCode).toBe(3);
  });
});
