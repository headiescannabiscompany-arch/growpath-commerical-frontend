const base = require("./jest.plant-id-knowledge.config.cjs");
module.exports = { ...base, testMatch: ["<rootDir>/tests/unit/PlantIdBestMatch.test.tsx", "<rootDir>/tests/unit/PlantIdKnowledge.test.tsx"],
  testNamePattern: "Plant ID best-match display|headlines the best common candidate|an unusable photo cannot supply|shows source provenance and related-genus limits" };
