"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const demo = require("../src/components/marketing/syntheticGrowDemo.json");
const {
  publicMarketingMarkup,
  marketingSchema,
  marketingCss,
  marketing
} = require("../scripts/public-marketing.cjs");
test("no-signup demo includes all synthetic entries without JavaScript or private data", () => {
  const html = publicMarketingMarkup("demo");
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.equal((html.match(/<details/g) || []).length, 5);
  assert.ok(html.includes(demo.disclosure));
  for (const event of demo.events) assert.ok(html.includes(event.summary));
  assert.ok(html.includes(demo.photoAlt));
  assert.doesNotMatch(html, /growId=|token=|api\/grows|customer testimonial/i);
});
test("public acquisition pages offer the preview before registration", () => {
  for (const route of ["", "features", "personal-grower", "pricing", "grow-journal-app"])
    assert.ok(
      publicMarketingMarkup(route).includes('href="/demo">Try the sample journal')
    );
  assert.ok(publicMarketingMarkup("about").includes('href="/features">Explore features'));
});
test("actual screenshot has an explicit synthetic caption and is not an empty placeholder", () => {
  for (const route of ["", "features", "personal-grower"]) {
    const html = publicMarketingMarkup(route);
    assert.ok(html.includes(demo.screenshotAlt));
    assert.ok(html.includes(demo.screenshotCaption));
  }
  const image = fs.readFileSync(path.join(__dirname, "../public", demo.screenshot));
  assert.ok(image.length > 10000);
  assert.deepEqual([...image.subarray(0, 3)], [255, 216, 255]);
});
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

