"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const demo = require("../src/components/marketing/syntheticGrowDemo.json");
const audiences = require("../src/components/marketing/demoAudiences.json");
const demoStories = require("../src/components/marketing/demoStories.json");
const screenshots = require("../src/components/marketing/productScreenshots.json");
const {
  publicMarketingMarkup,
  marketingSchema,
  marketingCss,
  marketing
} = require("../scripts/public-marketing.cjs");
test("audit delta exposes existing paid-tool output twice without changing pricing terms", () => {
  const html = publicMarketingMarkup("pricing");
  assert.equal(
    (html.match(/Preview a history answer and grow comparison/g) || []).length,
    2
  );
  assert.equal((html.match(/href="\/demo\?story=pro"/g) || []).length, 2);
  assert.ok(
    html.includes("Actual app output using synthetic records, not a customer result")
  );
  assert.ok(html.includes("we do not promise an unconditional money-back guarantee"));
  assert.ok(
    publicMarketingMarkup("").includes("does not replace your required compliance system")
  );
});
test("no-signup demo includes all synthetic entries without JavaScript or private data", () => {
  const html = publicMarketingMarkup("demo");
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.equal((html.match(/<details/g) || []).length, 5);
  assert.ok(html.includes(demo.disclosure));
  for (const event of demo.events) assert.ok(html.includes(event.summary));
  assert.ok(html.includes(demo.photoAlt));
  assert.doesNotMatch(
    html.replaceAll("not a customer testimonial", ""),
    /growId=|token=|api\/grows|customer testimonial/i
  );
});
test("all demo roles have readable static highlights, labeled images and no baked testimonials", () => {
  const html = publicMarketingMarkup("demo");
  const escaped = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  for (const audience of audiences) {
    assert.ok(html.includes('id="demo-' + audience.id + '"'));
    assert.ok(html.includes(escaped(audience.limits)));
    assert.ok(html.includes(escaped(audience.caption)));
    assert.ok(html.includes('href="' + audience.image + '"'));
    assert.equal(html.split('src="' + audience.image + '"').length - 1, 1);
    assert.ok(
      fs.statSync(path.join(__dirname, "../public", audience.image)).size > 10000
    );
  }
  assert.doesNotMatch(html, /Feedback from growers|test-public-feedback|aggregateRating/);
});
test("all five shared stories and their scenes are readable without JavaScript", () => {
  const html = publicMarketingMarkup("demo");
  const escape = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  assert.deepEqual(Object.keys(demoStories), [
    "free",
    "pro",
    "seller",
    "creator",
    "facility"
  ]);
  assert.ok(html.includes("Five stories use four account types"));
  assert.ok(html.includes("Screenshot controls are not interactive."));
  const sections =
    html.match(
      /<section class="marketing-card" id="demo-story-[^>]+>[\s\S]*?<\/section>/g
    ) || [];
  assert.equal(sections.length, 5);
  for (const [id, story] of Object.entries(demoStories)) {
    const section = sections.find((value) =>
      value.includes('id="demo-story-' + id + '"')
    );
    assert.ok(section);
    assert.equal(story.id, id);
    assert.ok(html.includes('href="#demo-story-' + id + '"'));
    for (const value of [story.title, story.description, story.result, story.limits]) {
      assert.ok(section.includes(escape(value)), id + " includes its shared narrative");
    }
    assert.ok(
      section.includes('href="' + story.ctaHref + '">' + escape(story.ctaLabel) + "</a>")
    );
    assert.equal((section.match(/<li>/g) || []).length, story.scenes.length);
    assert.ok(story.scenes.length >= 2 && story.scenes.length <= 6);
    story.scenes.forEach((scene, index) => {
      assert.ok(
        section.includes(
          "Step " +
            (index + 1) +
            " of " +
            story.scenes.length +
            ": " +
            escape(scene.title)
        )
      );
      assert.ok(section.includes(escape(scene.body)));
      assert.ok(
        section.includes("<figcaption>" + escape(scene.caption) + "</figcaption>")
      );
      const image = '<img src="' + scene.image + '"';
      assert.ok(section.indexOf(escape(scene.caption)) < section.indexOf(image));
      assert.ok(section.includes('alt="' + escape(scene.alt) + '"'));
      assert.ok(
        section.includes(
          'width="' +
            scene.width +
            '" height="' +
            scene.height +
            '" loading="lazy" decoding="async"'
        )
      );
      assert.ok(
        section.includes(
          'href="' +
            scene.image +
            '">Open full-size screenshot: ' +
            escape(scene.title) +
            "</a>"
        )
      );
    });
  }
  assert.doesNotMatch(
    html,
    /<script|<iframe|<form|onload=|onclick=|aggregateRating|Feedback from growers/i
  );
});
test("story links use only fixed public enums and keep one demo document", () => {
  const html = publicMarketingMarkup("demo");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  const storyLinks = hrefs.filter((href) => href.startsWith("/demo"));
  assert.deepEqual(
    [...new Set(storyLinks)],
    [
      "/demo",
      "/demo?story=pro",
      "/demo?story=seller",
      "/demo?story=creator",
      "/demo?story=facility"
    ]
  );
  for (const href of storyLinks) {
    const url = new URL(href, "https://growpathai.com");
    assert.equal(url.pathname, "/demo");
    assert.equal(url.hash, "");
    assert.ok([...url.searchParams.keys()].every((key) => key === "story"));
  }
  for (const story of Object.values(demoStories)) {
    assert.ok(
      [
        "/register",
        "/pricing",
        "/grow-stores",
        "/creators-educators",
        "/facility-management"
      ].includes(story.ctaHref)
    );
  }
  for (const value of [
    "demo?story=pro",
    "demo?story=pro&token=private",
    "demo?story=constructor"
  ]) {
    assert.equal(publicMarketingMarkup(value), null);
  }
  assert.deepEqual(marketingSchema("demo"), []);
  assert.doesNotMatch(
    html,
    /rel="canonical"|growId=|recordId=|token=|referrer=|utm_|\/api\/|\/home\/|qa\.invalid|[a-f0-9]{24}/i
  );
});
test("every story uses existing bounded public synthetic screenshots", () => {
  const seenImages = new Set();
  for (const story of Object.values(demoStories)) {
    for (const scene of story.scenes) {
      assert.match(scene.image, /^\/images\/synthetic-story-[a-z0-9-]+\.jpg$/);
      assert.match(scene.caption, /synthetic|invented/i);
      assert.ok(scene.alt.length > 20);
      assert.ok(Number.isInteger(scene.width) && scene.width > 0 && scene.width <= 4096);
      assert.ok(
        Number.isInteger(scene.height) && scene.height > 0 && scene.height <= 4096
      );
      const bytes = fs.readFileSync(path.join(__dirname, "../public", scene.image));
      assert.deepEqual([...bytes.subarray(0, 3)], [255, 216, 255]);
      assert.ok(bytes.length > 1000, "story scene must have an actual image");
      seenImages.add(scene.image);
    }
  }
  assert.equal(seenImages.size, 14);
});
test("story prose is escaped and destination enums never come from supplied record fields", () => {
  const originalTitle = demoStories.free.title;
  const originalId = demoStories.free.id;
  try {
    demoStories.free.title = '<script>alert("unsafe")</script> & story';
    demoStories.free.id = "free&token=private";
    demoStories.unreviewed = { title: "Unreviewed extra story" };
    const html = publicMarketingMarkup("demo");
    assert.ok(
      html.includes("&lt;script&gt;alert(&quot;unsafe&quot;)&lt;/script&gt; &amp; story")
    );
    assert.doesNotMatch(html, /<script|free&token=|Unreviewed extra story/);
    assert.ok(html.includes('id="demo-story-free"'));
  } finally {
    demoStories.free.title = originalTitle;
    demoStories.free.id = originalId;
    delete demoStories.unreviewed;
  }
});
test("public acquisition pages offer the preview before registration", () => {
  for (const [route, href, label] of [
    ["", "/demo", "Try the sample journal"],
    ["features", "/demo", "Try the sample journal"],
    ["personal-grower", "/demo?story=free", "See the Free plant journal"],
    ["pricing", "/demo", "Try the sample journal"],
    ["grow-journal-app", "/demo?story=pro", "See the Pro grow-record workflow"]
  ])
    assert.ok(
      publicMarketingMarkup(route).includes(
        '<a class="secondary" href="' + href + '">' + label + "</a>"
      )
    );
  assert.ok(publicMarketingMarkup("about").includes('href="/features">Explore features'));
});
test("audience crawler CTAs and explanations match the reviewed public page copy", () => {
  const escape = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  for (const [route, story, label] of [
    ["personal-grower", "free", "See the Free plant journal"],
    ["grow-journal-app", "pro", "See the Pro grow-record workflow"],
    ["commercial-cultivation", "seller", "See the seller workflow"],
    ["grow-stores", "seller", "See the seller workflow"],
    ["creators-educators", "creator", "See the creator workflow"],
    ["facility-management", "facility", "See the Facility team workflow"],
    ["nurseries-breeders", "facility", "See shared team records"]
  ]) {
    const copy = marketing.pages[route];
    const html = publicMarketingMarkup(route);
    const hero = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0];
    assert.ok(hero);
    assert.deepEqual(copy.demoAction, { href: "/demo?story=" + story, label });
    assert.ok(
      hero.includes(
        '<a class="secondary" href="/demo?story=' + story + '">' + label + "</a>"
      )
    );
    const primary = copy.primaryAction ?? {
      href: "/register",
      label: "Create free account"
    };
    assert.ok(
      hero.includes(
        '<a class="primary" href="' +
          escape(primary.href) +
          '">' +
          escape(primary.label) +
          "</a>"
      )
    );
    assert.ok(hero.includes(escape(copy.intro)));
    for (const section of copy.sections) {
      assert.ok(html.includes("<h2>" + escape(section.title) + "</h2>"));
      assert.ok(html.includes(escape(section.body)));
      if (section.href)
        assert.ok(
          html.includes(
            '<a href="' + escape(section.href) + '">' + escape(section.linkLabel) + "</a>"
          )
        );
    }
    assert.doesNotMatch(hero, /growId=|recordId=|token=|utm_|\/home\//i);
  }
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
test("reviewed product images have matching public captions, alt text and real JPEG or PNG assets", () => {
  for (const shot of screenshots) {
    for (const route of shot.pages) {
      const html = publicMarketingMarkup(route);
      assert.ok(html.includes(shot.alt));
      assert.ok(html.includes(shot.caption));
      assert.ok(html.includes('href="' + shot.image + '"'));
      assert.ok(html.indexOf(shot.caption) < html.indexOf('src="' + shot.image + '"'));
    }
    const bytes = fs.readFileSync(path.join(__dirname, "../public", shot.image));
    const signatures = {
      ".jpg": [255, 216, 255],
      ".png": [137, 80, 78, 71, 13, 10, 26, 10]
    };
    const signature = signatures[path.extname(shot.image)];
    assert.ok(signature, "reviewed screenshots must use a supported image format");
    assert.deepEqual([...bytes.subarray(0, signature.length)], signature);
    assert.ok(bytes.length > 10000);
    assert.match(shot.caption, /synthetic/i);
  }
  for (const route of ["about", "pricing", "contact"]) {
    assert.ok(!publicMarketingMarkup(route).includes(screenshots[0].image));
    assert.ok(!publicMarketingMarkup(route).includes(screenshots[1].image));
  }
});
test("Commercial crawler pages use Commercial offers evidence instead of Facility imagery", () => {
  const commercial = screenshots.find((shot) => shot.id === "commercial");
  const facility = screenshots.find((shot) => shot.id === "facility");
  assert.ok(commercial && facility);
  for (const route of ["commercial-cultivation", "grow-stores"]) {
    const html = publicMarketingMarkup(route);
    assert.ok(html.includes('src="' + commercial.image + '"'));
    assert.ok(html.includes(commercial.caption));
    assert.match(
      commercial.caption,
      /synthetic QA fixtures, not real sales, customer reviews/
    );
    assert.ok(
      html.includes(
        '<a href="' +
          commercial.image +
          '">Open full-size Commercial offers screenshot</a>'
      )
    );
    assert.ok(
      html.includes('width="' + commercial.width + '" height="' + commercial.height + '"')
    );
    assert.ok(!html.includes(facility.image));
  }
  assert.ok(publicMarketingMarkup("facility-management").includes(facility.image));
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
  assert.ok(publicMarketingMarkup("").includes("/images/founder-jay.jpg"));
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
  assert.ok(html.includes(marketing.founder.homeStory));
  assert.ok(html.includes(marketing.founder.businessLine));
  assert.ok(html.includes("<h2>Meet Jay</h2>"));
});

test("audit delta uses grower outcomes and conditional alternative-cost anchoring", () => {
  assert.match(
    marketing.pages.home.sections[0].body,
    /repeat what worked instead of guessing/
  );
  assert.match(marketing.pages["personal-grower"].intro, /Take your growing seriously/);
  const html = publicMarketingMarkup("pricing");
  assert.ok(html.includes(marketing.pricingAlternativeAnchor));
  assert.match(
    marketing.pricingAlternativeAnchor,
    /Your savings depend on the tools you replace/
  );
  assert.ok(
    html.indexOf(marketing.pricingAlternativeAnchor) <
      html.indexOf("For growers who need more room")
  );
  assert.ok(!publicMarketingMarkup("").includes(marketing.pricingAlternativeAnchor));
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
  assert.equal(
    marketing.founder.socialUrl,
    "https://www.linkedin.com/in/johnabrahamcollins1979"
  );
  assert.deepEqual(marketing.proof, {
    verifiedGrowerCount: null,
    stories: [],
    thirdPartyMentions: [],
    screenshots: []
  });
  assert.deepEqual(marketingSchema("about"), []);
});

test("static founder links match the owner-provided professional profile", () => {
  for (const route of ["", "about"]) {
    const html = publicMarketingMarkup(route);
    assert.match(
      html,
      /href="https:\/\/www\.linkedin\.com\/in\/johnabrahamcollins1979">Jay on LinkedIn<\/a>/
    );
    assert.ok(!html.includes("utm_source="));
  }
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
