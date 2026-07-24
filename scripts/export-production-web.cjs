const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const outputArgIndex = process.argv.findIndex((arg) => arg === "--out");
const outputDir =
  outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
    ? process.argv[outputArgIndex + 1]
    : "dist";
const absoluteOutputDir = path.resolve(ROOT, outputDir);
const productionApiUrl = process.env.EXPO_PUBLIC_API_URL || "https://api.growpathai.com";

let parsedProductionApiUrl;
try {
  parsedProductionApiUrl = new URL(productionApiUrl);
} catch {
  console.error(`Invalid EXPO_PUBLIC_API_URL for production export: ${productionApiUrl}`);
  process.exit(1);
}

if (
  parsedProductionApiUrl.protocol !== "https:" ||
  parsedProductionApiUrl.hostname !== "api.growpathai.com"
) {
  console.error(
    "Production web export requires EXPO_PUBLIC_API_URL=https://api.growpathai.com"
  );
  console.error(`Received: ${productionApiUrl}`);
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_ENV: "production",
  EXPO_PUBLIC_API_URL: productionApiUrl
};

const expoCli = path.join(ROOT, "node_modules", "expo", "bin", "cli");
const exportResult = spawnSync(
  process.execPath,
  [expoCli, "export", "--platform", "web", "--clear", "--output-dir", outputDir],
  {
    cwd: ROOT,
    env,
    stdio: "inherit",
    shell: false
  }
);

if (exportResult.error) {
  console.error(`Failed to start Expo CLI: ${exportResult.error.message}`);
  process.exit(1);
}

if (exportResult.status !== 0) {
  process.exit(exportResult.status || 1);
}

const fallbackRoutes = [
  "admin",
  "login",
  "register",
  "features",
  "pricing",
  "personal-grower",
  "commercial-cultivation",
  "facility-management",
  "nurseries-breeders",
  "grow-stores",
  "creators-educators",
  "about",
  "contact",
  "ai-cultivation-disclaimer",
  "accept-facility-invite",
  "courses",
  "courses/create",
  "courses/add-lesson",
  "brands",
  "brands/example-brand",
  "store",
  "store/example-brand",
  "store/example-brand/products/example-product",
  "marketplace",
  "storefront",
  "orders",
  "offers",
  "feed",
  "forum",
  "forum/new-post",
  "forum/post",
  "communities",
  "profile",
  "verify-email",
  "forgot-password",
  "reset-password",
  "privacy",
  "terms",
  "support",
  "account/delete",
  "account/mode",
  "account/workspace",
  "ai/how-it-works",
  "facilities",
  "onboarding",
  "onboarding/assign-plants",
  "onboarding/create-facility",
  "onboarding/first-setup",
  "onboarding/guilds",
  "onboarding/join-facility",
  "onboarding/pick-facility",
  "onboarding/start-grow",
  "onboarding/walkthroughs",
  "home",
  "home/schedule",
  "home/alerts",
  "home/personal",
  "home/personal/courses",
  "home/personal/profile",
  "home/personal/community",
  "home/personal/forum",
  "home/personal/forum/new-post",
  "home/personal/grows",
  "home/personal/grows/new",
  "home/personal/tasks",
  "home/personal/ai",
  "home/personal/tools",
  "home/personal/tools/vpd",
  "home/personal/tools/dew-point-guard",
  "home/personal/tools/ppfd",
  "home/personal/tools/bud-rot-risk",
  "home/personal/tools/npk",
  "home/personal/tools/recipe-builder",
  "home/personal/tools/soil-builder",
  "home/personal/tools/nutrient-chemistry",
  "home/personal/tools/watering",
  "home/personal/tools/environment-analysis",
  "home/personal/tools/feeding-schedule",
  "home/personal/tools/harvest-estimator",
  "home/personal/tools/harvest-readiness",
  "home/personal/tools/timeline-planner",
  "home/personal/tools/pdf-export",
  "home/personal/tools/pheno-matrix",
  "home/personal/tools/integrations",
  "home/personal/tools/soil-nutrient-batch",
  "home/personal/diagnose",
  "home/facility",
  "home/facility/select",
  "home/facility/ai-ask",
  "home/facility/ai-diagnosis-photo",
  "home/facility/ai-template",
  "home/facility/ai-validation",
  "home/facility/ai-tools",
  "home/facility/audit-logs",
  "home/facility/compliance",
  "home/facility/dashboard",
  "home/facility/grows",
  "home/facility/integrations",
  "home/facility/inventory",
  "home/facility/inventory/new",
  "home/facility/logs",
  "home/facility/plants",
  "home/facility/profile",
  "home/facility/reports",
  "home/facility/rooms",
  "home/facility/sop-runs",
  "home/facility/tasks",
  "home/facility/team",
  "home/facility/feed",
  "home/facility/transfers",
  "home/facility/tools/environment",
  "home/facility/tools/feeding-schedule",
  "home/facility/tools/harvest-readiness",
  "home/facility/tools/history-import",
  "home/facility/tools/npk",
  "home/facility/tools/pulse",
  "home/facility/tools/recipe-builder",
  "home/facility/tools/soil-builder",
  "home/commercial",
  "home/commercial/grows",
  "home/commercial/grows/new",
  "home/commercial/products",
  "home/commercial/products/new",
  "home/commercial/product-lines",
  "home/commercial/batch-planner",
  "home/commercial/trials",
  "home/commercial/storefront",
  "home/commercial/feed",
  "home/commercial/community",
  "home/commercial/courses",
  "home/commercial/lives",
  "home/commercial/orders",
  "home/commercial/tasks",
  "home/commercial/inventory",
  "home/commercial/inventory-create",
  "home/commercial/inventory-item/item-1",
  "home/commercial/marketing",
  "home/commercial/analytics",
  "home/commercial/profile",
  "home/commercial/tools",
  "home/commercial/tools/ask-ai",
  "home/commercial/tools/diagnose",
  "home/commercial/tools/dry-amendment-mix",
  "home/commercial/tools/environment",
  "home/commercial/tools/harvest-readiness",
  "home/commercial/tools/ingredient-library",
  "home/commercial/tools/library",
  "home/commercial/tools/npk",
  "home/commercial/tools/recipe-builder",
  "home/commercial/tools/report",
  "home/commercial/tools/soil-builder",
  "home/commercial/tools/soil-nutrient-batch"
];
const indexHtml = path.join(absoluteOutputDir, "index.html");
const rawIndexHtml = fs.readFileSync(indexHtml, "utf8");
const siteUrl = "https://growpathai.com";
const indexNowKey = "growpathai-2026-indexnow-7f4b2a91c6d8e305";

