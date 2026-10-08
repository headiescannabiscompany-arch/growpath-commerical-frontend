"use strict";
const marketing = require("../src/components/marketing/publicMarketing.json");
const demo = require("../src/components/marketing/syntheticGrowDemo.json");
const demoAudiences = require("../src/components/marketing/demoAudiences.json");
const demoStories = require("../src/components/marketing/demoStories.json");
const screenshots = require("../src/components/marketing/productScreenshots.json");
const demoStoryIds = ["free", "pro", "seller", "creator", "facility"];
const escape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const routeKey = (route) => route || "home";
const comparisonRows = [
  ["Tracked grows", "grows"],
  ["Tracked plants", "plants"],
  ["AI credits per week", "credits"],
  ["Published paid courses", "paidCourses"],
  ["Lessons per course", "lessons"]
];
const links = [
  ["Features", "/features"],
  ["Pricing", "/pricing"],
  ["Store", "/store"],
  ["Courses", "/courses"],
  ["Forum", "/forum"],
  ["About", "/about"],
  ["Sign in", "/login"]
];
const footer = [
  ["About", "/about"],
  ["Contact", "/contact"],
  ["Updates", "/updates"],
  ["Nurseries & breeders", "/nurseries-breeders"],
  ["Grow stores", "/grow-stores"],
  ["Compare PLNTRK", "/vs/plntrk"],
  ["Compare Grow with Jane", "/vs/grow-with-jane"],
  ["Compare GrowTrackr", "/vs/growtrackr"],
  ["Grow journal app", "/grow-journal-app"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["AI disclaimer", "/ai-cultivation-disclaimer"]
];
const anchor = ([label, href]) =>
  '<a href="' + escape(href) + '">' + escape(label) + "</a>";
const paidOutputPreview =
  '<p><a href="/demo?story=pro">Preview a history answer and grow comparison — no signup</a></p><p>Actual app output using synthetic records, not a customer result. See what the tools produce before paying; these tools are not exclusive to Pro.</p>';

function publicMarketingMarkup(route) {
  if (route === "demo") return publicDemoMarkup();
  const page = routeKey(route);
  const copy = marketing.pages[page];
  if (!copy) return null;
  const grower = page === "home" || page === "personal-grower";
  const showDemo = [
    "home",
    "features",
    "personal-grower",
    "pricing",
    "grow-journal-app"
  ].includes(page);
  const primaryAction = copy.primaryAction ?? {
    href: "/register",
    label: "Create free account"
  };
  const demoAction = copy.demoAction ?? {
    href: showDemo ? "/demo" : "/features",
    label: showDemo ? "Try the sample journal" : "Explore features"
  };
  const sections = copy.sections
    .map(
      (section, i) =>
        '<section class="marketing-card' +
        (page === "home" && i === 0 ? " primary-path" : "") +
        (page === "pricing" && i === 1 ? " recommended" : "") +
        '">' +
        (page === "pricing" && i === 1
          ? "<p><strong>Recommended for growing beyond Free</strong></p>"
          : "") +
        "<h2>" +
        escape(section.title) +
        "</h2>" +
        (page === "pricing" && i === 1
          ? "<p>" + escape(marketing.pricingAlternativeAnchor) + "</p>"
          : "") +
        (page === "pricing" && i === 1 ? paidOutputPreview : "") +
        (page === "about" &&
        section.title === "Meet Jay" &&
        marketing.founder.photo &&
        marketing.founder.photoAlt
          ? '<img src="' +
            escape(marketing.founder.photo) +
            '" alt="' +
            escape(marketing.founder.photoAlt) +
            '" width="192" height="240" style="max-width:100%;object-fit:contain" />'
          : "") +
        "<p>" +
        escape(section.body) +
        "</p>" +
        (page === "about" && section.title === "Meet Jay" && marketing.founder.story
          ? "<p>" + escape(marketing.founder.story) + "</p>"
          : "") +
        (section.href ? anchor([section.linkLabel, section.href]) : "") +
        (page === "about" && section.title === "Meet Jay" && marketing.founder.socialUrl
          ? "<p>" + anchor(["Jay on LinkedIn", marketing.founder.socialUrl]) + "</p>"
          : "") +
        (page === "pricing" && i > 0
          ? "<p>Annual billing saves 2 months compared with paying monthly for a year.</p>"
          : "") +
        (page === "pricing" && i === 1 && marketing.pricingValueAnchor
          ? "<p>" + escape(marketing.pricingValueAnchor) + "</p>"
          : "") +
        "</section>"
    )
    .join("");
  const table =
    '<section class="marketing-card"><h2>Compare plan allowances</h2><p>Standard plan limits. Facility AI credits are shared by its workspace. Individual grants or trials can differ; your account shows your current allowance.</p><div class="table-scroll" role="region" tabindex="0" aria-label="Plan comparison, scroll horizontally on small screens"><table><caption>Choose by the work you need to do</caption><thead><tr><th scope="col">Allowance</th>' +
    marketing.plans.map((p) => '<th scope="col">' + escape(p.name) + "</th>").join("") +
    "</tr></thead><tbody>" +
    comparisonRows
      .map(
        ([label, key]) =>
          '<tr><th scope="row">' +
          label +
          "</th>" +
          marketing.plans
            .map((p) => "<td>" + p[key].toLocaleString("en-US") + "</td>")
            .join("") +
          "</tr>"
      )
      .join("") +
    "</tbody></table></div></section>";
  const faq =
    '<section class="marketing-card"><h2>Before you choose a plan</h2>' +
    marketing.pricingFaq
      .map(
        (f) =>
          "<h3>" +
          escape(f.title) +
          "</h3><p>" +
          escape(f.body) +
          "</p>" +
          (f.title === "How do payments and cancellation work?" ? paidOutputPreview : "")
      )
      .join("") +
    "<p>" +
    anchor(["Read Terms of Service", "/terms"]) +
    " · " +
    anchor(["Read Privacy Policy", "/privacy"]) +
    "</p></section>";
  return (
    '<main id="seo-content" class="marketing"><nav aria-label="GrowPathAI public pages"><a class="brand" href="/">GrowPathAI</a>' +
    links.map(anchor).join(" ") +
    '</nav><header class="marketing-hero"><p>' +
    escape(copy.eyebrow) +
    "</p><h1>" +
    escape(copy.title) +
    "</h1><p>" +
    escape(copy.intro) +
    '</p><div class="marketing-actions"><a class="primary" href="' +
    escape(primaryAction.href) +
    '">' +
    escape(primaryAction.label) +
    '</a><a class="secondary" href="' +
    escape(demoAction.href) +
    '">' +
    escape(demoAction.label) +
    "</a></div></header>" +
    (grower || page === "pricing"
      ? "<p>Free account. No payment card required. Your content stays yours.</p>"
      : "") +
    (["home", "features", "personal-grower"].includes(page)
      ? '<section class="marketing-card"><h2>See the notes behind each timeline point</h2><p>A starting photo, an observation, a change and a follow-up, together in one journal. Open the sample and select a point to read its entry.</p><a href="/demo" aria-label="Open the synthetic sample journal"><img src="' +
        escape(demo.screenshot) +
        '" alt="' +
        escape(demo.screenshotAlt) +
        '" width="1280" height="1000" loading="lazy" style="width:100%;height:auto;border-radius:12px" /></a><p>' +
        escape(demo.screenshotCaption) +
        '</p><a href="/demo">Try the sample journal — no signup</a></section>'
      : "") +
    productScreenshotMarkup(page) +
    '<div class="marketing-grid">' +
    sections +
    "</div>" +
    (page === "pricing" ? table + faq : "") +
    (grower
      ? '<section class="marketing-card"><h2>Your records, your decisions</h2><p>' +
        escape(marketing.scope) +
        "</p>" +
        anchor(["See exact limits, exports, and data-ownership answers", "/pricing"]) +
        "</section>"
      : "") +
    (page === "home" && marketing.founder.homeMention
      ? '<section class="marketing-card"><h2>Meet Jay</h2><img src="' +
        escape(marketing.founder.photo) +
        '" alt="' +
        escape(marketing.founder.photoAlt) +
        '" width="192" height="240" loading="lazy" style="max-width:100%;object-fit:contain" /><p>' +
        escape(marketing.founder.homeMention) +
        "</p><p>" +
        escape(marketing.founder.homeStory) +
        "</p><p>" +
        escape(marketing.founder.businessLine) +
        "</p>" +
        anchor(["Watch the show on YouTube", marketing.founder.showUrl]) +
        "<p>" +
        anchor(["Read Jay's founder story", "/about"]) +
        "</p>" +
        (marketing.founder.socialUrl
          ? "<p>" + anchor(["Jay on LinkedIn", marketing.founder.socialUrl]) + "</p>"
          : "") +
        "</section>"
      : "") +
    (page === "about"
      ? '<section class="marketing-card"><h2>' +
        escape(marketing.founder.historyTitle) +
        "</h2><p>" +
        escape(marketing.founder.historyNote) +
        "</p>" +
        marketing.founder.historySections
          .map(
            (section) =>
              "<h3>" + escape(section.title) + "</h3><p>" + escape(section.body) + "</p>"
          )
          .join("") +
        "</section>"
      : "") +
    (page === "home" || page === "about"
      ? '<section class="marketing-card"><h2>See what has actually shipped</h2><p>Our Updates page separates live releases from work still in progress. Read the dated release notes before counting on a feature.</p>' +
        anchor(["Read product updates", "/updates"]) +
        "</section>"
      : "") +
    "<footer>" +
    footer.map(anchor).join(" ") +
    "</footer></main>"
  );
}
function productScreenshotMarkup(page) {
  return screenshots
    .filter((shot) => shot.pages.includes(page))
    .map(
      (shot) =>
        '<section class="marketing-card"><h2>' +
        escape(shot.title) +
        "</h2><p>" +
        escape(shot.description) +
        "</p><p>" +
        escape(shot.caption) +
        '</p><img src="' +
        escape(shot.image) +
        '" alt="' +
        escape(shot.alt) +
        '" width="' +
        shot.width +
        '" height="' +
        shot.height +
        '" loading="lazy" style="display:block;width:100%;max-width:' +
        shot.width +
        'px;height:auto;border-radius:12px;margin:auto" />' +
        '<a href="' +
        escape(shot.image) +
        '">Open full-size ' +
        escape(
          shot.fullSizeLabel ??
            (shot.id === "diagnosis" ? "diagnosis form" : "Facility dashboard")
        ) +
        " screenshot</a></section>"
    )
    .join("");
}
function demoExplorerMarkup() {
  return (
    "<section><h2>More account-type highlights</h2><p>Explore the four existing plans. Sellers and creators both use Commercial; these bundled examples do not open a signed-in workspace.</p>" +
    '<nav aria-label="Demo account types">' +
    demoAudiences
      .map(
        (item) => '<a href="#demo-' + escape(item.id) + '">' + escape(item.label) + "</a>"
      )
      .join(" ") +
    "</nav>" +
    demoAudiences
      .map(
        (item) =>
          '<section class="marketing-card" id="demo-' +
          escape(item.id) +
          '"><h3>' +
          escape(item.title) +
          "</h3><p>" +
          escape(item.description) +
          "</p><ul>" +
          item.highlights.map((line) => "<li>" + escape(line) + "</li>").join("") +
          "</ul><p>" +
          escape(item.limits) +
          "</p><p>" +
          escape(item.caption) +
          '</p><img src="' +
          escape(item.image) +
          '" alt="' +
          escape(item.alt) +
          '" width="' +
          item.width +
          '" height="' +
          item.height +
          '" loading="lazy" style="display:block;width:100%;max-width:' +
          item.width +
          'px;height:auto;margin:auto" />' +
          '<p><a href="' +
          escape(item.image) +
          '">Open full-size ' +
          escape(item.label) +
          " screenshot</a></p>" +
          '<a href="' +
          escape(item.href) +
          '">' +
          escape(item.linkLabel) +
          "</a></section>"
      )
      .join("") +
    "</section>"
  );
}
function demoStoriesMarkup() {
  return (
    "<section><h2>Explore by story</h2><p>Choose the work you want to do. Five stories use four account types: sellers and creators both use Commercial. These are guided highlights with screenshots, not signed-in workspaces. The interactive sample journal follows below.</p>" +
    '<nav aria-label="Demo stories">' +
    demoStoryIds
      .map(
        (id) =>
          '<a href="#demo-story-' + id + '">' + escape(demoStories[id].title) + "</a>"
      )
      .join(" ") +
    "</nav>" +
    demoStoryIds
      .map((id) => {
        const story = demoStories[id];
        // Only these bundled enum keys construct destinations; no incoming URL data.
        const storyPath = id === "free" ? "/demo" : "/demo?story=" + id;
        return (
          '<section class="marketing-card" id="demo-story-' +
          id +
          '"><h3>' +
          escape(story.title) +
          "</h3><p>" +
          escape(story.description) +
          "</p><p>Read-only walkthrough with synthetic example records. Screenshot controls are not interactive.</p><ol>" +
          story.scenes
            .map(
              (scene, index) =>
                "<li><h4>Step " +
                (index + 1) +
                " of " +
                story.scenes.length +
                ": " +
                escape(scene.title) +
                "</h4><p>" +
                escape(scene.body) +
                '</p><figure style="margin:0 0 24px"><figcaption>' +
                escape(scene.caption) +
                '</figcaption><img src="' +
                escape(scene.image) +
                '" alt="' +
                escape(scene.alt) +
                '" width="' +
                escape(scene.width) +
                '" height="' +
                escape(scene.height) +
                '" loading="lazy" decoding="async" style="display:block;width:100%;max-width:' +
                escape(scene.width) +
                'px;height:auto;margin:auto" /><p><a href="' +
                escape(scene.image) +
                '">Open full-size screenshot: ' +
                escape(scene.title) +
                "</a></p></figure></li>"
            )
            .join("") +
          "</ol><h4>What this example shows</h4><p>" +
          escape(story.result) +
          "</p><h4>Fit and limits</h4><p>" +
          escape(story.limits) +
          '</p><div class="marketing-actions"><a class="primary" href="' +
          escape(story.ctaHref) +
          '">' +
          escape(story.ctaLabel) +
          '</a><a class="secondary" href="' +
          storyPath +
          '">Open this story in the interactive demo</a></div></section>'
        );
      })
      .join("") +
    "</section>"
  );
}
function publicDemoMarkup() {
  return (
    '<main id="seo-content" class="marketing"><nav aria-label="GrowPathAI public pages"><a class="brand" href="/">GrowPathAI</a>' +
    links.map(anchor).join(" ") +
    '</nav><header class="marketing-hero"><p>Read-only product demo</p><h1>' +
    escape(demo.title) +
    "</h1><p>" +
    escape(demo.description) +
    "</p></header>" +
    demoStoriesMarkup() +
    demoExplorerMarkup() +
    '<section class="marketing-card"><h2>' +
    escape(demo.growTitle) +
    "</h2><p>" +
    escape(demo.disclosure) +
    "</p><p>This sample cannot be edited and does not run AI tools or change your account. Open any entry below. The visual timeline is available with JavaScript.</p></section>" +
    demo.events
      .map(
        (event, index) =>
          '<details class="marketing-card"' +
          (index === 0 ? " open" : "") +
          '><summary style="min-height:44px;cursor:pointer"><strong>' +
          escape(event.title) +
          "</strong> — " +
          escape(
            new Date(event.timestamp + "T12:00:00Z").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC"
            })
          ) +
          "</summary><p>" +
          escape(event.summary) +
          "</p>" +
          (event.photos
            ? '<img src="' +
              escape(demo.photo) +
              '" alt="' +
              escape(demo.photoAlt) +
              '" width="600" height="450" style="width:100%;max-width:600px;height:auto;border-radius:12px" />'
            : "") +
          "</details>"
      )
      .join("") +
    '<section class="marketing-card"><h2>Ready to start your own journal?</h2><p>Free account. No payment card required.</p><div class="marketing-actions"><a class="primary" href="/register">Create free account</a><a href="/demo">Demo address: growpathai.com/demo</a></div></section>' +
    "<footer>" +
    footer.map(anchor).join(" ") +
    "</footer></main>"
  );
}

