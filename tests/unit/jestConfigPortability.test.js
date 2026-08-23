const path = require("node:path");

const config = require("../../jest.config.cjs");

describe("Jest configuration portability", () => {
  it("discovers tests without embedding the absolute worktree path in globs", () => {
    expect(config.testMatch).toEqual([
      "**/__tests__/**/*.(test|spec).[jt]s?(x)",
      "**/*.(test|spec).[jt]s?(x)"
    ]);
    expect(config.testMatch.every((pattern) => !pattern.includes("<rootDir>"))).toBe(
      true
    );
  });

  it("ignores nested directories using slash-independent absolute patterns", () => {
    const ignoredNodeModule = path.join(
      path.resolve(__dirname, "../.."),
      "node_modules",
      "example",
      "index.js"
    );
    const ignoredBackendTest = path.join(
      path.resolve(__dirname, "../.."),
      "backend",
      "tests",
      "example.test.js"
    );

    expect(
      config.testPathIgnorePatterns.some((pattern) =>
        new RegExp(pattern).test(ignoredNodeModule)
      )
    ).toBe(true);
    expect(
      config.testPathIgnorePatterns.some((pattern) =>
        new RegExp(pattern).test(ignoredBackendTest)
      )
    ).toBe(true);
  });
});
