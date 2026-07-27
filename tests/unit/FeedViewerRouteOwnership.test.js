const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

describe("shared Feed viewer route ownership", () => {
  test("keeps one public /feed route and separate workspace owner routes", () => {
    expect(fs.existsSync(path.join(root, "src/app/feed/index.tsx"))).toBe(true);
    expect(
      fs.existsSync(path.join(root, "src/app/(commercial)/feed/index.tsx"))
    ).toBe(false);

    expect(
      fs.readFileSync(path.join(root, "src/app/home/commercial/feed.tsx"), "utf8")
    ).toContain('import CommercialFeed from "@/app/feed"');
    expect(
      fs.readFileSync(path.join(root, "src/app/home/facility/feed.tsx"), "utf8")
    ).toContain('import FeedCampaignsRoute from "@/app/feed"');
  });
});
