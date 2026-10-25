const base = require("./jest.plant-id-photo-first.config.cjs");
module.exports = {
  ...base,
  testMatch: ["<rootDir>/tests/unit/PlantIdModelTransport.test.ts", "<rootDir>/tests/unit/SpeciesCropIdToolScreen.test.tsx"],
  testNamePattern: "Plant ID model transport|Plant ID longer wait"
};