function marketingSchema(route) {
  const graph = [];
  if (route === "" || route === "pricing")
    graph.push({
      "@type": "SoftwareApplication",
      name: "GrowPathAI",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      offers: marketing.plans.map((p) => ({
        "@type": "Offer",
        name: p.name + " monthly plan",
        price: String(p.monthly),
        priceCurrency: "USD",
        url: "https://growpathai.com/pricing",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: String(p.monthly),
          priceCurrency: "USD",
          unitText: "MONTH"
        }
      }))
    });
  if (route === "pricing")
    graph.push({
      "@type": "FAQPage",
      mainEntity: marketing.pricingFaq.map((f) => ({
        "@type": "Question",
        name: f.title,
        acceptedAnswer: { "@type": "Answer", text: f.body }
      }))
    });
  return graph;
}
const marketingCss =
  ".marketing{max-width:1120px;margin:auto;padding:24px;color:#172a1d;font:16px/1.6 system-ui,sans-serif}.marketing a{color:#176537}.marketing nav,.marketing footer,.marketing-actions{display:flex;flex-wrap:wrap;gap:16px;align-items:center}.marketing .brand{font-size:22px;font-weight:900;margin-right:auto}.marketing-hero{background:#e9f6eb;border-radius:24px;padding:32px;margin:28px 0}.marketing h1{font-size:42px;line-height:1.15;max-width:820px}.marketing h2{font-size:23px;line-height:1.3}.marketing-actions a{padding:12px 18px;border-radius:12px;font-weight:700}.marketing-actions .primary{background:#176537;color:white}.marketing-actions .secondary{border:1px solid #176537}.marketing-grid{display:flex;flex-wrap:wrap;gap:16px}.marketing-card{flex:1 1 280px;border:1px solid #d4e1d6;border-radius:18px;padding:22px;margin-bottom:24px;min-width:0}.marketing-card.primary-path{flex-basis:100%}.marketing-card.recommended{border:2px solid #176537}.table-scroll{overflow-x:auto;max-width:100%}.marketing table{border-collapse:collapse;min-width:620px;width:100%}.marketing th,.marketing td{padding:12px;border-top:1px solid #d4e1d6;text-align:left}.marketing caption{text-align:left;padding:12px}.marketing footer{border-top:1px solid #d4e1d6;padding:22px 0}.marketing a:focus-visible,.table-scroll:focus-visible{outline:3px solid #176537;outline-offset:3px}@media(max-width:599px){.marketing{padding:16px}.marketing-hero{padding:20px}.marketing h1{font-size:32px}.marketing-actions{align-items:stretch;flex-direction:column}.marketing-actions a{text-align:center}.marketing nav{gap:12px}.marketing .brand{flex-basis:100%}}";
const marketingTapTargetCss =
  ".marketing nav a,.marketing footer a{display:inline-flex;align-items:center;box-sizing:border-box;min-height:44px;min-width:44px;line-height:20px;padding:12px 4px}.marketing nav a.brand{line-height:28px;padding:8px 0}.marketing-actions a{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:44px;line-height:20px}.marketing-actions .secondary{padding:11px 18px}";
module.exports = {
  publicMarketingMarkup,
  marketingSchema,
  marketingCss: marketingCss + marketingTapTargetCss,
  marketing
};
