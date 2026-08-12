const fs = require("fs");
const path = require("path");

describe("connected workflow verifier", () => {
  it("creates the production export instead of requiring a pre-existing dist bundle", () => {
    const verifier = fs.readFileSync(
      path.resolve(__dirname, "../../scripts/verify-connected-workflows.cjs"),
      "utf8"
    );

    expect(verifier).toContain('args: ["run", "export:web:production"]');
    expect(verifier).not.toContain(
      '{ label: "production web export", command: npmCmd, args: ["run", "build"] }'
    );
  });
});