const defaultSeo = {
  title: "GrowPath",
  description:
    "GrowPath helps growers plan, track, diagnose, and improve gardens, commercial storefronts, courses, communities, and facility workflows.",
  index: true
};

const routeSeo = new Map(
  [
    [
      "",
      {
        title: "GrowPath | Grow planning, tracking, and facility tools",
        heading: "One connected path from grow setup to harvest",
        description:
          "Plan grows, track plants, diagnose issues, use cultivation calculators, run courses, and manage commercial or facility workflows with GrowPath.",
        topics: [
          "Personal grow tracking",
          "Commercial cultivation",
          "Facility management"
        ]
      }
    ],
    [
      "features",
      {
        title: "GrowPathAI Features | Connected cultivation workflows",
        heading: "Tools appear where the work happens",
        description:
          "Explore connected planning, grow journals, plant diagnosis, scheduling, recipes, environment, courses, community, commercial, and facility workflows.",
        topics: ["Plan and schedule", "Observe and diagnose", "Learn and share"]
      }
    ],
    [
      "pricing",
      {
        title: "GrowPathAI Pricing and Plans",
        heading: "Start free and keep what you create",
        description:
          "Compare GrowPathAI Free, paid Creator, Commercial, and Facility access. Every plan can create and publish free or paid courses.",
        topics: ["Free grow tools", "Creator plans", "Commercial and Facility workspaces"]
      }
    ],
    [
      "personal-grower",
      {
        title: "GrowPathAI for Personal Growers",
        heading: "A grow journal that helps decide what comes next",
        description:
          "Plan indoor and outdoor grows, manage plants and tasks, keep a journal, analyze photos, and use contextual cultivation tools.",
        topics: ["Grow planning", "Plant journals", "Context-aware AI assistance"]
      }
    ],
    [
      "commercial-cultivation",
      {
        title: "Commercial Cultivation Software | GrowPathAI",
        heading: "Cultivation evidence with business context",
        description:
          "Connect commercial grows, trials, recipes, batches, product lines, eligible storefront items, courses, live sessions, and analytics.",
        topics: ["Grow trials", "Product formulas", "Commercial education"]
      }
    ],
    [
      "facility-management",
      {
        title: "Cultivation Facility Management Software | GrowPathAI",
        heading: "Facility to room to grow to plant",
        description:
          "Manage rooms, grows, plants, tasks, SOPs, inventory, environmental imports, reports, and role-based facility teams.",
        topics: ["Facility roles", "Cultivation tasks and SOPs", "Environmental records"]
      }
    ],
    [
      "nurseries-breeders",
      {
        title: "Nursery and Breeding Software | GrowPathAI",
        heading: "Track plants, propagation, and selection decisions",
        description:
          "Connect mother plants, clones, tissue culture, genetics notes, phenotype scores, stress tests, and harvest outcomes.",
        topics: ["Propagation", "Pheno selection", "Genetics records"]
      }
    ],
    [
      "grow-stores",
      {
        title: "Grow Store Storefronts and Education | GrowPathAI",
        heading: "Products, education, and community in one public presence",
        description:
          "Publish eligible grow products, product education, courses, live sessions, community content, and a public commercial profile.",
        topics: ["Eligible products", "Product education", "Community publishing"]
      }
    ],
    [
      "creators-educators",
      {
        title: "Course Platform for Grow Creators | GrowPathAI",
        heading: "Publish courses on every plan",
        description:
          "Create free or paid grow courses on any GrowPathAI plan with higher limits and advanced tools on paid plans.",
        topics: ["Course publishing", "Live sessions", "Creator storefronts"]
      }
    ],
    [
      "about",
      {
        title: "About GrowPathAI",
        heading: "Software for clearer cultivation decisions",
        description:
          "Learn why GrowPathAI connects planning, observation, analysis, work, learning, and documentation in shared cultivation workflows.",
        topics: ["Contextual tools", "Many grow types", "Human-reviewed decisions"]
      }
    ],
    [
      "contact",
      {
        title: "Contact GrowPathAI",
        heading: "Reach the GrowPathAI team",
        description:
          "Contact GrowPathAI for account support, billing, facility onboarding, partnerships, or bug reports.",
        topics: ["support@growpathai.com", "Account support", "Facility onboarding"]
      }
    ],
    [
      "ai-cultivation-disclaimer",
      {
        title: "AI and Cultivation Disclaimer | GrowPathAI",
        heading: "AI is decision support, not a guarantee",
        description:
          "Understand the limits of AI cultivation assistance, user review responsibilities, safety, compliance, and privacy expectations.",
        topics: [
          "Review AI output",
          "Follow labels and laws",
          "Protect sensitive information"
        ]
      }
    ],
    [
      "login",
      {
        title: "Log in to GrowPath",
        description:
          "Log in to your GrowPath account to manage grows, plants, tools, courses, and facility workflows.",
        index: false
      }
    ],
    [
      "register",
      {
        title: "Create a GrowPath account",
        description:
          "Create a GrowPath account for personal grow tracking, grow tools, community, commercial profiles, and facility workflows."
      }
    ],
    [
      "store",
      {
        title: "GrowPath Store",
        description:
          "Discover grow products, genetics, soil lines, nutrient lines, and commercial profiles published through GrowPath."
      }
    ],
    [
      "courses",
      {
        title: "GrowPath Courses",
        description:
          "Browse grow education, live sessions, documents, videos, and structured courses from GrowPath creators."
      }
    ],
    [
      "feed",
      {
        title: "GrowPath Feed",
        description:
          "Explore commercial and facility outreach campaigns for products, courses, lives, storefronts, and professional cultivation services."
      }
    ],
    [
      "forum",
      {
        title: "GrowPath Forum",
        description:
          "Join GrowPath community discussions about growing, diagnostics, tools, genetics, soil, nutrients, and facility workflows."
      }
    ],
    [
      "communities",
      {
        title: "GrowPath Forum Directory",
        description: "Browse GrowPath Forum/Q&A groups by crop, category, and workflow."
      }
    ],
    [
      "privacy",
      {
        title: "Privacy Policy | GrowPath",
        description:
          "Read the GrowPath privacy policy, including account data, grow data, uploads, subscriptions, and data rights."
      }
    ],
    [
      "terms",
      {
        title: "Terms of Service | GrowPath",
        description:
          "Read the GrowPath terms of service for accounts, subscriptions, user content, commerce, courses, and app usage."
      }
    ],
    [
      "support",
      {
        title: "Support | GrowPath",
        description:
          "Get GrowPath support for accounts, billing, subscriptions, privacy, grows, courses, commercial profiles, and facilities."
      }
    ],
    [
      "account/delete",
      {
        title: "Delete Account | GrowPath",
        description: "Request GrowPath account deletion and data rights support.",
        index: false
      }
    ]
  ].map(([route, seo]) => [route, { ...defaultSeo, ...seo }])
);

