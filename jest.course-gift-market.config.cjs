const base = require("./jest.config.cjs");
module.exports = {
  ...base,
  setupFiles: [...base.setupFiles, "<rootDir>/tests/fixtures/courseGiftSellerDisclosureIsolation.cjs"],
  collectCoverage: false,
  maxWorkers: 1,
  testMatch: ["<rootDir>/tests/unit/courseGiftMarket.test.ts", "<rootDir>/tests/unit/CourseGiftSaleBinding.test.tsx"],
  testNamePattern: "R09 launch country|renders server recipient/price/all terms|requires a new server review after editing recipient"
};
