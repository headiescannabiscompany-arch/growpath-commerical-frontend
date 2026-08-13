import { searchHref } from "@/app/search";

describe("Search web route mapping", () => {
  it("maps shared and workspace-specific destinations to canonical web routes", () => {
    expect(searchHref("Storefront", "personal")).toBe("/store");
    expect(searchHref("Feed", "commercial")).toBe("/feed");
    expect(searchHref("Tools", "personal")).toBe("/home/personal/tools");
    expect(searchHref("Tools", "commercial")).toBe("/home/commercial/tools");
    expect(searchHref("Tools", "facility")).toBe("/home/facility/ai-tools");
    expect(searchHref("Forum", "commercial")).toBe("/home/commercial/community");
    expect(searchHref("Plants", "facility")).toBe("/home/facility/grows");
    expect(searchHref("Subscription", "personal")).toBe("/offers");
  });
});
