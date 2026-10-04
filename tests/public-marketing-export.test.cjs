"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  publicMarketingMarkup,
  marketingSchema,
  marketing
} = require("../scripts/public-marketing.cjs");
test("crawler markup and displayed content use one copy source and one h1", () => {
  for (const [key, page] of Object.entries(marketing.pages)) {
    const html = publicMarketingMarkup(key === "home" ? "" : key);
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.ok(html.includes(page.title));
    assert.ok(html.includes('href="/pricing"'));
  }
});
test("all four actual monthly offers are represented without fake reviews", () => {
  for (const route of ["", "pricing"]) {
    const app = marketingSchema(route).find((x) => x["@type"] === "SoftwareApplication");
    assert.deepEqual(
      app.offers.map((o) => o.price),
      ["0", "10", "50", "100"]
    );
    assert.ok(!app.aggregateRating);
    assert.ok(app.offers.every((o) => o.priceSpecification.unitText === "MONTH"));
  }
});
test("FAQ schema exactly matches visible pricing answers", () => {
  const faq = marketingSchema("pricing").find((x) => x["@type"] === "FAQPage");
  assert.deepEqual(
    faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]),
    marketing.pricingFaq.map((f) => [f.title, f.body])
  );
  assert.ok(!marketingSchema("").some((x) => x["@type"] === "FAQPage"));
});