const sitemapRoutes = [
  { route: "", priority: "1.0", changefreq: "weekly" },
  { route: "features", priority: "0.9", changefreq: "monthly" },
  { route: "pricing", priority: "0.9", changefreq: "monthly" },
  { route: "personal-grower", priority: "0.8", changefreq: "monthly" },
  { route: "commercial-cultivation", priority: "0.8", changefreq: "monthly" },
  { route: "facility-management", priority: "0.8", changefreq: "monthly" },
  { route: "nurseries-breeders", priority: "0.7", changefreq: "monthly" },
  { route: "grow-stores", priority: "0.7", changefreq: "monthly" },
  { route: "creators-educators", priority: "0.8", changefreq: "monthly" },
  { route: "about", priority: "0.5", changefreq: "monthly" },
  { route: "contact", priority: "0.5", changefreq: "monthly" },
  { route: "ai-cultivation-disclaimer", priority: "0.4", changefreq: "monthly" },
  { route: "register", priority: "0.8", changefreq: "monthly" },
  { route: "store", priority: "0.8", changefreq: "daily" },
  { route: "courses", priority: "0.8", changefreq: "weekly" },
  { route: "feed", priority: "0.7", changefreq: "daily" },
  { route: "forum", priority: "0.7", changefreq: "daily" },
  { route: "communities", priority: "0.5", changefreq: "weekly" },
  { route: "privacy", priority: "0.3", changefreq: "monthly" },
  { route: "terms", priority: "0.3", changefreq: "monthly" },
  { route: "support", priority: "0.5", changefreq: "monthly" }
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

function seoForRoute(route) {
  if (routeSeo.has(route)) return routeSeo.get(route);
  return {
    ...defaultSeo,
    title: "GrowPath App",
    description: defaultSeo.description,
    index: false
  };
}

function canonicalUrl(route) {
  return route ? `${siteUrl}/${route}` : siteUrl;
}

function staticIntroForRoute(route, seo) {
  if (route === "") {
    return `${seo.title}. ${seo.description} Create an account or log in to use the app.`;
  }
  return `${seo.title}. ${seo.description}`;
}

function structuredDataForRoute(route, seo, canonical) {
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: seo.title,
      description: seo.description,
      isPartOf: { "@id": `${siteUrl}#website` }
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "GrowPathAI", item: siteUrl },
        ...(route
          ? [
              {
                "@type": "ListItem",
                position: 2,
                name: seo.heading || seo.title,
                item: canonical
              }
            ]
          : [])
      ]
    }
  ];
  if (route === "") {
    graph.push(
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: "GrowPathAI",
        url: siteUrl,
        email: "support@growpathai.com"
      },
      {
        "@type": "SoftwareApplication",
        name: "GrowPathAI",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: seo.description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
      }
    );
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(
    /</g,
    "\\u003c"
  );
}

