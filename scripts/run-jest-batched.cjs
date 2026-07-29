const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jestBin = path.join(root, "node_modules", "jest", "bin", "jest.js");
const batchSize = Math.max(1, Number(process.env.JEST_CI_BATCH_SIZE || 5));
const laneCount = Math.max(1, Number(process.env.JEST_CI_LANES || 5));
const heapMb = Math.max(1024, Number(process.env.JEST_CI_HEAP_MB || 12288));
const traceFile = process.env.JEST_CI_TRACE_FILE || "";
const soloTestPatterns = [
  "CommercialWorkflowPages.test.tsx",
  "ContentMarketplaceScreen.test.tsx",
  "release.production-builds.test.js",
  "AutoGrowCalendarToolScreen.test.tsx",
];

function trace(message) {
  if (!traceFile) return;
  fs.appendFileSync(traceFile, `${message}\n`, "utf8");
}

function run(command, args, options = {}) {
  const { echo = true, ...spawnOptions } = options;
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...spawnOptions,
  });

  if (echo && result.stdout) process.stdout.write(result.stdout);
  if (echo && result.stderr) process.stderr.write(result.stderr);

  return result;
}

const listResult = run(process.execPath, [jestBin, "--listTests", "--json"], {
  echo: false,
});
if (listResult.status !== 0) {
  if (listResult.stdout) process.stdout.write(listResult.stdout);
  if (listResult.stderr) process.stderr.write(listResult.stderr);
  process.exit(listResult.status || 1);
}

let tests;
try {
  tests = JSON.parse(String(listResult.stdout || "[]").trim() || "[]");
} catch (error) {
  console.error("Failed to parse Jest test list.");
  console.error(error);
  process.exit(1);
}

if (!Array.isArray(tests) || tests.length === 0) {
  console.log("No Jest tests found.");
  process.exit(0);
}

if (traceFile) {
  fs.writeFileSync(traceFile, "", "utf8");
}

const soloTests = [];
const remainingTests = [];
for (const test of tests) {
  if (soloTestPatterns.some((pattern) => test.includes(pattern))) {
    soloTests.push(test);
  } else {
    remainingTests.push(test);
  }
}

const lanes = Array.from({ length: laneCount }, () => []);
for (let index = 0; index < remainingTests.length; index++) {
  lanes[index % laneCount].push(remainingTests[index]);
}

const totalBatches = lanes.reduce(
  (sum, lane) => sum + Math.ceil(lane.length / batchSize),
  soloTests.length
);

let batchNumber = 0;
for (const test of soloTests) {
  batchNumber += 1;
  console.log(
    `\n==> Jest batch ${batchNumber}/${totalBatches} (solo, 1 file)`
  );
  trace(
    JSON.stringify({
      batchNumber,
      totalBatches,
      kind: "solo",
      tests: [test],
    })
  );

  const result = run(
    process.execPath,
    [
      `--max-old-space-size=${heapMb}`,
      jestBin,
      "--runInBand",
      "--forceExit",
      "--runTestsByPath",
      test,
    ],
    { echo: true }
  );

  if (result.status !== 0) {
    trace(
      JSON.stringify({
        batchNumber,
        totalBatches,
        kind: "solo",
        exitCode: result.status || 1,
        failed: true,
      })
    );
    process.exit(result.status || 1);
  }

  trace(
    JSON.stringify({
      batchNumber,
      totalBatches,
      kind: "solo",
      exitCode: 0,
      failed: false,
    })
  );
}

for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
  const lane = lanes[laneIndex];
  for (let index = 0; index < lane.length; index += batchSize) {
    const batch = lane.slice(index, index + batchSize);
    batchNumber += 1;

    console.log(
      `\n==> Jest batch ${batchNumber}/${totalBatches} ` +
        `(lane ${laneIndex + 1}/${lanes.length}, ${batch.length} files)`
    );
    trace(
      JSON.stringify({
        batchNumber,
        totalBatches,
        kind: "lane",
        lane: laneIndex + 1,
        lanes: lanes.length,
        tests: batch,
      })
    );

    const result = run(
      process.execPath,
      [
        `--max-old-space-size=${heapMb}`,
        jestBin,
        "--runInBand",
        "--forceExit",
        "--runTestsByPath",
        ...batch,
      ],
      { echo: true }
    );

    if (result.status !== 0) {
      trace(
        JSON.stringify({
          batchNumber,
          totalBatches,
          kind: "lane",
          lane: laneIndex + 1,
          lanes: lanes.length,
          exitCode: result.status || 1,
          failed: true,
        })
      );
      process.exit(result.status || 1);
    }

    trace(
      JSON.stringify({
        batchNumber,
        totalBatches,
        kind: "lane",
        lane: laneIndex + 1,
        lanes: lanes.length,
        exitCode: 0,
        failed: false,
      })
    );
  }
}
