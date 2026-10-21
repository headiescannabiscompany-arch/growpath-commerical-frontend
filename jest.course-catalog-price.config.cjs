module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: ["<rootDir>/tests/unit/CourseCatalogPrice.test.tsx"],
  testNamePattern: "^R09-04T catalog price ",
  collectCoverage: false
};
