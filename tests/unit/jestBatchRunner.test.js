const fs = require("fs");
const path = require("path");

describe("batched Jest CI runner", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../../scripts/run-jest-batched.cjs"),
    "utf8"
  );

  it("allows noisy test batches to exceed Node's default sync output buffer", () => {
    expect(source).toContain("JEST_CI_OUTPUT_BUFFER_MB");
    expect(source).toContain("maxBuffer: outputBufferMb * 1024 * 1024");
  });

  it("prints child-process errors instead of returning an unexplained exit code", () => {
    expect(source).toContain("[jest-batches] child process failed:");
    expect(source).toContain("result.error.message");
  });
});
