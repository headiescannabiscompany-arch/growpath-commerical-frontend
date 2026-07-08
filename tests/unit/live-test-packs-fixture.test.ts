import fs from "fs";
import path from "path";

function loadFixture() {
  const file = path.join(
    process.cwd(),
    "tests",
    "fixtures",
    "growpath-live-test-packs.json"
  );
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

describe("growpath live test packs fixture", () => {
  it("covers single-user, commercial, and facility workflows", () => {
    const fixture = loadFixture();
    const accountTypes = fixture.packs.map((pack: any) => pack.accountType);

    expect(accountTypes).toEqual(
      expect.arrayContaining(["personal", "commercial", "facility"])
    );
  });

  it("keeps verified GrowPathAI feature counts tied to named workflow checks", () => {
    const fixture = loadFixture();

    expect(fixture.packs.some((pack: any) => pack.featureTestCount > 0)).toBe(true);
    for (const pack of fixture.packs) {
      expect(pack.featureTestCount).toBe(pack.growPathAIFeaturesTested.length);
      if (pack.featureTestCount > 0) {
        expect(pack.growPathAIFeaturesTested.every(Boolean)).toBe(true);
      }
    }
  });

  it("keeps third-party photo sources external only", () => {
    const fixture = loadFixture();
    expect(fixture.rightsPolicy.copyOrRehostPhotos).toBe(false);
    expect(fixture.rightsPolicy.photoHandling).toBe("external_link_only");

    const externalLogs = fixture.packs
      .flatMap((pack: any) => pack.weeklyLogs || [])
      .filter((log: any) => log.sourcePhotoUrl);

    expect(externalLogs.length).toBeGreaterThan(0);
    for (const log of externalLogs) {
      expect(log.photoPolicy).toBe("external_link_only");
      expect(log.sourceLink).toContain("TODO_PASTE_GROWDIARIES");
      expect(log.photoSourceLink).toContain("TODO_SOURCE");
      expect(log).not.toHaveProperty("uploadedAssetUri");
      expect(log).not.toHaveProperty("localFilePath");
    }
  });

  it("marks source attribution fields for the GrowDiaries pack", () => {
    const fixture = loadFixture();
    const pack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );

    expect(pack).toBeTruthy();
    expect(pack.source).toMatchObject({
      provider: "GrowDiaries",
      rightsMode: "external_link_only",
      attributionRequired: true
    });
    expect(pack.source.sourceUrl).toContain("TODO_PASTE_GROWDIARIES");
    expect(pack.source.photoSetUrl).toContain("TODO_PASTE_GROWDIARIES");
    expect(pack.source.sourceLink).toContain("TODO_PASTE_GROWDIARIES");
    expect(pack.source.photoSourceLink).toContain("TODO_PASTE_GROWDIARIES");
  });

  it("separates real grow data from photo/source metadata", () => {
    const fixture = loadFixture();

    for (const pack of fixture.packs) {
      expect(pack.realGrowData).toBeTruthy();
      expect(pack.realGrowData.normalizedRecords).toBeTruthy();
    }

    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    expect(growDiariesPack.realGrowData.doNotInventMissingValues).toBe(true);
    expect(growDiariesPack.realGrowData.sourceRequiredBeforeSeeding).toBe(true);
    expect(growDiariesPack.realGrowData.normalizedRecords.harvest).toMatchObject({
      harvestDate: "TODO_EXTRACT_FROM_SOURCE",
      harvestDay: 73,
      dryWeight: 236,
      dryWeightUnit: "g",
      plantCount: 1,
      growAreaM2: 0.36,
      yieldPerM2: 655.56,
      tasteNotes: ["diesel", "earthy", "mint"]
    });

    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    expect(commercialPack.realGrowData.normalizedRecords).toMatchObject({
      grow: {
        cropType: "tomato",
        cultivars: ["Sunviva", "Primabella"],
        environment: "outdoor"
      },
      cropTrial: {
        purpose: "cultivar_comparison"
      },
      commercialCropSummary: "TODO_EXTRACT_FROM_SOURCE"
    });
  });

  it("tracks germination separately from later grow and harvest data", () => {
    const fixture = loadFixture();

    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    expect(growDiariesPack.realGrowData.fieldsToExtractFromSource).toEqual(
      expect.arrayContaining([
        "germinationDate",
        "germinationMethod",
        "daysToSprout",
        "seedlingVigor"
      ])
    );
    expect(
      growDiariesPack.realGrowData.normalizedRecords.plants[0].germination
    ).toMatchObject({
      germinationDate: "TODO_EXTRACT_FROM_SOURCE",
      germinationMethod: "paper_towel",
      daysToSprout: "TODO_EXTRACT_FROM_SOURCE",
      sourceLink: expect.stringContaining("TODO_PASTE_GROWDIARIES"),
      photoSourceLink: expect.stringContaining("TODO_SOURCE_GERMINATION")
    });

    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    expect(commercialPack.realGrowData.normalizedRecords.germination.tracked).toBe(true);
    expect(commercialPack.realGrowData.normalizedRecords.germination).toMatchObject({
      germinationRate: "TODO_EXTRACT_FROM_SOURCE"
    });
    expect(facilityPack.realGrowData.normalizedRecords.cloneBatch.tracked).toBe(true);
    expect(facilityPack.realGrowData.normalizedRecords.cloneBatch).toMatchObject({
      cultivar: "MAC1",
      clonesTaken: 16,
      plantCount: 8,
      selectedCount: 8,
      selectionCriteria: "most_uniform",
      startMedium: "rockwool_cube",
      uniformityNotes: "16 clones taken; 8 most uniform selected."
    });
  });

  it("defines the commercial pack as a non-cannabis outdoor tomato cultivar trial", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );

    expect(commercialPack).toMatchObject({
      id: "commercial-non-cannabis-tomatoes-sunviva-primabella-outdoor",
      title: "Tomatoes Sunviva / Primabella Outdoor",
      source: {
        provider: "GrowDiaries",
        sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
        photoSourceLink:
          "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_PHOTO_PAGE_URL",
        rightsMode: "external_link_only"
      },
      business: {
        businessType: "garden_center_or_crop_producer"
      },
      workflow: {
        cropBatch: "Sunviva / Primabella Outdoor Tomato Trial",
        cropType: "tomato",
        cultivars: ["Sunviva", "Primabella"],
        environment: "outdoor"
      },
      realGrowData: {
        dataConfidence: "source_pending",
        doNotInventMissingValues: true,
        sourceRequiredBeforeSeeding: true
      },
      weeklyLogs: expect.arrayContaining([
        expect.objectContaining({
          week: 0,
          stage: "germination"
        })
      ])
    });
    expect(commercialPack.workflow.requiredEvidence).toEqual(
      expect.arrayContaining([
        "crop batch creation",
        "cultivar comparison",
        "germination rate",
        "seedling propagation",
        "transplanting",
        "outdoor hardening",
        "soil/input comparison",
        "supplier issue notes",
        "harvest count",
        "recovery tracking"
      ])
    );
  });

  it("marks commercial tomato week 0 as a user-confirmed germination stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekZero = commercialPack.weeklyLogs.find((log: any) => log.week === 0);

    expect(weekZero).toMatchObject({
      stage: "germination",
      stageConfirmedByUser: true,
      germinationMethod: "direct_substrate",
      cultivarGermination: [
        {
          cultivar: "Sunviva",
          germinated: 6,
          started: 6,
          germinationRatePercent: 100
        },
        {
          cultivar: "Primabella",
          germinated: 5,
          started: 6,
          germinationRatePercent: 83.33
        }
      ],
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_0_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_0_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 1,
      realGrowDataStatus: "user_confirmed_germination",
      testFocus: [
        "crop start",
        "germination",
        "cultivar comparison",
        "direct substrate",
        "germination rate"
      ],
      plannedFeatureCoverage: [
        "Crop start",
        "Commercial germination record",
        "Cultivar comparison",
        "Germination rate",
        "Source-backed weekly log"
      ]
    });
    expect(weekZero.photos).toHaveLength(1);
    expect(weekZero.photos[0]).toMatchObject({
      index: 1,
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_0_PHOTO_1_URL",
      photoPolicy: "external_link_only"
    });
    expect(weekZero.photos[0]).not.toHaveProperty("uploadedAssetUri");
    expect(weekZero.photos[0]).not.toHaveProperty("localFilePath");
  });

  it("marks commercial tomato week 1 as a user-confirmed seedling stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekOne = commercialPack.weeklyLogs.find((log: any) => log.week === 1);

    expect(weekOne).toMatchObject({
      stage: "seedling",
      stageConfirmedByUser: true,
      plantHeightCm: 2,
      lightHours: 16,
      rhPercent: 70,
      wateringLiters: 0.05,
      lampDistanceCm: 40,
      co2Ppm: 800,
      vpdKpa: 0.8,
      ppfd: 200,
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_1_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_1_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 6,
      realGrowDataStatus: "user_confirmed_seedling_environment",
      testFocus: [
        "seedling",
        "seedling propagation",
        "propagation dashboard",
        "VPD",
        "seedling photo log",
        "PPFD",
        "cultivar comparison",
        "commercial propagation environment"
      ],
      plannedFeatureCoverage: [
        "Propagation dashboard",
        "Commercial seedling record",
        "Seedling propagation",
        "VPD tracking",
        "Seedling photo log",
        "PPFD tracking",
        "CO2 tracking",
        "Cultivar comparison",
        "Source-backed weekly log"
      ]
    });
    expect(weekOne.photos).toHaveLength(6);
    for (const photo of weekOne.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_1_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 2 as a user-confirmed veg stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekTwo = commercialPack.weeklyLogs.find((log: any) => log.week === 2);

    expect(weekTwo).toMatchObject({
      stage: "veg",
      stageConfirmedByUser: true,
      plantHeightCm: 5,
      lightHours: 16,
      tempC: 19,
      rhPercent: 60,
      inputs: [
        {
          name: "Root Juice",
          doseMlPerL: 2
        }
      ],
      ppfd: 300,
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_2_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_2_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 4,
      realGrowDataStatus: "user_confirmed_veg_growth",
      testFocus: [
        "veg",
        "Root Juice",
        "nutrient log",
        "growth rate",
        "PPFD",
        "cultivar comparison",
        "cultivar notes",
        "product trial crop growth"
      ],
      plannedFeatureCoverage: [
        "Commercial veg record",
        "Nutrient log",
        "Growth rate",
        "Input tracking",
        "PPFD tracking",
        "Cultivar comparison",
        "Cultivar notes",
        "Product trial crop growth tracking",
        "Source-backed weekly log"
      ]
    });
    expect(weekTwo.photos).toHaveLength(4);
    for (const photo of weekTwo.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_2_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 3 as a user-confirmed veg selection stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekThree = commercialPack.weeklyLogs.find((log: any) => log.week === 3);

    expect(weekThree).toMatchObject({
      stage: "veg / selection",
      stageConfirmedByUser: true,
      plantHeightCm: 10,
      lightHours: 18,
      tempC: 19,
      rhPercent: 60,
      selection: {
        startingPlantCount: 11,
        selectedPlantCount: 6,
        note: "Plants reduced from 11 to 6."
      },
      stressCorrection: {
        issue: "wind stress from fan",
        corrected: true,
        note: "Wind stress from fan corrected."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_3_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_3_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 4,
      realGrowDataStatus: "user_confirmed_selection",
      testFocus: [
        "veg",
        "selection",
        "plant selection",
        "plant count reduction",
        "wind stress correction",
        "AI stress diagnosis",
        "fan task",
        "cultivar comparison",
        "product trial crop growth"
      ],
      plannedFeatureCoverage: [
        "Commercial veg record",
        "Selection workflow",
        "Plant selection",
        "Plant count tracking",
        "AI stress diagnosis",
        "Stress correction",
        "Fan task",
        "Cultivar comparison",
        "Source-backed weekly log"
      ]
    });
    expect(weekThree.photos).toHaveLength(4);
    for (const photo of weekThree.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_3_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 4 as a user-confirmed veg pruning stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekFour = commercialPack.weeklyLogs.find((log: any) => log.week === 4);

    expect(weekFour).toMatchObject({
      stage: "veg / pruning",
      stageConfirmedByUser: true,
      cultivarMeasurements: [
        {
          cultivar: "Sunviva",
          plantHeightCmApprox: 30
        },
        {
          cultivar: "Primabella",
          plantHeightCmApprox: 15
        }
      ],
      pruningEvents: [
        {
          type: "side_shoot_removal",
          completed: true,
          notes: "Side shoots removed."
        }
      ],
      wateringLitersTotal: 1.5,
      ph: 6.5,
      inputs: [
        {
          name: "Root Juice"
        },
        {
          name: "Epsom salt"
        }
      ],
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_4_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_4_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 4,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "veg",
        "pruning",
        "side shoot removal",
        "suckering task",
        "cultivar height comparison",
        "cultivar morphology",
        "watering log",
        "pH log",
        "input tracking",
        "cultivar comparison",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Commercial veg record",
        "Pruning log",
        "Pruning/suckering task",
        "Side shoot removal",
        "Cultivar height comparison",
        "Cultivar morphology",
        "Watering log",
        "pH log",
        "Input tracking",
        "Cultivar comparison",
        "Source-backed weekly log"
      ]
    });
    expect(weekFour.photos).toHaveLength(4);
    for (const photo of weekFour.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_4_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 5 as a user-confirmed transplant preflower stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekFive = commercialPack.weeklyLogs.find((log: any) => log.week === 5);

    expect(weekFive).toMatchObject({
      stage: "transplant / preflower",
      stageConfirmedByUser: true,
      tableHeightCm: 40,
      transplantEvent: {
        fromPotVolumeL: 0.5,
        toPotVolumeL: 2,
        completed: true,
        notes: "Transplanted into 2 L pots from rootbound 0.5 L pots."
      },
      rootZoneObservation: {
        rootbound: true,
        potVolumeL: 0.5,
        notes: "Rootbound 0.5 L pots."
      },
      cultivarObservations: [
        {
          cultivar: "Sunviva",
          preflowerStatus: "first_flowers",
          notes: "Sunviva first flowers."
        },
        {
          cultivar: "Primabella",
          morphology: "compact",
          notes: "Primabella compact."
        }
      ],
      outsideTrial: {
        active: true,
        potVolumeL: 30,
        plants: "extra_plants",
        notes: "Extra plants tested outside in 30 L pots."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_5_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_5_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 8,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "transplant",
        "transplant log",
        "preflower",
        "rootbound detection",
        "rootbound alert",
        "pot size change",
        "first flowers",
        "compact morphology",
        "outside 30 L pot test",
        "hardening trial",
        "outdoor hardening",
        "cultivar comparison",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Commercial transplant record",
        "Transplant log",
        "Preflower transition",
        "Rootbound note",
        "Rootbound alert",
        "Pot size change",
        "Cultivar morphology",
        "Outdoor 30 L trial",
        "Hardening trial",
        "Outdoor hardening log",
        "Cultivar comparison",
        "Source-backed weekly log"
      ]
    });
    expect(weekFive.photos).toHaveLength(8);
    for (const photo of weekFive.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_5_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 6 as a user-confirmed veg flowering start stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekSix = commercialPack.weeklyLogs.find((log: any) => log.week === 6);

    expect(weekSix).toMatchObject({
      stage: "veg / flowering start",
      stageConfirmedByUser: true,
      cultivarMeasurements: [
        {
          cultivar: "Sunviva",
          plantHeightCmApprox: 75,
          floweringStatus: "started"
        },
        {
          cultivar: "Primabella",
          plantHeightCmApprox: 45,
          floweringStatus: "started"
        }
      ],
      floweringStatus: {
        Sunviva: "started",
        Primabella: "started",
        notes: "Both varieties started flowering."
      },
      hardeningEvents: [
        {
          type: "sunny_day_outdoor_placement",
          active: true,
          notes: "Plants placed outside on sunny days."
        }
      ],
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_6_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_6_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 3,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "veg",
        "flowering start",
        "stage change",
        "cultivar height comparison",
        "both varieties flowering",
        "sunny day hardening",
        "outdoor acclimation",
        "preflower tracking",
        "cultivar comparison",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Commercial veg record",
        "Flowering start log",
        "Stage change",
        "Cultivar height comparison",
        "Both-variety flowering log",
        "Sunny-day outdoor hardening",
        "Outdoor acclimation",
        "Preflower tracking",
        "Cultivar comparison",
        "Source-backed weekly log"
      ]
    });
    expect(weekSix.photos).toHaveLength(3);
    for (const photo of weekSix.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_6_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 7 as a user-confirmed flower first fruit stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekSeven = commercialPack.weeklyLogs.find((log: any) => log.week === 7);

    expect(weekSeven).toMatchObject({
      stage: "flower / first fruit",
      stageConfirmedByUser: true,
      plantHeightCm: 80,
      tempC: 20,
      rhPercent: 50,
      inputs: [
        {
          name: "Fish-Mix",
          doseMlPerL: 2
        }
      ],
      fruitSetStatus: "first_fruits_setting",
      fruitSetNotes: "First fruits setting.",
      potLimitation: {
        potVolumeL: 2,
        limiting: true,
        notes: "2 L pots becoming limiting."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_7_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_7_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 4,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "flower",
        "first fruit",
        "fruit set tracking",
        "fruit-set log",
        "Fish-Mix input",
        "pot limitation",
        "root-zone warning",
        "transplant reminder",
        "environment log",
        "cultivar comparison",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Commercial flower record",
        "First fruit log",
        "Fruit set tracking",
        "Fruit-set log",
        "Input tracking",
        "Pot limitation warning",
        "Root-zone warning",
        "Transplant reminder",
        "Environment log",
        "Cultivar comparison",
        "Source-backed weekly log"
      ]
    });
    expect(weekSeven.photos).toHaveLength(4);
    for (const photo of weekSeven.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_7_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 8 as a user-confirmed flower fruiting stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekEight = commercialPack.weeklyLogs.find((log: any) => log.week === 8);

    expect(weekEight).toMatchObject({
      stage: "flower / fruiting",
      stageConfirmedByUser: true,
      plantHeightCm: 100,
      tempC: 20,
      rhPercent: 50,
      wateringLiters: 0.4,
      inputs: [
        {
          name: "Fish-Mix",
          doseMlPerL: 2
        }
      ],
      fruitStatus: "first_green_tomatoes",
      fruitNotes: "First green tomatoes.",
      plannedTransplant: {
        toPotVolumeL: 30,
        planned: true,
        notes: "Transplant to 30 L planned."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_8_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_8_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 6,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "flower",
        "fruiting",
        "fruit development tracking",
        "fruit tracking",
        "first green tomatoes",
        "watering log",
        "Fish-Mix input",
        "30 L transplant plan",
        "transplant scheduling",
        "environment log",
        "cultivar comparison",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Commercial flower record",
        "Fruiting log",
        "Fruit development tracking",
        "Fruit tracking",
        "First green tomato log",
        "Watering log",
        "Input tracking",
        "30 L transplant reminder",
        "Transplant scheduling",
        "Environment log",
        "Cultivar comparison",
        "Source-backed weekly log"
      ]
    });
    expect(weekEight.photos).toHaveLength(6);
    for (const photo of weekEight.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_8_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 9 as a user-confirmed outdoor transition stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekNine = commercialPack.weeklyLogs.find((log: any) => log.week === 9);

    expect(weekNine).toMatchObject({
      stage: "outdoor transition",
      stageConfirmedByUser: true,
      plantHeightCm: 110,
      tempC: 20,
      rhPercent: 50,
      inputs: [
        {
          name: "Fish-Mix",
          doseMlPerL: 2
        }
      ],
      outdoorTransition: {
        permanentMove: true,
        notes: "Plants moving outdoors permanently."
      },
      plannedTransplant: {
        toPotVolumeL: 30,
        planned: true,
        notes: "30 L pots planned."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_9_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_9_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 8,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "outdoor transition",
        "permanent outdoor move",
        "hardening continuation",
        "transplant follow-up",
        "30 L pot plan",
        "task reminders",
        "Fish-Mix input",
        "environment log",
        "cultivar comparison",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Outdoor transition log",
        "Permanent outdoor move",
        "Hardening continuation",
        "Transplant follow-up",
        "30 L transplant reminder",
        "Outdoor transition task reminders",
        "Input tracking",
        "Environment log",
        "Cultivar comparison",
        "Source-backed weekly log"
      ]
    });
    expect(weekNine.photos).toHaveLength(8);
    for (const photo of weekNine.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_9_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 10 as a user-confirmed final pots stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekTen = commercialPack.weeklyLogs.find((log: any) => log.week === 10);

    expect(weekTen).toMatchObject({
      stage: "final pots",
      stageConfirmedByUser: true,
      finalPots: [
        {
          count: 3,
          potVolumeL: 30
        },
        {
          count: 1,
          potVolumeL: 40
        }
      ],
      soilOptions: ["Sonnerde", "Neudorff"],
      soilNotes: "Sonnerde or Neudorff soil.",
      inputs: [
        {
          name: "compost tea"
        },
        {
          name: "Great White"
        }
      ],
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_10_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_10_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 6,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "final pots",
        "transplant completion",
        "batch transplant",
        "30 L pot tracking",
        "40 L pot tracking",
        "soil input comparison",
        "soil lot tracking",
        "input tracking",
        "compost tea input",
        "Great White input",
        "outdoor production setup",
        "cultivar comparison",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Final pot log",
        "Transplant completion",
        "Batch transplant",
        "Final pot inventory",
        "Soil/input comparison",
        "Soil lot tracking",
        "Input tracking",
        "Compost tea log",
        "Great White input log",
        "Outdoor production setup",
        "Cultivar comparison",
        "Source-backed weekly log"
      ]
    });
    expect(weekTen.photos).toHaveLength(6);
    for (const photo of weekTen.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_10_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 11 as a user-confirmed first harvest stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekEleven = commercialPack.weeklyLogs.find((log: any) => log.week === 11);

    expect(weekEleven).toMatchObject({
      stage: "first harvest",
      stageConfirmedByUser: true,
      harvestEvents: [
        {
          cultivar: "Sunviva",
          crop: "tomato",
          ripeness: "ripe",
          harvested: true,
          notes: "First Sunviva tomatoes ripe and harvested."
        }
      ],
      soilPerformanceComparison: {
        currentLeader: "Sonnerde",
        outperforming: "Neudorff",
        status: "early_observation",
        notes: "Sonnerde soil outperforming Neudorff so far."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_11_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_11_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 6,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "first harvest",
        "harvest log",
        "harvest count",
        "Sunviva harvest",
        "ripe tomato harvest",
        "soil performance comparison",
        "soil comparison",
        "Sonnerde vs Neudorff",
        "cultivar performance",
        "cultivar comparison",
        "product trial crop summary",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "First harvest log",
        "Harvest log",
        "Harvest count",
        "Cultivar harvest record",
        "Ripe tomato harvest",
        "Soil performance comparison",
        "Soil comparison",
        "Sonnerde vs Neudorff comparison",
        "Cultivar performance",
        "Cultivar comparison",
        "Product trial crop summary",
        "Source-backed weekly log"
      ]
    });
    expect(weekEleven.photos).toHaveLength(6);
    for (const photo of weekEleven.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_11_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 12 as a user-confirmed soil issue stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekTwelve = commercialPack.weeklyLogs.find((log: any) => log.week === 12);

    expect(weekTwelve).toMatchObject({
      stage: "soil issue",
      stageConfirmedByUser: true,
      soilPerformanceComparison: {
        currentLeader: "Sonnerde",
        laggingSoil: "Neudorff",
        differenceStrength: "strong",
        notes:
          "Strong difference between Sonnerde and Neudorff soil; Neudorff plants lagging."
      },
      affectedPlants: [
        {
          soil: "Neudorff",
          status: "lagging"
        }
      ],
      supplierContact: {
        supplier: "Neudorff",
        contacted: true,
        notes: "Grower contacted supplier."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_12_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_12_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 4,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "soil issue",
        "soil comparison follow-up",
        "Sonnerde vs Neudorff performance gap",
        "lagging plants",
        "supplier contact",
        "supplier issue",
        "input performance",
        "crop health comparison",
        "root-zone diagnosis",
        "cultivar performance",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Soil issue log",
        "Soil comparison follow-up",
        "Soil performance gap",
        "Lagging plant tracking",
        "Supplier issue note",
        "Supplier issue",
        "Input performance",
        "Crop health comparison",
        "Root-zone diagnosis",
        "Cultivar performance",
        "Source-backed weekly log"
      ]
    });
    expect(weekTwelve.photos).toHaveLength(4);
    for (const photo of weekTwelve.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_12_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 13 as a user-confirmed fertility correction stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekThirteen = commercialPack.weeklyLogs.find((log: any) => log.week === 13);

    expect(weekThirteen).toMatchObject({
      stage: "fertility correction",
      stageConfirmedByUser: true,
      plantHeightCm: 110,
      wateringLiters: 0.8,
      inputs: [
        {
          name: "Neudorff fertilizer",
          applied: true
        }
      ],
      harvest: {
        crop: "tomato",
        countApprox: 10,
        notes: "About 10 tomatoes harvested."
      },
      soilIssue: {
        type: "poor_water_retention",
        observed: true,
        notes: "Poor water retention noted."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_13_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_13_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 5,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "fertility correction",
        "soil issue response",
        "input adjustment",
        "Neudorff fertilizer application",
        "poor water retention",
        "soil problem tracking",
        "harvest count",
        "watering log",
        "crop recovery tracking",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Fertility correction log",
        "Soil issue response",
        "Input adjustment",
        "Neudorff fertilizer log",
        "Poor water retention warning",
        "Soil problem tracking",
        "Harvest count",
        "Watering log",
        "Crop recovery tracking",
        "Source-backed weekly log"
      ]
    });
    expect(weekThirteen.photos).toHaveLength(5);
    for (const photo of weekThirteen.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_13_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 14 as a user-confirmed recovery stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekFourteen = commercialPack.weeklyLogs.find((log: any) => log.week === 14);

    expect(weekFourteen).toMatchObject({
      stage: "recovery",
      stageConfirmedByUser: true,
      plantHeightCm: 110,
      potVolumeL: 30,
      wateringLiters: 1.5,
      recoveryObservations: {
        plantColor: "greener",
        stemThickness: "thicker",
        newFlowersAppearing: true,
        notes: "Plants greener, stems thicker, new flowers appearing after fertilizer."
      },
      correctionResponse: {
        afterFertilizer: true,
        response: "positive"
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_14_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_14_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 6,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "recovery",
        "recovery tracking",
        "post-correction response",
        "positive fertilizer response",
        "plant color recovery",
        "stem thickening",
        "new flower tracking",
        "watering log",
        "soil problem follow-up",
        "crop health comparison",
        "weekly crop report",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Recovery log",
        "Recovery tracking",
        "Post-correction response",
        "Positive fertilizer response",
        "Plant color recovery",
        "Stem thickening",
        "New flower tracking",
        "Watering log",
        "Soil problem follow-up",
        "Crop health comparison",
        "Weekly crop report",
        "Source-backed weekly log"
      ]
    });
    expect(weekFourteen.photos).toHaveLength(6);
    for (const photo of weekFourteen.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_14_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks commercial tomato week 15 as a user-confirmed ongoing harvest stage", () => {
    const fixture = loadFixture();
    const commercialPack = fixture.packs.find(
      (item: any) => item.accountType === "commercial"
    );
    const weekFifteen = commercialPack.weeklyLogs.find((log: any) => log.week === 15);

    expect(weekFifteen).toMatchObject({
      stage: "ongoing harvest",
      stageConfirmedByUser: true,
      plantHeightCm: 110,
      potVolumeL: 30,
      wateringLiters: 1.5,
      recoveryStatus: {
        plantCount: 4,
        allRecovered: true,
        notes: "All four tomato plants recovered."
      },
      harvest: {
        crop: "tomato",
        countDescription: "a few",
        notes: "Harvesting a few tomatoes."
      },
      flavorNotes: ["sweet", "aromatic"],
      sourceLink: "TODO_PASTE_GROWDIARIES_TOMATOES_SUNVIVA_PRIMABELLA_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_15_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_15_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 5,
      realGrowDataStatus: "stage_only_pending_details",
      testFocus: [
        "ongoing harvest",
        "harvest count",
        "full plant recovery",
        "flavor notes",
        "sweet aromatic tomatoes",
        "watering log",
        "crop production tracking",
        "cultivar performance",
        "external source placeholder"
      ],
      plannedFeatureCoverage: [
        "Ongoing harvest log",
        "Harvest count",
        "Full plant recovery",
        "Flavor notes",
        "Watering log",
        "Crop production tracking",
        "Cultivar performance",
        "Source-backed weekly log"
      ]
    });
    expect(weekFifteen.photos).toHaveLength(5);
    for (const photo of weekFifteen.photos) {
      expect(photo.photoSourceLink).toContain(
        "TODO_SOURCE_COMMERCIAL_TOMATO_WEEK_15_PHOTO_"
      );
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("stores known Bruce Banner Auto setup fields from the user prompt", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );

    const knownSetup = {
      medium: "coco_perlite",
      germinationMethod: "paper_towel",
      potSize: "3 gallon",
      containerType: "fabric_pot",
      lightSchedule: "20/4",
      cocoPreparation: "pre-soaked coco with light nutrients plus CalMag"
    };

    expect(growDiariesPack.grow).toMatchObject({
      medium: knownSetup.medium,
      potSize: knownSetup.potSize,
      containerType: knownSetup.containerType,
      lightSchedule: knownSetup.lightSchedule,
      cocoPreparation: knownSetup.cocoPreparation
    });
    expect(growDiariesPack.realGrowData.knownFromUserPrompt).toMatchObject(knownSetup);
    expect(growDiariesPack.realGrowData.normalizedRecords.grow).toMatchObject({
      medium: knownSetup.medium,
      potSize: knownSetup.potSize,
      containerType: knownSetup.containerType,
      lightSchedule: knownSetup.lightSchedule,
      cocoPreparation: knownSetup.cocoPreparation
    });
  });

  it("includes week 0 germination photo slots as three external source links", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekZero = growDiariesPack.weeklyLogs.find((log: any) => log.week === 0);

    expect(weekZero).toMatchObject({
      stage: "germination",
      germinationMethod: "paper_towel",
      medium: "coco_perlite",
      potSize: "3 gallon",
      containerType: "fabric_pot",
      lightSchedule: "20/4",
      cocoPreparation: "pre-soaked coco with light nutrients plus CalMag",
      photoCount: 3,
      photoPolicy: "external_link_only"
    });
    expect(weekZero.plannedFeatureCoverage).toEqual([
      "Seed start",
      "Medium setup",
      "Germination photo log"
    ]);
    expect(weekZero.photos).toHaveLength(3);
    for (const photo of weekZero.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_0_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 1 as a user-confirmed seedling stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekOne = growDiariesPack.weeklyLogs.find((log: any) => log.week === 1);

    expect(weekOne).toMatchObject({
      stage: "seedling",
      stageConfirmedByUser: true,
      lightHours: 20,
      dayTempC: 25,
      nightTempC: 22,
      rhPercent: 65,
      ph: 6.2,
      ppm: 425,
      potVolumeL: 11.36,
      lampDistanceCm: 85,
      photoCount: 6,
      photoPolicy: "external_link_only"
    });
    expect(weekOne.plannedFeatureCoverage).toEqual([
      "Environment log",
      "VPD",
      "Seedling photo check"
    ]);
    expect(weekOne.photos).toHaveLength(6);
    for (const photo of weekOne.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_1_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 2 as a user-confirmed veg stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekTwo = growDiariesPack.weeklyLogs.find((log: any) => log.week === 2);

    expect(weekTwo).toMatchObject({
      stage: "veg",
      stageConfirmedByUser: true,
      dayTempC: 25,
      nightTempC: 22,
      rhPercent: 65,
      ph: 6.2,
      ppm: 500,
      wateringCadenceDays: 3,
      wateringCadenceNote: "about every 3 days",
      irrigationStyle: "run_to_waste",
      irrigationStyleStarted: true,
      photoCount: 6,
      photoPolicy: "external_link_only"
    });
    expect(weekTwo.plannedFeatureCoverage).toEqual([
      "Watering schedule",
      "Runoff tracking",
      "Root-zone notes"
    ]);
    expect(weekTwo.photos).toHaveLength(6);
    for (const photo of weekTwo.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_2_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 3 as a user-confirmed veg training stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekThree = growDiariesPack.weeklyLogs.find((log: any) => log.week === 3);

    expect(weekThree).toMatchObject({
      stage: "veg/training",
      stageConfirmedByUser: true,
      tempC: 25,
      rhPercent: 65,
      ph: 6.2,
      ppm: 550,
      trainingEvents: [
        {
          type: "topping",
          day: 15,
          node: 5,
          notes: "Topped on day 15 at 5th node"
        },
        {
          type: "LST",
          started: true,
          notes: "Started LST after topping"
        }
      ],
      photoCount: 9,
      photoSubject: "topping",
      photoPolicy: "external_link_only"
    });
    expect(weekThree.plannedFeatureCoverage).toEqual([
      "Training log",
      "Topping reminder",
      "Stress-risk AI check"
    ]);
    expect(weekThree.photos).toHaveLength(9);
    for (const photo of weekThree.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_3_TOPPING_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 4 as a user-confirmed veg canopy build stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekFour = growDiariesPack.weeklyLogs.find((log: any) => log.week === 4);

    expect(weekFour).toMatchObject({
      stage: "veg/canopy build",
      stageConfirmedByUser: true,
      tempC: 25,
      rhPercent: 65,
      ph: 6.2,
      ppm: 600,
      trainingNotes: "Plant trained wide",
      morphologyNotes: "Compact/bushy phenotype noted",
      morphologyTags: ["compact", "bushy", "trained_wide"],
      photoCount: 8,
      photoSubject: "LST",
      photoPolicy: "external_link_only"
    });
    expect(weekFour.plannedFeatureCoverage).toEqual([
      "Canopy/morphology notes",
      "Photo comparison"
    ]);
    expect(weekFour.photos).toHaveLength(8);
    for (const photo of weekFour.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_4_LST_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 5 as a user-confirmed pre-flower stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekFive = growDiariesPack.weeklyLogs.find((log: any) => log.week === 5);

    expect(weekFive).toMatchObject({
      stage: "pre-flower",
      stageConfirmedByUser: true,
      tempC: 25,
      rhPercent: 60,
      ph: 6.2,
      ppm: 600,
      wateringFrequencyPerDay: 2,
      wateringFrequencyNote: "Watering twice daily to runoff",
      runoffTracked: true,
      trainingEvents: [
        {
          type: "HST",
          active: true
        },
        {
          type: "LST",
          active: true
        }
      ],
      inputs: [
        {
          type: "silica",
          used: true
        }
      ],
      defoliationStatus: "not_started",
      defoliationNotes: "No defoliation yet",
      photoCount: 9,
      photoPolicy: "external_link_only"
    });
    expect(weekFive.plannedFeatureCoverage).toEqual([
      "Nutrient log",
      "Watering frequency",
      "Training timeline"
    ]);
    expect(weekFive.photos).toHaveLength(9);
    for (const photo of weekFive.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_5_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 6 as a user-confirmed flower stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekSix = growDiariesPack.weeklyLogs.find((log: any) => log.week === 6);

    expect(weekSix).toMatchObject({
      stage: "flower",
      stageConfirmedByUser: true,
      floweringStatus: "begins",
      flowerBegins: true,
      defoliationEvents: [
        {
          type: "defoliation",
          sequence: 1,
          notes: "First defoliation"
        }
      ],
      wateringFrequencyPerDay: 3,
      wateringFrequencyNote: "Watering 3x daily run-to-waste",
      irrigationStyle: "run_to_waste",
      ecTargetRange: {
        min: 1.2,
        max: 1.3,
        unit: "mS/cm"
      },
      photoCount: 11,
      photoSubject: "defoliation",
      photoPolicy: "external_link_only"
    });
    expect(weekSix.plannedFeatureCoverage).toEqual([
      "Flower transition",
      "Defoliation log",
      "Runoff EC"
    ]);
    expect(weekSix.photos).toHaveLength(11);
    for (const photo of weekSix.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_6_DEFOLIATION_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 7 as a user-confirmed flower stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekSeven = growDiariesPack.weeklyLogs.find((log: any) => log.week === 7);

    expect(weekSeven).toMatchObject({
      stage: "flower",
      stageConfirmedByUser: true,
      tempC: 25,
      rhPercent: 55,
      ph: 6.2,
      ppm: 600,
      budSitesStatus: "forming",
      structureNotes: "Compact indica-like structure",
      morphologyTags: ["compact", "indica_like"],
      defoliationEvents: [
        {
          type: "defoliation",
          intensity: "light",
          notes: "Light defoliation"
        }
      ],
      photoCount: 9,
      photoPolicy: "external_link_only"
    });
    expect(weekSeven.plannedFeatureCoverage).toEqual([
      "AI weekly plant summary",
      "Airflow/light penetration"
    ]);
    expect(weekSeven.photos).toHaveLength(9);
    for (const photo of weekSeven.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_7_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 8 as a user-confirmed flower bud stack stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekEight = growDiariesPack.weeklyLogs.find((log: any) => log.week === 8);

    expect(weekEight).toMatchObject({
      stage: "flower/bud stack",
      stageConfirmedByUser: true,
      tempC: 25,
      rhPercent: 55,
      ph: 6.2,
      ppm: 650,
      stretchStatus: "stopped",
      budDevelopmentNotes: "Dense sticky buds",
      budStructureTags: ["dense", "sticky"],
      trainingEvents: [
        {
          type: "lollipopping",
          active: true
        },
        {
          type: "defoliation",
          intensity: "minor"
        }
      ],
      inputs: [
        {
          type: "PK_booster",
          started: true
        }
      ],
      photoCount: 17,
      photoPolicy: "external_link_only"
    });
    expect(weekEight.plannedFeatureCoverage).toEqual([
      "Bud development log",
      "Lollipop task",
      "Nutrient adjustment"
    ]);
    expect(weekEight.photos).toHaveLength(17);
    for (const photo of weekEight.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_8_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 9 as a user-confirmed flower resin stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekNine = growDiariesPack.weeklyLogs.find((log: any) => log.week === 9);

    expect(weekNine).toMatchObject({
      stage: "flower/resin",
      stageConfirmedByUser: true,
      tempC: 25,
      rhPercent: 55,
      ph: 6.2,
      ppm: 650,
      resinNotes: "Heavy resin",
      resinIntensity: "heavy",
      airflowAdded: true,
      airflowNotes: "Added airflow",
      runoffECCheckFrequency: "2-3x weekly",
      runoffECTracked: true,
      photoCount: 20,
      photoPolicy: "external_link_only"
    });
    expect(weekNine.plannedFeatureCoverage).toEqual([
      "Mold-risk prevention",
      "Runoff trend",
      "Photo resin tracking"
    ]);
    expect(weekNine.photos).toHaveLength(20);
    for (const photo of weekNine.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_9_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 10 as a user-confirmed flush ripening stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekTen = growDiariesPack.weeklyLogs.find((log: any) => log.week === 10);

    expect(weekTen).toMatchObject({
      stage: "flush/ripening",
      stageConfirmedByUser: true,
      tempC: 25,
      rhPercent: 50,
      ph: 6.2,
      ppm: 650,
      flushStarted: true,
      flushStartDay: 67,
      trichomeObservation: {
        cloudyStatus: "mostly_cloudy",
        amberPercentMin: 1,
        amberPercentMax: 5
      },
      photoCount: 25,
      photoPolicy: "external_link_only"
    });
    expect(weekTen.plannedFeatureCoverage).toEqual([
      "Harvest timing",
      "Trichome log",
      "Flush task"
    ]);
    expect(weekTen.photos).toHaveLength(25);
    for (const photo of weekTen.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_10_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks week 11 as a user-confirmed harvest stage", () => {
    const fixture = loadFixture();
    const growDiariesPack = fixture.packs.find((item: any) =>
      String(item.id).includes("bruce-banner-auto")
    );
    const weekEleven = growDiariesPack.weeklyLogs.find((log: any) => log.week === 11);

    expect(weekEleven).toMatchObject({
      stage: "harvest",
      stageConfirmedByUser: true,
      harvestDay: 73,
      dryWeight: 236,
      dryWeightUnit: "g",
      plantCount: 1,
      growAreaM2: 0.36,
      yieldPerM2: 655.56,
      tasteNotes: ["diesel", "earthy", "mint"],
      photoCount: 34,
      photoSubject: "harvest/dry",
      photoPolicy: "external_link_only"
    });
    expect(weekEleven.plannedFeatureCoverage).toEqual([
      "Harvest report",
      "Yield report",
      "Smoke report",
      "Share card"
    ]);
    expect(weekEleven.photos).toHaveLength(34);
    for (const photo of weekEleven.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_WEEK_11_HARVEST_DRY_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("defines the facility pack as a source-backed MAC1 FloraFlex clone batch", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );

    expect(facilityPack).toMatchObject({
      id: "facility-cannabis-mac1-floraflex-clone-batch",
      title: "MAC1 FloraFlex - 8 Plant Clone Batch",
      source: {
        provider: "GrowDiaries",
        rightsMode: "external_link_only",
        attributionRequired: true
      }
    });
    expect(facilityPack.source.sourceLink).toContain("TODO_PASTE_GROWDIARIES_MAC1");
    expect(facilityPack.realGrowData).toMatchObject({
      dataConfidence: "source_pending",
      doNotInventMissingValues: true,
      sourceRequiredBeforeSeeding: true
    });
    expect(facilityPack.realGrowData.knownFromUserPrompt).toMatchObject({
      cultivar: "MAC1",
      system: "FloraFlex",
      sourceType: "clone_batch",
      plantCount: 8,
      uniformClones: true,
      waterSource: "RO",
      tracksCO2: true,
      tracksRunoffEC: true,
      tracksHarvestCrewWorkflow: true,
      tracksRoomReset: true
    });
    expect(facilityPack.realGrowData.normalizedRecords.batch).toMatchObject({
      name: "MAC1 8 Clone Batch",
      plantCount: 8,
      sourceType: "clone_batch",
      status: "source_pending"
    });
  });

  it("marks facility week 0 as a user-confirmed clone selection stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekZero = facilityPack.weeklyLogs.find((log: any) => log.week === 0);

    expect(weekZero).toMatchObject({
      stage: "clone selection",
      stageConfirmedByUser: true,
      clonesTaken: 16,
      selectedCloneCount: 8,
      selectionCriteria: "most_uniform",
      startMedium: "rockwool_cube",
      cloneSelectionNotes:
        "16 clones taken, 8 most uniform selected. Rockwool cube start.",
      photoCount: 1,
      photoPolicy: "external_link_only",
      testFocus: ["clone intake", "batch creation", "selection notes"]
    });
    expect(weekZero.plannedFeatureCoverage).toEqual([
      "Clone intake",
      "Batch creation",
      "Selection notes"
    ]);
    expect(weekZero.sourceLink).toContain("TODO_PASTE_GROWDIARIES_MAC1");
    expect(weekZero.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_0");
    expect(weekZero.photos).toHaveLength(1);
    expect(weekZero.photos[0]).toMatchObject({
      index: 1,
      photoSourceLink: expect.stringContaining("TODO_SOURCE_FACILITY_WEEK_0_PHOTO_1"),
      photoPolicy: "external_link_only"
    });
    expect(weekZero.photos[0]).not.toHaveProperty("uploadedAssetUri");
    expect(weekZero.photos[0]).not.toHaveProperty("localFilePath");
  });

  it("marks facility week 1 as a user-confirmed veg stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekOne = facilityPack.weeklyLogs.find((log: any) => log.week === 1);

    expect(weekOne).toMatchObject({
      stage: "veg",
      stageConfirmedByUser: true,
      plantHeightCm: 8.89,
      lightHours: 18,
      dayTempC: 24,
      nightTempC: 20,
      rhPercent: 65,
      ph: 6.0,
      co2Ppm: 650,
      wateringVolumeL: 0.76,
      photoCount: 2,
      photoPolicy: "external_link_only",
      testFocus: ["room environment", "batch feed", "reservoir SOP"]
    });
    expect(weekOne.plannedFeatureCoverage).toEqual([
      "Room environment",
      "Batch feed",
      "Reservoir SOP"
    ]);
    expect(weekOne.photos).toHaveLength(2);
    for (const photo of weekOne.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_1_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 2 as a user-confirmed veg stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekTwo = facilityPack.weeklyLogs.find((log: any) => log.week === 2);

    expect(weekTwo).toMatchObject({
      stage: "veg",
      stageConfirmedByUser: true,
      feedTimingChanges: [
        {
          change: "added_second_feed_timing",
          notes: "Added second feed timing"
        }
      ],
      reservoirConcerns: [
        {
          type: "slime",
          status: "concern",
          notes: "Reservoir slime concern"
        }
      ],
      productChanges: [
        {
          type: "CalMag",
          change: "switched_product",
          notes: "Switched CalMag product"
        }
      ],
      photoCount: 1,
      photoPolicy: "external_link_only",
      testFocus: ["facility alert", "reservoir issue", "staff note"]
    });
    expect(weekTwo.plannedFeatureCoverage).toEqual([
      "Facility alert",
      "Reservoir issue",
      "Staff note"
    ]);
    expect(weekTwo.photos).toHaveLength(1);
    expect(weekTwo.photos[0]).toMatchObject({
      index: 1,
      photoSourceLink: expect.stringContaining("TODO_SOURCE_FACILITY_WEEK_2_PHOTO_1"),
      photoPolicy: "external_link_only"
    });
    expect(weekTwo.photos[0]).not.toHaveProperty("uploadedAssetUri");
    expect(weekTwo.photos[0]).not.toHaveProperty("localFilePath");
  });

  it("marks facility week 3 as a user-confirmed veg stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekThree = facilityPack.weeklyLogs.find((log: any) => log.week === 3);

    expect(weekThree).toMatchObject({
      stage: "veg",
      stageConfirmedByUser: true,
      plantHeightCm: 35.56,
      lightHours: 18,
      tempC: 24,
      rhPercent: 65,
      ph: 6.0,
      co2Ppm: 750,
      wateringVolumeL: 1.51,
      photoCount: 5,
      photoPolicy: "external_link_only",
      testFocus: ["batch growth tracking", "screen prep"]
    });
    expect(weekThree.plannedFeatureCoverage).toEqual([
      "Batch growth tracking",
      "Screen prep"
    ]);
    expect(weekThree.photos).toHaveLength(5);
    for (const photo of weekThree.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_3_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 4 as a user-confirmed veg flip prep stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekFour = facilityPack.weeklyLogs.find((log: any) => log.week === 4);

    expect(weekFour).toMatchObject({
      stage: "veg/flip prep",
      stageConfirmedByUser: true,
      trainingEvents: [
        {
          type: "lollipopping",
          completed: true
        }
      ],
      screenEvents: [
        {
          type: "first_screen",
          installed: true
        },
        {
          type: "upper_screen",
          installed: true
        }
      ],
      flushEvents: [
        {
          type: "pre_flip_flush",
          solution: "flower_nutrients",
          notes: "Flushed with flower nutrients before flip"
        }
      ],
      sourceNotes: "TODO_EXTRACT_WEEK_4_SOURCE_NOTES",
      photoPolicy: "external_link_only",
      testFocus: ["flip checklist", "trellis task", "defoliation SOP"]
    });
    expect(weekFour.plannedFeatureCoverage).toEqual([
      "Flip checklist",
      "Trellis task",
      "Defoliation SOP"
    ]);
  });

  it("marks facility week 5 as a user-confirmed flower week 1 stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekFive = facilityPack.weeklyLogs.find((log: any) => log.week === 5);

    expect(weekFive).toMatchObject({
      stage: "flower week 1",
      stageConfirmedByUser: true,
      plantHeightCm: 40.64,
      lightHoursListed: 18,
      tempC: 24,
      rhPercent: 60,
      ph: 6.0,
      co2Ppm: 750,
      wateringVolumeL: 1.89,
      sourceNotes: "TODO_EXTRACT_WEEK_5_SOURCE_NOTES",
      realGrowDataStatus: "source_pending",
      photoPolicy: "external_link_only",
      testFocus: ["flower phase change", "nutrient schedule switch"]
    });
    expect(weekFive.plannedFeatureCoverage).toEqual([
      "Flower phase change",
      "Nutrient schedule switch"
    ]);
  });

  it("marks facility week 6 as a user-confirmed flower week 2 stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekSix = facilityPack.weeklyLogs.find((log: any) => log.week === 6);

    expect(weekSix).toMatchObject({
      stage: "flower week 2",
      stageConfirmedByUser: true,
      trainingEvents: [
        {
          type: "supercropping",
          active: true
        },
        {
          type: "training",
          active: true
        }
      ],
      plannedDefoliationEvents: [
        {
          type: "strip",
          plannedDay: 20,
          notes: "Day 20 strip planned"
        }
      ],
      photoCount: 17,
      photoPolicy: "external_link_only",
      testFocus: ["staff task", "crop steering", "training notes"]
    });
    expect(weekSix.plannedFeatureCoverage).toEqual([
      "Staff task",
      "Crop steering",
      "Training notes"
    ]);
    expect(weekSix.photos).toHaveLength(17);
    for (const photo of weekSix.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_6_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 7 as a user-confirmed flower week 3 stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekSeven = facilityPack.weeklyLogs.find((log: any) => log.week === 7);

    expect(weekSeven).toMatchObject({
      stage: "flower week 3",
      stageConfirmedByUser: true,
      lightHours: 12,
      tempC: 24,
      rhPercent: 55,
      ph: 5.9,
      co2Ppm: 750,
      defoliationEvents: [
        {
          type: "strip_shwazze",
          day: 20,
          completed: true,
          notes: "Day 20 strip/shwazze"
        }
      ],
      humidityAdjustment: {
        targetRHPercent: 55,
        notes: "Humidity adjusted to 55%"
      },
      photoCount: 7,
      photoPolicy: "external_link_only",
      testFocus: ["defoliation labor log", "humidity alert", "trichome photo"]
    });
    expect(weekSeven.plannedFeatureCoverage).toEqual([
      "Defoliation labor log",
      "Humidity alert",
      "Trichome photo"
    ]);
    expect(weekSeven.photos).toHaveLength(7);
    for (const photo of weekSeven.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_7_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 8 as a user-confirmed flower week 4 stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekEight = facilityPack.weeklyLogs.find((log: any) => log.week === 8);

    expect(weekEight).toMatchObject({
      stage: "flower week 4",
      stageConfirmedByUser: true,
      plantHeightCm: 71.12,
      lightHours: 12,
      dayTempC: 26,
      nightTempC: 19,
      ph: 5.9,
      tdsPpm: 950,
      rhPercent: 55,
      co2Ppm: 750,
      stretchStatus: "stopped",
      screenNotes: "Lower colas reached second screen",
      canopyEvents: [
        {
          type: "lower_colas_reached_second_screen",
          completed: true
        }
      ],
      photoCount: 12,
      photoPolicy: "external_link_only",
      testFocus: ["canopy tracking", "stretch report", "bud-site monitoring"]
    });
    expect(weekEight.plannedFeatureCoverage).toEqual([
      "Canopy tracking",
      "Stretch report",
      "Bud-site monitoring"
    ]);
    expect(weekEight.photos).toHaveLength(12);
    for (const photo of weekEight.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_8_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 9 as a user-confirmed flower week 5 stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekNine = facilityPack.weeklyLogs.find((log: any) => log.week === 9);

    expect(weekNine).toMatchObject({
      stage: "flower week 5",
      stageConfirmedByUser: true,
      plantHeightCm: 71.12,
      tempC: 25,
      rhPercent: 53,
      ph: 6.0,
      tdsPpm: 1000,
      co2Ppm: 850,
      photoCount: 23,
      photoPolicy: "external_link_only",
      testFocus: [
        "PPFD/CO2 crop steering",
        "light stress check",
        "external photo metadata"
      ]
    });
    expect(weekNine.plannedFeatureCoverage).toEqual([
      "PPFD/CO2 crop steering",
      "Light stress check"
    ]);
    expect(weekNine.photos).toHaveLength(23);
    for (const photo of weekNine.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_9_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 10 as a user-confirmed flower week 6 stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekTen = facilityPack.weeklyLogs.find((log: any) => log.week === 10);

    expect(weekTen).toMatchObject({
      stage: "flower week 6",
      stageConfirmedByUser: true,
      plantHeightCm: 76.2,
      tempC: 24,
      rhPercent: 55,
      ph: 6.0,
      tdsPpm: 850,
      co2Ppm: 650,
      cropSteeringAdjustment:
        "Reduced CO2 and light to avoid foxtail/transpiration imbalance.",
      sourceLink: "TODO_PASTE_GROWDIARIES_MAC1_FLORAFLEX_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_FACILITY_WEEK_10_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_FACILITY_WEEK_10_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 7,
      realGrowDataStatus: "user_confirmed_measurements",
      testFocus: [
        "CO2 reduction",
        "light reduction",
        "foxtail/transpiration imbalance prevention"
      ],
      plannedFeatureCoverage: [
        "AI diagnosis",
        "Crop steering adjustment",
        "Environmental risk",
        "CO2 crop steering",
        "Light intensity steering",
        "Foxtail/transpiration imbalance prevention"
      ]
    });
    expect(weekTen.photos).toHaveLength(7);
    for (const photo of weekTen.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_10_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 11 as a user-confirmed late flower stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekEleven = facilityPack.weeklyLogs.find((log: any) => log.week === 11);

    expect(weekEleven).toMatchObject({
      stage: "late flower",
      stageConfirmedByUser: true,
      plantHeightCm: 76.2,
      tempC: 24,
      rhPercent: 55,
      ph: 5.9,
      tdsPpm: 950,
      co2Ppm: 650,
      wateringLiters: 3.79,
      runoffCorrection: {
        startingRunoffTdsPpm: 2000,
        endingRunoffTdsPpm: 1500,
        note: "Runoff flushed from over 2000 ppm toward 1500 ppm."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_MAC1_FLORAFLEX_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_FACILITY_WEEK_11_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_FACILITY_WEEK_11_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 8,
      realGrowDataStatus: "user_confirmed_measurements",
      testFocus: [
        "late flower runoff correction",
        "high runoff TDS flush-down",
        "salt buildup alert",
        "late flower report",
        "facility finish progression"
      ],
      plannedFeatureCoverage: [
        "Late flower monitoring",
        "Runoff EC/TDS correction",
        "Salt buildup alert",
        "Late flower report",
        "pH/EC range check",
        "Facility finish progression",
        "Source-backed weekly log"
      ]
    });
    expect(weekEleven.photos).toHaveLength(8);
    for (const photo of weekEleven.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_11_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 12 as a user-confirmed late flower stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekTwelve = facilityPack.weeklyLogs.find((log: any) => log.week === 12);

    expect(weekTwelve).toMatchObject({
      stage: "late flower",
      stageConfirmedByUser: true,
      plantHeightCm: 76.2,
      tempC: 25,
      rhPercent: 55,
      ph: 6.1,
      tdsPpm: 850,
      co2Ppm: 500,
      irrigationSchedule: {
        volumePerPlantGallonsPerDay: 1,
        feedDurationMinutes: 3,
        feedCountDuringLightsOn: 5,
        note: "1 gal/plant/day, 3 min x 5 feeds during lights on."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_MAC1_FLORAFLEX_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_FACILITY_WEEK_12_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_FACILITY_WEEK_12_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 6,
      realGrowDataStatus: "user_confirmed_measurements",
      testFocus: [
        "late flower irrigation timing",
        "multi-feed lights-on schedule",
        "trichome monitoring",
        "runoff EC",
        "facility finish progression"
      ],
      plannedFeatureCoverage: [
        "Late flower monitoring",
        "Irrigation schedule",
        "Irrigation timing",
        "Trichome monitoring",
        "Runoff EC",
        "Facility feed schedule",
        "Facility finish progression",
        "Source-backed weekly log"
      ]
    });
    expect(weekTwelve.photos).toHaveLength(6);
    for (const photo of weekTwelve.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_12_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 13 as a user-confirmed ripening stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekThirteen = facilityPack.weeklyLogs.find((log: any) => log.week === 13);

    expect(weekThirteen).toMatchObject({
      stage: "ripening",
      stageConfirmedByUser: true,
      plantHeightCm: 76.2,
      tempC: 24,
      rhPercent: 55,
      ph: 5.9,
      tdsPpm: 950,
      co2Ppm: 500,
      trichomeCheck: {
        flowerDay: 55,
        harvestWindowNote: "Day 55 trichomes, 2+ weeks left."
      },
      sourceLink: "TODO_PASTE_GROWDIARIES_MAC1_FLORAFLEX_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_FACILITY_WEEK_13_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_FACILITY_WEEK_13_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 8,
      realGrowDataStatus: "user_confirmed_measurements",
      testFocus: [
        "ripening trichome check",
        "harvest window estimate",
        "harvest forecast",
        "maturity tracking",
        "facility finish progression"
      ],
      plannedFeatureCoverage: [
        "Ripening monitoring",
        "Trichome monitoring",
        "Harvest readiness",
        "Harvest window estimate",
        "Harvest forecast",
        "Maturity tracking",
        "Source-backed weekly log"
      ]
    });
    expect(weekThirteen.photos).toHaveLength(8);
    for (const photo of weekThirteen.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_13_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 14 as a user-confirmed flush harvest prep stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekFourteen = facilityPack.weeklyLogs.find((log: any) => log.week === 14);

    expect(weekFourteen).toMatchObject({
      stage: "flush / harvest prep",
      stageConfirmedByUser: true,
      tempDayC: 22,
      tempNightC: 18,
      rhPercent: 55,
      ph: 5.9,
      tdsPpm: 500,
      co2Ppm: 400,
      waterSource: "RO",
      feedInputs: ["CalMag"],
      lightAdjustment: "lights reduced",
      harvestStatus: "harvest planned",
      sourceLink: "TODO_PASTE_GROWDIARIES_MAC1_FLORAFLEX_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_FACILITY_WEEK_14_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_FACILITY_WEEK_14_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 12,
      realGrowDataStatus: "user_confirmed_measurements",
      testFocus: [
        "flush",
        "harvest prep",
        "flush SOP",
        "light taper",
        "lights reduced",
        "RO + CalMag"
      ],
      plannedFeatureCoverage: [
        "Flush tracking",
        "Flush SOP",
        "Harvest prep",
        "Light taper",
        "Light reduction",
        "RO water feed record",
        "CalMag record",
        "Source-backed weekly log"
      ]
    });
    expect(weekFourteen.photos).toHaveLength(12);
    for (const photo of weekFourteen.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_14_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });

  it("marks facility week 15 as a user-confirmed harvest dry cure stage", () => {
    const fixture = loadFixture();
    const facilityPack = fixture.packs.find(
      (item: any) => item.accountType === "facility"
    );
    const weekFifteen = facilityPack.weeklyLogs.find((log: any) => log.week === 15);

    expect(weekFifteen).toMatchObject({
      stage: "harvest / dry / cure",
      stageConfirmedByUser: true,
      plantCount: 8,
      totalCycleDays: 100,
      darkPeriodHours: 24,
      harvestWindow: {
        startTime: "04:00",
        endTime: "09:45",
        note: "Harvest from 4 a.m. to 9:45 a.m."
      },
      dryRoom: {
        targetRHPercent: 60,
        ambientTempF: 65,
        ambientRHPercent: 55,
        note: "Dry tent around 60% RH target, 65°F/55% ambient noted."
      },
      moistureMeterUsed: true,
      cureContainer: "CVault",
      sourceLink: "TODO_PASTE_GROWDIARIES_MAC1_FLORAFLEX_DIARY_URL",
      photoSourceLink: "TODO_SOURCE_FACILITY_WEEK_15_PHOTO_OR_PHOTO_SET_URL",
      sourcePhotoUrl: "TODO_SOURCE_FACILITY_WEEK_15_PHOTO_OR_PHOTO_SET_URL",
      photoPolicy: "external_link_only",
      photoCount: 21,
      realGrowDataStatus: "user_confirmed_harvest_dry_cure",
      testFocus: [
        "harvest",
        "harvest labor",
        "dry",
        "cure",
        "dry room target",
        "CVault cure",
        "room reset"
      ],
      plannedFeatureCoverage: [
        "Harvest report",
        "Harvest labor",
        "Dry room tracking",
        "Dry room log",
        "Cure tracking",
        "Cure tracker",
        "Moisture meter record",
        "CVault cure record",
        "Room reset",
        "Source-backed weekly log"
      ]
    });
    expect(weekFifteen.photos).toHaveLength(21);
    for (const photo of weekFifteen.photos) {
      expect(photo.photoSourceLink).toContain("TODO_SOURCE_FACILITY_WEEK_15_PHOTO_");
      expect(photo.photoPolicy).toBe("external_link_only");
      expect(photo).not.toHaveProperty("uploadedAssetUri");
      expect(photo).not.toHaveProperty("localFilePath");
    }
  });
});
