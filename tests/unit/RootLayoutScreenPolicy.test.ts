import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Root layout screen accessibility policy", () => {
  it("enables screen detachment so inactive web tabs leave the focus order", () => {
    const layout = read("src/app/_layout.tsx");

    expect(layout).toContain('import { enableScreens } from "react-native-screens";');
    expect(layout).toContain("enableScreens(true);");
  });
});
