import fs from "fs";
import path from "path";

function loadFixture() {
  const file = path.join(
    process.cwd(),
    "tests",
    "fixtures",
    "external-source-smoke.json"
  );
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

describe("external source smoke fixture", () => {
  it("keeps the user-provided GrowDiaries profile as an external-only source", () => {
    const fixture = loadFixture();
    const source = fixture.sources.find(
      (item: any) => item.id === "headies-growdiaries-profile"
    );

    expect(source).toMatchObject({
      provider: "GrowDiaries",
      sourceType: "grower_profile",
      sourceUrl: "https://growdiaries.com/grower/headies",
      sourceLink: "https://growdiaries.com/grower/headies",
      photoPolicy: "external_link_only",
      rightsMode: "external_link_only",
      copyOrRehostPhotos: false
    });
    expect(source).not.toHaveProperty("uploadedAssetUri");
    expect(source).not.toHaveProperty("localFilePath");
  });
});
