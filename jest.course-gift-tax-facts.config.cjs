const base = require("./jest.course-gift-seller-facts.config.cjs");
module.exports = { ...base,
  testMatch: [
    "<rootDir>/tests/unit/CourseGiftSellerTaxFacts.test.tsx",
    "<rootDir>/tests/unit/CourseGiftSellerFacts.test.tsx",
    "<rootDir>/tests/unit/CourseGiftSaleBinding.test.tsx"
  ],
  testNamePattern: "^R09 creator tax declaration UI |^saved facts prefill without inferring the new format and require renewed authority$|^buyer review displays authorized contacts and course facts as seller-provided$|^R09-03E internal creator and buyer screens loads creator terms, requires explicit acceptance and saves through the HTTP binding$"
};
