module.exports = {
  ...require("./jest.config.cjs"),
  testMatch: ["<rootDir>/tests/unit/CourseCatalogSource.test.tsx"],
  testNamePattern: "^R09-04W catalog source selection ",
  collectCoverage: false
};
