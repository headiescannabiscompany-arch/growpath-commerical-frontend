const {
  buildObservationUrl,
  candidateFromObservation,
  chooseAllowedPhoto,
  collectionModesForCase,
  createManifest,
  deriveTaxonQueries,
  parseArgs,
  replacePhotoSize
} = require("../../scripts/collect-plant-id-qa-candidates.cjs");

const caseDefinition = {
  caseId: "tomato",
  acceptedName: "Tomato",
  scientificName: "Solanum lycopersicum",
  lifeStage: "mixed",
  groupName: "foodCrops",
  expectedAlternatives: ["black nightshade", "potato"],
  distinguishingFocus: ["compound leaves", "stem hairs"]
};

function observation(overrides = {}) {
  return {
    id: 123,
    uri: "https://www.inaturalist.org/observations/123",
    quality_grade: "research",
    taxon: { id: 51737, name: "Solanum lycopersicum", rank: "species" },
    user: { login: "observer" },
    observed_on: "2026-08-01",
    captive: false,
    num_identification_agreements: 3,
    num_identification_disagreements: 1,
    owners_identification_from_vision: true,
    geojson: { type: "Point", coordinates: [-78.6, 35.8] },
    location: "35.8,-78.6",
    observation_photos: [
      {
        photo: {
          id: 456,
          license_code: "cc-by",
          attribution: "(c) Observer, some rights reserved (CC BY)",
          url: "https://inaturalist-open-data.s3.amazonaws.com/photos/456/square.jpg",
          original_dimensions: { width: 2048, height: 1536 }
        }
      }
    ],
    ...overrides
  };
}

