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

function packByAccount(accountType: string) {
  const fixture = loadFixture();
  const pack = fixture.packs.find((item: any) => item.accountType === accountType);

  if (!pack) {
    throw new Error(`Missing ${accountType} live test pack`);
  }

  return pack;
}

function weeklyStages(pack: any) {
  return pack.weeklyLogs.map((log: any) => log.stage);
}

function combinedCoverage(pack: any) {
  return pack.weeklyLogs
    .flatMap((log: any) => [
      ...(log.testFocus || []),
      ...(log.plannedFeatureCoverage || [])
    ])
    .map((item: string) => item.toLowerCase());
}

function expectSequentialWeeks(pack: any, first: number, last: number) {
  expect(pack.weeklyLogs.map((log: any) => log.week)).toEqual(
    Array.from({ length: last - first + 1 }, (_, index) => first + index)
  );
}

function expectCoverage(pack: any, expectedTerms: string[]) {
  const coverage = combinedCoverage(pack).join(" | ");

  for (const term of expectedTerms) {
    expect(coverage).toContain(term.toLowerCase());
  }
}

describe("growpath live test packs workflow readiness", () => {
  it("keeps the personal pack ready for free and pro grow-flow verification", () => {
    const pack = packByAccount("personal");

    expect(pack.planTargets).toEqual(expect.arrayContaining(["free", "pro"]));
    expect(pack.grow).toMatchObject({
      cropType: "cannabis",
      cultivar: "Bruce Banner Auto",
      medium: "coco_perlite",
      growStyle: "single_user_home"
    });
    expectSequentialWeeks(pack, 0, 11);
    expect(weeklyStages(pack)).toEqual(
      expect.arrayContaining([
        "germination",
        "seedling",
        "veg",
        "veg/training",
        "flower",
        "flush/ripening",
        "harvest"
      ])
    );
    expect(pack.acceptanceChecks).toEqual(
      expect.arrayContaining([
        "Free user can view feed banners and use allowed grow/log flows without commercial inventory.",
        "Pro user can save tool runs, logs, tasks, and external photo metadata.",
        "Harvest quality notes can be saved and later compared in run history."
      ])
    );
    expectCoverage(pack, [
      "Environment log",
      "VPD",
      "Seedling photo check",
      "Training log",
      "Topping reminder",
      "Stress-risk AI check",
      "Harvest report",
      "Yield report",
      "Smoke report",
      "Share card"
    ]);
  });

  it("keeps the commercial tomato pack ready for crop trial and summary verification", () => {
    const pack = packByAccount("commercial");

    expect(pack.planTargets).toEqual(["commercial"]);
    expect(pack.workflow).toMatchObject({
      cropBatch: "Sunviva / Primabella Outdoor Tomato Trial",
      cropType: "tomato",
      cultivars: ["Sunviva", "Primabella"],
      environment: "outdoor",
      trialGrow: "Outdoor Tomato Cultivar Comparison"
    });
    expect(pack.realGrowData.normalizedRecords).toMatchObject({
      grow: {
        purpose: "commercial_crop_trial",
        cropType: "tomato",
        cultivars: ["Sunviva", "Primabella"]
      },
      cropTrial: {
        trialName: "Sunviva / Primabella Outdoor Tomato Trial",
        purpose: "cultivar_comparison"
      },
      commercialCropSummary: "TODO_EXTRACT_FROM_SOURCE"
    });
    expectSequentialWeeks(pack, 0, 15);
    expect(weeklyStages(pack)).toEqual([
      "germination",
      "seedling",
      "veg",
      "veg / selection",
      "veg / pruning",
      "transplant / preflower",
      "veg / flowering start",
      "flower / first fruit",
      "flower / fruiting",
      "outdoor transition",
      "final pots",
      "first harvest",
      "soil issue",
      "fertility correction",
      "recovery",
      "ongoing harvest"
    ]);

    const weekZero = pack.weeklyLogs.find((log: any) => log.week === 0);
    const weekTen = pack.weeklyLogs.find((log: any) => log.week === 10);
    const weekTwelve = pack.weeklyLogs.find((log: any) => log.week === 12);
    const weekFifteen = pack.weeklyLogs.find((log: any) => log.week === 15);

    expect(weekZero.cultivarGermination).toEqual([
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
    ]);
    expect(weekTen.finalPots).toEqual([
      { count: 3, potVolumeL: 30 },
      { count: 1, potVolumeL: 40 }
    ]);
    expect(weekTen.soilOptions).toEqual(["Sonnerde", "Neudorff"]);
    expect(weekTwelve.supplierContact).toMatchObject({
      supplier: "Neudorff",
      contacted: true
    });
    expect(weekFifteen.recoveryStatus).toMatchObject({
      allRecovered: true
    });
    expect(weekFifteen.flavorNotes).toEqual(["sweet", "aromatic"]);
    expectCoverage(pack, [
      "Crop start",
      "Cultivar comparison",
      "Germination rate",
      "Transplant log",
      "Rootbound alert",
      "Fruit tracking",
      "Transplant scheduling",
      "Soil lot tracking",
      "Supplier issue",
      "Input performance",
      "Crop health comparison",
      "Weekly crop report",
      "Ongoing harvest log"
    ]);
  });

  it("keeps the facility pack ready for room, batch, harvest, and quality-note verification", () => {
    const pack = packByAccount("facility");

    expect(pack.planTargets).toEqual(["facility"]);
    expect(pack.facility.rooms).toEqual([
      "Clone/Veg Room",
      "Flower Room",
      "Dry/Cure Room",
      "Room Reset"
    ]);
    expect(pack.workflow.tasks).toEqual(
      expect.arrayContaining([
        "reservoir mix",
        "room check",
        "CO2 check",
        "PPFD adjustment",
        "runoff EC check",
        "harvest crew workflow",
        "dry/cure check",
        "room reset"
      ])
    );
    expect(pack.realGrowData.normalizedRecords).toMatchObject({
      facilityGrow: {
        cropType: "cannabis",
        cultivar: "MAC1",
        system: "FloraFlex"
      },
      batch: {
        name: "MAC1 8 Clone Batch",
        room: "Flower Room",
        plantCount: 8
      },
      cloneBatch: {
        tracked: true,
        clonesTaken: 16,
        selectedCount: 8,
        startMedium: "rockwool_cube"
      },
      harvestQualityNotes: "TODO_EXTRACT_FROM_SOURCE",
      commercialCropSummary: "TODO_EXTRACT_FROM_SOURCE"
    });
    expectSequentialWeeks(pack, 0, 15);

    const weekZero = pack.weeklyLogs.find((log: any) => log.week === 0);
    const weekTwo = pack.weeklyLogs.find((log: any) => log.week === 2);
    const weekSeven = pack.weeklyLogs.find((log: any) => log.week === 7);
    const weekEleven = pack.weeklyLogs.find((log: any) => log.week === 11);
    const weekFifteen = pack.weeklyLogs.find((log: any) => log.week === 15);

    expect(weekZero).toMatchObject({
      clonesTaken: 16,
      selectedCloneCount: 8,
      selectionCriteria: "most_uniform"
    });
    expect(weekTwo.reservoirConcerns).toEqual([
      {
        type: "slime",
        status: "concern",
        notes: "Reservoir slime concern"
      }
    ]);
    expect(weekTwo.productChanges).toEqual([
      {
        type: "CalMag",
        change: "switched_product",
        notes: "Switched CalMag product"
      }
    ]);
    expect(weekSeven.defoliationEvents).toEqual([
      {
        type: "strip_shwazze",
        day: 20,
        completed: true,
        notes: "Day 20 strip/shwazze"
      }
    ]);
    expect(weekEleven.runoffCorrection).toMatchObject({
      startingRunoffTdsPpm: 2000,
      endingRunoffTdsPpm: 1500
    });
    expect(weekFifteen).toMatchObject({
      plantCount: 8,
      totalCycleDays: 100,
      darkPeriodHours: 24,
      moistureMeterUsed: true,
      cureContainer: "CVault"
    });
    expect(weekFifteen.harvestWindow).toMatchObject({
      startTime: "04:00",
      endTime: "09:45"
    });
    expect(pack.acceptanceChecks).toEqual(
      expect.arrayContaining([
        "Post-harvest quality notes are visible in reports without becoming public storefront content.",
        "Facility and commercial workflows stay separate unless explicitly linked."
      ])
    );
    expectCoverage(pack, [
      "Clone intake",
      "Batch creation",
      "Reservoir issue",
      "Staff note",
      "Crop steering",
      "Defoliation labor log",
      "Runoff EC",
      "Harvest labor",
      "Dry room tracking",
      "Cure tracking",
      "Room reset"
    ]);
  });
});
