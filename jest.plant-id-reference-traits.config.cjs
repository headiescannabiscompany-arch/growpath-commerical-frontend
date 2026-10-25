const base = require("./jest.plant-id-knowledge.config.cjs");
module.exports = { ...base,
  testMatch: ["<rootDir>/tests/unit/PlantIdReferenceTraits.test.tsx"],
  testNamePattern: "Plant ID reviewed trait context"
};