function staticPublicMarkup(route, seo) {
  if (!seo.index) return "";
  const topics = Array.isArray(seo.topics) ? seo.topics : [];
  const links = [
    ["Features", "/features"],
    ["Pricing", "/pricing"],
    ["Personal Grower", "/personal-grower"],
    ["Commercial", "/commercial-cultivation"],
    ["Facility", "/facility-management"],
    ["Creators", "/creators-educators"],
    ["Courses", "/courses"],
    ["Forum", "/forum"],
    ["Support", "/support"]
  ];
  return [
    '<main id="seo-content">',
    `<nav aria-label="GrowPathAI public pages">${links
      .map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`)
      .join(" ")}</nav>`,
    `<h1>${escapeHtml(seo.heading || seo.title)}</h1>`,
    `<p>${escapeHtml(seo.description)}</p>`,
    topics.length
      ? `<section aria-label="Page topics">${topics
          .map((topic) => `<h2>${escapeHtml(topic)}</h2>`)
          .join("")}</section>`
      : "",
    '<p><a href="/register">Create a free account</a> or <a href="/login">sign in</a>.</p>',
    "</main>"
  ].join("");
}

function applySeo(html, route) {
  const seo = seoForRoute(route);
  const canonical = canonicalUrl(route);
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const robots = seo.index ? "index,follow" : "noindex,follow";
  const routePath = route ? `/${route}` : "/";
  const tags = [
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    `<meta name="theme-color" content="#0f5132" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="GrowPath" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${siteUrl}/favicon.ico" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`
  ].join("\n    ");
  const staticIntro = escapeHtml(staticIntroForRoute(route, seo));
  const structuredData = structuredDataForRoute(route, seo, canonical);
  const staticMarkup = staticPublicMarkup(route, seo);

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(
      "</head>",
      `    ${tags}\n    <script type="application/ld+json">${structuredData}</script>\n  </head>`
    )
    .replace(
      /<noscript>[\s\S]*?<\/noscript>/i,
      `<noscript>${staticIntro} JavaScript is required for the interactive app at ${escapeHtml(
        routePath
      )}.</noscript>`
    )
    .replace('<div id="root"></div>', `<div id="root">${staticMarkup}</div>`);
}