test("About exports the supplied accessible portrait using its actual public asset", () => {
  const html = publicMarketingMarkup("about");
  const images = html.match(/<img\b[^>]*>/g) || [];
  assert.equal(images.length, 1);
  assert.match(images[0], /src="\/images\/founder-jay\.jpg"/);
  assert.match(images[0], /alt="Jay, founder of GrowPathAI"/);
  assert.match(images[0], /width="192" height="240"/);
  assert.match(images[0], /max-width:100%;object-fit:contain/);
  const meetJay = html.match(/<section\b[^>]*><h2>Meet Jay<\/h2>[\s\S]*?<\/section>/);
  assert.ok(meetJay && meetJay[0].includes(images[0]));

  const asset = fs.readFileSync(path.join(__dirname, "../public/images/founder-jay.jpg"));
  assert.deepEqual([...asset.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  assert.ok(asset.length > 1000, "the portrait must be a real JPEG, not a placeholder");
  assert.ok(!publicMarketingMarkup("").includes("/images/founder-jay.jpg"));
});

test("homepage founder mention uses the supplied channel in the footer area", () => {
  const html = publicMarketingMarkup("");
  const mention = "Built by Jay, host of Exploring the Growing Universe.";
  assert.equal(marketing.founder.homeMention, mention);
  assert.equal(html.split(mention).length - 1, 1);
  assert.ok(
    html.includes('<a href="https://youtube.com/@etgujay">Watch the show on YouTube</a>')
  );
  assert.ok(html.indexOf(mention) > html.indexOf("Your records, your decisions"));
  assert.ok(html.indexOf(mention) < html.indexOf("See what has actually shipped"));
  assert.ok(!html.slice(0, html.indexOf("</header>")).includes(mention));
});

test("Pro value anchor follows annual savings only in its pricing card", () => {
  const html = publicMarketingMarkup("pricing");
  const value =
    "At the 10-grow plan limit, $10/month works out to $1 per tracked grow per month.";
  assert.equal(marketing.pricingValueAnchor, value);
  assert.equal(html.split(value).length - 1, 1);
  const sections = html.match(/<section\b[^>]*>[\s\S]*?<\/section>/g) || [];
  const pro = sections.find((section) => section.includes("Pro Grower — $10/month"));
  assert.ok(pro && pro.includes(value));
  assert.ok(pro.indexOf(value) > pro.indexOf("Annual billing saves 2 months"));
  assert.ok(
    sections
      .filter((section) => section !== pro)
      .every((section) => !section.includes(value))
  );
  assert.ok(!publicMarketingMarkup("").includes(value));
  assert.ok(!/cost of nutrients|nutrient cost/i.test(html));
});

test("crawler copy matches the explicit shared-team pricing and photo-feed scope", () => {
  const pricing =
    "Priced by what you do, not per seat: one Facility subscription covers its team workspace, with shared plan limits.";
  const scope =
    "If you only want a photo feed for bud shots, this is probably more structure than you need.";
  assert.ok(marketing.pages.pricing.intro.includes(pricing));
  assert.ok(publicMarketingMarkup("pricing").includes(pricing));
  assert.ok(marketing.scope.includes(scope));
  for (const route of ["", "personal-grower"])
    assert.ok(publicMarketingMarkup(route).includes(scope));
});

test("quick wins preserve plan amounts and leave unsupported proof unpublished", () => {
  assert.deepEqual(
    marketing.plans.map(
      ({ id, monthly, annual, grows, plants, credits, paidCourses, lessons }) => [
        id,
        monthly,
        annual,
        grows,
        plants,
        credits,
        paidCourses,
        lessons
      ]
    ),
    [
      ["free", 0, 0, 1, 1, 5, 1, 7],
      ["pro", 10, 100, 10, 50, 100, 5, 20],
      ["commercial", 50, 500, 50, 500, 500, 50, 100],
      ["facility", 100, 1000, 200, 2000, 2000, 50, 100]
    ]
  );
  assert.ok(marketing.founder.story.includes("I wanted a place for growers"));
  assert.ok(publicMarketingMarkup("about").includes(marketing.founder.story));
  assert.equal(marketing.founder.socialUrl, null);
  assert.deepEqual(marketing.proof, {
    verifiedGrowerCount: null,
    stories: [],
    thirdPartyMentions: [],
    screenshots: []
  });
  assert.deepEqual(marketingSchema("about"), []);
});

test("founder history preserves owner-supplied dates without asserting a launch or shipped future products", () => {
  const html = publicMarketingMarkup("about");
  assert.ok(html.includes("June 2025"));
  assert.ok(html.includes("August 4, 2025"));
  assert.ok(
    html.includes("not a confirmed first-concept date or a public product launch")
  );
  assert.ok(html.includes("I may have had the original concept earlier"));
  assert.ok(html.includes("I do not have a confirmed date for that first idea"));
  assert.ok(
    html.includes("My starting point was the idea of a choose-your-own-adventure book")
  );
  assert.ok(html.includes("I later turned that idea into GrowPathAI"));
  assert.ok(!html.includes("On August 4, 2025, the idea"));
  assert.ok(html.includes("Future ambitions below are not a list of shipped features"));
  assert.ok(html.includes("Jorge Cervantes"));
  assert.ok(html.includes("was one inspiration for GrowPathAI"));
  assert.ok(html.includes("it does not use his framework"));
  assert.ok(!html.includes("became the LAWNS framework"));
  for (const section of marketing.founder.historySections) {
    assert.ok(html.includes(section.title));
  }
  assert.ok(!publicMarketingMarkup("").includes(marketing.founder.historyTitle));
  assert.deepEqual(marketingSchema("about"), []);
});

test("every public footer links the new comparison and grow-journal pages", () => {
  for (const key of Object.keys(marketing.pages)) {
    const html = publicMarketingMarkup(key === "home" ? "" : key);
    const footer = html.match(/<footer>[\s\S]*?<\/footer>/)?.[0];
    assert.ok(footer);
    assert.ok(footer.includes('<a href="/vs/growtrackr">Compare GrowTrackr</a>'));
    assert.ok(footer.includes('<a href="/grow-journal-app">Grow journal app</a>'));
  }
});

test("new crawler pages publish their shared copy without changing pricing schema", () => {
  const escape = (text) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  for (const route of ["vs/growtrackr", "grow-journal-app"]) {
    const copy = marketing.pages[route];
    assert.ok(copy, `${route} requires authored page copy`);
    const html = publicMarketingMarkup(route);
    assert.ok(html.includes(`<h1>${escape(copy.title)}</h1>`));
    assert.ok(html.includes(escape(copy.intro)));
    for (const section of copy.sections) {
      assert.ok(html.includes(`<h2>${escape(section.title)}</h2>`));
      assert.ok(html.includes(escape(section.body)));
      if (section.href) assert.ok(html.includes(`href="${escape(section.href)}"`));
    }
    assert.deepEqual(marketingSchema(route), []);
  }
});

test("public navigation and CTAs have 44px targets without removing compact layout or focus", () => {
  const rules = [...marketingCss.matchAll(/([^{}]+)\{([^{}]+)\}/g)];
  const declarationsFor = (selector) =>
    Object.fromEntries(
      rules
        .filter(([, selectors]) =>
          selectors
            .split(",")
            .map((part) => part.trim())
            .includes(selector)
        )
        .flatMap(([, , body]) =>
          body
            .split(";")
            .filter(Boolean)
            .map((declaration) => declaration.split(":"))
        )
    );
  for (const selector of [
    ".marketing nav a",
    ".marketing footer a",
    ".marketing-actions a"
  ]) {
    const declarations = declarationsFor(selector);
    assert.equal(declarations["min-height"], "44px");
    assert.equal(declarations["box-sizing"], "border-box");
    assert.equal(declarations.display, "inline-flex");
    assert.equal(declarations["align-items"], "center");
  }
  for (const selector of [".marketing nav a", ".marketing footer a"])
    assert.equal(declarationsFor(selector)["min-width"], "44px");
  assert.equal(declarationsFor(".marketing-actions .secondary").padding, "11px 18px");
  assert.match(marketingCss, /@media\(max-width:599px\)/);
  assert.match(
    marketingCss,
    /\.marketing-actions\{align-items:stretch;flex-direction:column\}/
  );
  assert.equal(
    declarationsFor(".marketing a:focus-visible").outline,
    "3px solid #176537"
  );
});

test("GrowTrackr comparison cites its sources and distinguishes local-first from cloud-backed", () => {
  const page = marketing.pages["vs/growtrackr"];
  const copy = page.sections.map((section) => section.body).join(" ");
  assert.match(page.title, /cloud-backed or local-first/);
  assert.ok(copy.includes("$59 once, rather than a monthly or annual subscription"));
  assert.ok(copy.includes("GrowPathAI is not an offline-only journal."));
  assert.ok(copy.includes("Neither approach guarantees a correct answer."));
  assert.ok(
    copy.includes("This comparison is written by GrowPathAI, not an independent review.")
  );
  assert.deepEqual(
    page.sections
      .filter((section) => section.href.startsWith("https://"))
      .map((section) => section.href),
    [
      "https://growtrackr.app/pricing",
      "https://growtrackr.app/ai-integrations",
      "https://growtrackr.app/privacy-and-security",
      "https://growtrackr.app/blog/grow-tent-data-logging",
      "https://growtrackr.app/features"
    ]
  );
});

test("grow-journal guide links the actual workflow, limits, and alternative comparisons", () => {
  const page = marketing.pages["grow-journal-app"];
  assert.deepEqual(
    page.sections.map((section) => section.href),
    ["/personal-grower", "/features", "/pricing", "/vs/growtrackr", "/vs/grow-with-jane"]
  );
  const copy = page.sections.map((section) => section.body).join(" ");
  assert.ok(copy.includes("1 tracked grow, 1 plant, and 5 AI credits each week"));
  assert.ok(copy.includes("A timeline PDF is not a complete original-photo backup."));
});
