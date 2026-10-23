const base = require("./jest.config.cjs");
module.exports = {
  ...base,
  cache: false,
  maxWorkers: 1,
  collectCoverage: false,
  testMatch: ["<rootDir>/tests/unit/SpeciesCropIdToolScreen.test.tsx"],
  setupFilesAfterEnv: [
    ...base.setupFilesAfterEnv,
    "<rootDir>/tests/fixtures/plantIdPhotoFirstIsolation.cjs"
  ],
  testNamePattern: [
    "Plant ID photo-first recovery",
    "blocks identification until every selected evidence upload finishes",
    "does not claim image analysis after a manual no-media calculation",
    "preserves user-entered protected context when AI returns conflicting values",
    "prefills defensible visible context but not measurements",
    "rejects prohibited fields from a noncompliant AI reply",
    "invalidates AI results and restores manual-only fields when evidence changes",
    "discards an AI reply when the evidence changes during image analysis",
    "discards a calculator result when the evidence changes during calculation",
    "does not start AI prefill while a manual calculator run is active",
    "does not start a manual calculator run while AI prefill is active",
    "removes the prior result when a same-evidence AI retry fails"
  ].join("|")
};