fs.writeFileSync(indexHtml, applySeo(rawIndexHtml, ""));

for (const route of fallbackRoutes) {
  const routeDir = path.join(absoluteOutputDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, "index.html"), applySeo(rawIndexHtml, route));
}

const robotsTxt = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /home/",
  "Disallow: /admin",
  "Disallow: /profile",
  "Disallow: /facilities",
  "Disallow: /onboarding/",
  "Disallow: /courses/create",
  "Disallow: /courses/add-lesson",
  "Disallow: /accept-facility-invite",
  "Disallow: /forgot-password",
  "Disallow: /reset-password",
  "Disallow: /verify-email",
  "Disallow: /account/delete",
  "Disallow: /account/mode",
  "Disallow: /account/workspace",
  `Sitemap: ${siteUrl}/sitemap.xml`,
  ""
].join("\n");
fs.writeFileSync(path.join(absoluteOutputDir, "robots.txt"), robotsTxt);

const sitemapXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapRoutes.map(({ route, priority, changefreq }) =>
    [
      "  <url>",
      `    <loc>${escapeXml(canonicalUrl(route))}</loc>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>"
    ].join("\n")
  ),
  "</urlset>",
  ""
].join("\n");
fs.writeFileSync(path.join(absoluteOutputDir, "sitemap.xml"), sitemapXml);
fs.writeFileSync(path.join(absoluteOutputDir, `${indexNowKey}.txt`), indexNowKey);

fs.writeFileSync(
  path.join(absoluteOutputDir, "site.webmanifest"),
  `${JSON.stringify(
    {
      name: "GrowPath",
      short_name: "GrowPath",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0f5132",
      description: defaultSeo.description,
      icons: [
        {
          src: "/favicon.ico",
          sizes: "48x48 64x64",
          type: "image/x-icon"
        }
      ]
    },
    null,
    2
  )}\n`
);

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

const textFiles = walk(absoluteOutputDir).filter((file) =>
  /\.(html|js|json|txt)$/i.test(file)
);
const haystack = textFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

const forbidden = [
  "http://localhost:5002",
  "http://127.0.0.1:5002",
  "localhost:5002",
  "127.0.0.1:5002"
];
const foundForbidden = forbidden.filter((needle) => haystack.includes(needle));

if (!haystack.includes(productionApiUrl)) {
  console.error(`Production export missing API URL: ${productionApiUrl}`);
  process.exit(1);
}

if (foundForbidden.length) {
  console.error(
    `Production export contains forbidden local API URL(s): ${foundForbidden.join(", ")}`
  );
  process.exit(1);
}

console.log(`Production web export verified: ${outputDir} uses ${productionApiUrl}`);
