const base = require("./jest.plant-id-photo-first.config.cjs");
module.exports = { ...base, testTimeout: 15000,
  testMatch: ["<rootDir>/tests/unit/SpeciesCropIdToolScreen.test.tsx"],
  testNamePattern: [
    "reevaluates a legacy lighting rejection once under the detail-aware policy",
    "prevents an unchanged weak result from being upgraded to a named medium-confidence run"
  ].join("|")
};
