/**
 * Complete Playwright Test Suite Runner
 * Runs all integration and unit tests for frontend validation
 */

const { execSync } = require("child_process");

const TESTS = [
  // Phase 1: Foundation & Navigation
  {
    name: "Auth Flow",
    file: "tests/playwright/auth.spec.js",
    phase: 1,
    critical: true
  },
  {
    name: "Navigation",
    file: "tests/playwright/navigation.spec.js",
    phase: 1,
    critical: true
  },

  // Phase 2: Equipment (Live)
  {
    name: "Equipment CRUD (Live)",
    file: "tests/playwright/equipment-live.spec.js",
    phase: 2,
    critical: true
  },

  // Phase 3: Plants (Live)
  {
    name: "Plants Management (Live)",
    file: "tests/playwright/plants-live.spec.js",
    phase: 3,
    critical: true
  },

  // Phase 4: Grow Logs (Live)
  {
    name: "Grow Logs (Live)",
    file: "tests/playwright/grows.spec.js",
    phase: 4,
    critical: true
  },

  // Phase 5: Rooms, Tasks, Team
  {
    name: "Rooms Management (Live)",
    file: "tests/playwright/rooms-live.spec.js",
    phase: 5,
    critical: false
  },
  {
    name: "Tasks Management (Live)",
    file: "tests/playwright/tasks-live.spec.js",
    phase: 5,
    critical: false
  },

  // Phase 6: Compliance
  {
    name: "Compliance Features (Live)",
    file: "tests/playwright/compliance-live.spec.js",
    phase: 6,
    critical: false
  },

  // Phase 7: Commercial
  {
    name: "Commercial Features (Live)",
    file: "tests/playwright/commercial-live.spec.js",
    phase: 7,
    critical: false
  },

  // Unit & API Tests
  {
    name: "API Client Tests",
    file: "tests/unit/api.test.js",
    phase: 1,
    critical: true
  }
];

const args = process.argv.slice(2);
const filterPhase = args[0] ? parseInt(args[0]) : null;
const filterName = args[1];
const onlyCritical = args.includes("--critical");

const testsToRun = TESTS.filter((test) => {
  if (onlyCritical && !test.critical) return false;
  if (filterPhase && test.phase !== filterPhase) return false;
  if (filterName && !test.name.toLowerCase().includes(filterName.toLowerCase()))
    return false;
  return true;
});

console.log(`\n📋 Running ${testsToRun.length} Playwright test(s)...\n`);

let passed = 0;
let failed = 0;
const results = [];

for (const test of testsToRun) {
  console.log(`🧪 [Phase ${test.phase}] ${test.name}...`);

  try {
    execSync(`npx playwright test ${test.file}`, {
      cwd: process.cwd(),
      stdio: "pipe"
    });

    console.log(`   ✅ PASSED\n`);
    passed++;
    results.push({ name: test.name, status: "PASSED", phase: test.phase });
  } catch (error) {
    console.log(`   ❌ FAILED`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
    results.push({
      name: test.name,
      status: "FAILED",
      phase: test.phase,
      error: error.message
    });
  }
}

console.log("\n" + "=".repeat(60));
console.log("📊 TEST SUMMARY");
console.log("=".repeat(60));

const byPhase = {};
for (const result of results) {
  if (!byPhase[result.phase]) {
    byPhase[result.phase] = [];
  }
  byPhase[result.phase].push(result);
}

for (const phase of Object.keys(byPhase).sort()) {
  console.log(`\n📍 Phase ${phase}:`);
  for (const result of byPhase[phase]) {
    const icon = result.status === "PASSED" ? "✅" : "❌";
    console.log(`   ${icon} ${result.name}`);
  }
}

console.log("\n" + "=".repeat(60));
console.log(`✅ PASSED: ${passed}`);
console.log(`❌ FAILED: ${failed}`);
console.log(`📈 TOTAL:  ${passed + failed}`);
console.log("=".repeat(60) + "\n");

process.exit(failed > 0 ? 1 : 0);