describe("Plant ID QA candidate collector", () => {
  it("is dry-run by default and requires explicit execution for writes or resume", () => {
    expect(parseArgs([])).toEqual({
      execute: false,
      resume: false,
      replace: false,
      caseIds: []
    });
    expect(() => parseArgs(["--resume"])).toThrow(/requires --execute/i);
    expect(() => parseArgs(["--execute", "--resume", "--replace"])).toThrow(
      /choose --resume or --replace/i
    );
    expect(parseArgs(["--execute", "--case", "tomato"])).toMatchObject({
      execute: true,
      caseIds: ["tomato"]
    });
  });

  it("derives bounded taxon leads without pretending genus or family labels are species", () => {
    expect(deriveTaxonQueries("Cannabis sativa or Acer palmatum")).toEqual([
      "Cannabis sativa",
      "Acer palmatum"
    ]);
    expect(deriveTaxonQueries("Capsicum species")).toEqual(["Capsicum"]);
    expect(deriveTaxonQueries("")).toEqual([]);
  });

  it("requests research-wild observations with CC0 or CC BY photos", () => {
    const url = buildObservationUrl("Solanum lycopersicum", {
      page: 2,
      perPage: 500
    });

    expect(url.origin).toBe("https://api.inaturalist.org");
    expect(url.searchParams.get("quality_grade")).toBe("research");
    expect(url.searchParams.get("captive")).toBe("false");
    expect(url.searchParams.get("photos")).toBe("true");
    expect(url.searchParams.get("photo_license")).toBe("cc0,cc-by");
    expect(url.searchParams.get("per_page")).toBe("200");
    expect(url.searchParams.has("lat")).toBe(false);
    expect(url.searchParams.has("lng")).toBe(false);
  });

  it("requests a separate cultivated candidate stream without treating it as research grade", () => {
    const url = buildObservationUrl("Solanum lycopersicum", {
      page: 1,
      perPage: 25,
      collectionMode: "cultivated"
    });

    expect(url.searchParams.get("quality_grade")).toBe("casual");
    expect(url.searchParams.get("captive")).toBe("true");
    expect(collectionModesForCase(caseDefinition)).toEqual([
      "research_wild",
      "cultivated"
    ]);
    expect(
      collectionModesForCase({ ...caseDefinition, groupName: "weeds" })
    ).toEqual(["research_wild"]);
    expect(() =>
      buildObservationUrl("Tomato", {
        page: 1,
        perPage: 1,
        collectionMode: "unknown"
      })
    ).toThrow(/unsupported collection mode/i);
  });

  it("checks the individual photo license instead of trusting observation metadata", () => {
    const mixed = observation({
      license_code: "cc-by",
      observation_photos: [
        { photo: { id: 1, license_code: "cc-by-nc" } },
        {
          photo: {
            id: 2,
            license_code: "cc0",
            url: "https://example.test/photos/2/square.jpg"
          }
        }
      ]
    });

    expect(chooseAllowedPhoto(mixed).id).toBe(2);
    expect(
      chooseAllowedPhoto(
        observation({
          observation_photos: [{ photo: { id: 3, license_code: "cc-by-nc" } }]
        })
      )
    ).toBeUndefined();
  });

  it("creates a pending external reference and strips observation coordinates", () => {
    const source = observation({ quality_grade: "casual", captive: true });
    const candidate = candidateFromObservation({
      caseDefinition,
      observation: source,
      photo: source.observation_photos[0].photo,
      taxonQuery: "Solanum lycopersicum",
      page: 1,
      collectionMode: "cultivated"
    });

    expect(candidate).toMatchObject({
      candidateId: "inat-photo-456",
      caseId: "tomato",
      sourceId: "inaturalist",
      sourceLicenseCode: "cc-by",
      collectionMode: "cultivated",
      licenseVersionStatus: "pending_per-image_confirmation",
      reviewStatus: "pending_image_taxonomy_stage_and_rights_review",
      identityApproved: false,
      lifeStageApproved: false,
      intendedUseApproved: false,
      handling: "external_reference"
    });
    expect(candidate.mediaUrl).toContain("/original.jpg");
    expect(candidate.previewUrl).toContain("/medium.jpg");
    expect(candidate).not.toHaveProperty("geojson");
    expect(candidate).not.toHaveProperty("location");
    expect(JSON.stringify(candidate)).not.toContain("35.8");
    const wildSource = observation();
    expect(() =>
      candidateFromObservation({
        caseDefinition,
        observation: wildSource,
        photo: wildSource.observation_photos[0].photo,
        taxonQuery: "Solanum lycopersicum",
        page: 1,
        collectionMode: "cultivated"
      })
    ).toThrow(/does not match cultivated/i);
  });

  it("refuses to resume candidates against a different catalog snapshot", () => {
    expect(
      createManifest({
        catalog: {
          schemaVersion: "growpath-plant-identification-qa-v1",
          targetRecordCount: 320
        },
        catalogSha256: "catalog",
        existingManifest: null
      }).collectionProgress
    ).toEqual({});
    expect(() =>
      createManifest({
        catalog: { schemaVersion: "growpath-plant-identification-qa-v1" },
        catalogSha256: "new-catalog",
        existingManifest: {
          schemaVersion: "growpath-plant-identification-qa-candidates-v2",
          sourceId: "inaturalist",
          catalogSnapshot: { sha256: "old-catalog" },
          collectionProgress: {},
          candidates: [],
          collectionErrors: []
        }
      })
    ).toThrow(/catalog changed/i);
  });

  it("refuses blocked photo licenses and preserves supported image extensions", () => {
    const source = observation();
    expect(() =>
      candidateFromObservation({
        caseDefinition,
        observation: source,
        photo: { ...source.observation_photos[0].photo, license_code: "cc-by-nc" },
        taxonQuery: "Solanum lycopersicum",
        page: 1
      })
    ).toThrow(/blocked license/i);
    expect(replacePhotoSize("https://example.test/1/square.jpeg", "original")).toBe(
      "https://example.test/1/original.jpeg"
    );
  });

  it("keeps real catalog blockers without blocking unused permission-pending leads", () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(process.cwd(), "scripts", "verify-plant-id-qa-catalog.cjs"),
        "--allow-planning"
      ],
      { encoding: "utf8" }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"blockerCount": 46');
    expect(result.stdout).not.toMatch(/Crime Pays.*not approved/i);

    const masterResult = spawnSync(
      process.execPath,
      [
        path.join(process.cwd(), "scripts", "verify-qa-seed-system.cjs"),
        "--allow-planning"
      ],
      { encoding: "utf8" }
    );
    expect(masterResult.status).toBe(0);
    expect(masterResult.stdout).toContain('"blockerCount": 3');
    expect(masterResult.stdout).not.toMatch(/Source .* is not approved/i);
  });
});
const path = require("path");
const { spawnSync } = require("child_process");
