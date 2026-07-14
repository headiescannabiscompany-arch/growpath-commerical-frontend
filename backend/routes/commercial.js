"use strict";

const express = require("express");

const CommercialRecord = require("../models/CommercialRecord");

const router = express.Router();

function getUserId(req) {
  return String(
    req.userId ||
      req.ctx?.userId ||
      req.user?.id ||
      req.user?._id ||
      req.headers["x-test-user-id"] ||
      ""
  );
}

function cleanString(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function recordId(row) {
  return String(row?.id || row?._id || "");
}

function plain(row) {
  if (!row) return null;
  return row.toObject ? row.toObject() : row;
}

function dto(row) {
  const value = plain(row);
  if (!value) return null;
  return {
    id: recordId(value),
    _id: value._id,
    userId: value.userId,
    commercialAccountId: value.commercialAccountId || undefined,
    recordType: value.recordType,
    name: value.name || value.payload?.name || undefined,
    title: value.title || value.payload?.title || undefined,
    slug: value.slug || value.payload?.slug || undefined,
    status: value.status || value.payload?.status || undefined,
    metrics: value.metrics || {},
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(value.payload || {})
  };
}

function requireUser(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" }
    });
    return "";
  }
  return userId;
}

function baseQuery(userId, recordType) {
  return { userId, recordType, deletedAt: null };
}

function publicStatusQuery() {
  return {
    deletedAt: null,
    status: { $in: ["published", "active", "testing", "public"] }
  };
}

function createPayload(body) {
  const payload = { ...(body || {}) };
  delete payload.id;
  delete payload._id;
  return payload;
}

function normalizeLesson(body, fallback = {}) {
  return {
    ...fallback,
    id: fallback.id || `lesson-${Date.now()}`,
    title: cleanString(body?.title || fallback.title || "Untitled lesson"),
    body: cleanString(body?.body || body?.content || fallback.body || ""),
    videoUrl: cleanString(body?.videoUrl || fallback.videoUrl || ""),
    order: Number(body?.order || fallback.order || 1),
    status: body?.status || fallback.status || "draft"
  };
}

function topLevelFromPayload(recordType, payload) {
  const name =
    payload.name ||
    payload.businessName ||
    payload.trialName ||
    payload.title ||
    payload.label ||
    "";
  const slug = payload.slug || slugify(payload.businessName || payload.name || name);
  return {
    recordType,
    name: cleanString(name),
    title: cleanString(payload.title || payload.trialName || payload.name || ""),
    slug,
    status: cleanString(payload.status || payload.storefrontStatus || "draft")
  };
}

function tokenize(value) {
  return Array.from(
    new Set(
      String(value || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    )
  );
}

function tagList(value) {
  if (Array.isArray(value)) return value.map(cleanString).filter(Boolean);
  if (typeof value === "string") return value.split(",").map(cleanString).filter(Boolean);
  return [];
}

function discoveryText(record, related = []) {
  const row = plain(record) || {};
  const payload = row.payload || {};
  const values = [
    row.name,
    row.title,
    row.slug,
    payload.name,
    payload.businessName,
    payload.description,
    payload.bio,
    payload.category,
    payload.businessType,
    payload.accountType,
    payload.publicSummary,
    ...tagList(payload.tags),
    ...tagList(payload.growInterests),
    ...related.flatMap((item) => {
      const itemPayload = item.payload || {};
      return [
        item.name,
        item.title,
        itemPayload.name,
        itemPayload.title,
        itemPayload.description,
        itemPayload.category,
        itemPayload.productSpecs?.category,
        itemPayload.productLineName,
        itemPayload.cropType,
        itemPayload.cultivar,
        itemPayload.purpose,
        ...tagList(itemPayload.tags)
      ];
    })
  ];
  return values.filter(Boolean).join(" ");
}

function scoreDiscoveryCandidate({ storefront, related, queryTokens, sourceTokens }) {
  const text = discoveryText(storefront, related).toLowerCase();
  const textTokens = new Set(tokenize(text));
  const reasons = [];
  let score = 0;

  for (const token of queryTokens) {
    if (text.includes(token)) {
      score += 8;
      reasons.push(`matches ${token}`);
    }
  }
  for (const token of sourceTokens) {
    if (textTokens.has(token)) {
      score += 3;
      if (reasons.length < 5) reasons.push(`similar ${token}`);
    }
  }

  const payload = storefront.payload || {};
  if (
    payload.featuredProductIds?.length ||
    related.some((item) => item.recordType === "product")
  ) {
    score += 2;
  }
  if (related.some((item) => item.recordType === "course")) score += 1;
  if (related.some((item) => item.recordType === "productTrial")) score += 1;
  if (related.some((item) => item.recordType === "post")) score += 1;

  return { score, reasons: Array.from(new Set(reasons)).slice(0, 5) };
}

async function resolveAnalyticsOwner(payload, fallbackUserId = "") {
  const currentUserId = cleanString(fallbackUserId);
  if (currentUserId && currentUserId !== "anonymous") return currentUserId;

  const storefrontSlug = slugify(
    payload.storefrontSlug || payload.brandSlug || payload.slug || ""
  );
  if (storefrontSlug) {
    const storefront = await CommercialRecord.findOne({
      recordType: "storefront",
      slug: storefrontSlug,
      deletedAt: null
    }).lean();
    if (storefront?.userId) return String(storefront.userId);
  }

  const possibleProductId = cleanString(
    payload.productId ||
      payload.linkedProductId ||
      (payload.objectType === "product" ? payload.objectId : "")
  );
  if (possibleProductId) {
    const product = await CommercialRecord.findOne({
      recordType: "product",
      deletedAt: null,
      $or: [
        { _id: possibleProductId },
        { slug: possibleProductId },
        { "payload.id": possibleProductId },
        { "payload.productId": possibleProductId },
        { "payload.slug": possibleProductId },
        { "payload.sku": possibleProductId }
      ]
    }).lean();
    if (product?.userId) return String(product.userId);
  }

  const possibleStorefrontId = cleanString(
    payload.storefrontId || (payload.objectType === "storefront" ? payload.objectId : "")
  );
  if (possibleStorefrontId) {
    const storefront = await CommercialRecord.findOne({
      recordType: "storefront",
      deletedAt: null,
      $or: [
        { _id: possibleStorefrontId },
        { "payload.id": possibleStorefrontId },
        { "payload.storefrontId": possibleStorefrontId }
      ]
    }).lean();
    if (storefront?.userId) return String(storefront.userId);
  }

  return currentUserId || "anonymous";
}

async function listRecords(req, res, recordType, envelopeKey) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const items = await CommercialRecord.find(baseQuery(userId, recordType))
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit || 100), 250))
    .lean();
  res.json({
    success: true,
    [envelopeKey]: (items || []).map(dto),
    items: (items || []).map(dto)
  });
}

async function createRecord(req, res, recordType, envelopeKey, defaultStatus = "draft") {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = createPayload({ status: defaultStatus, ...(req.body || {}) });
  const top = topLevelFromPayload(recordType, payload);
  const created = await CommercialRecord.create({
    userId,
    commercialAccountId: req.body?.commercialAccountId || null,
    ...top,
    payload
  });
  res
    .status(201)
    .json({ success: true, [envelopeKey]: dto(created), item: dto(created) });
}

async function updateRecord(req, res, recordType, envelopeKey) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = createPayload(req.body || {});
  const top = topLevelFromPayload(recordType, payload);
  const patch = {
    ...(top.name ? { name: top.name } : {}),
    ...(top.title ? { title: top.title } : {}),
    ...(top.slug ? { slug: top.slug } : {}),
    ...(payload.status || payload.storefrontStatus ? { status: top.status } : {}),
    $set: {}
  };
  delete patch.$set;
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, recordType), _id: req.params.id },
    {
      ...patch,
      $set: Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [`payload.${k}`, v])
      )
    },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Not found" });
  return res.json({ success: true, [envelopeKey]: dto(updated), item: dto(updated) });
}

async function softDeleteRecord(req, res, recordType) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, recordType), _id: req.params.id },
    { deletedAt: new Date(), status: "archived", "payload.status": "archived" },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ success: false, message: "Not found" });
  return res.json({ success: true, deleted: true, item: dto(updated) });
}

function idList(...values) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => cleanString(value))
        .filter(Boolean)
    )
  );
}

function hasLinkedId(record, candidateIds, fields) {
  const row = dto(record);
  return fields.some((field) => {
    const value = row?.[field];
    if (Array.isArray(value))
      return value.some((item) => candidateIds.includes(String(item)));
    return candidateIds.includes(String(value || ""));
  });
}

async function productEffectiveness(userId, productId) {
  const product = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "product"),
      _id: productId
    }).lean()
  );
  if (!product) return null;

  const productIds = idList(product.id, product._id, product.productId);
  const productLineIds = idList(product.productLineId, product.linkedProductLineId);
  const explicitBatchIds = idList(
    product.linkedBatchId,
    product.batchId,
    product.linkedBatchIds
  );
  const explicitTrialIds = idList(
    product.linkedGrowTrialId,
    product.linkedTrialId,
    product.linkedTrialIds,
    product.linkedGrowTrialIds
  );

  const [batchRows, trialRows, growRows, courseRows] = await Promise.all([
    CommercialRecord.find(baseQuery(userId, "soilNutrientBatch")).limit(500).lean(),
    CommercialRecord.find(baseQuery(userId, "productTrial")).limit(500).lean(),
    CommercialRecord.find(baseQuery(userId, "commercialGrow")).limit(500).lean(),
    CommercialRecord.find(baseQuery(userId, "course")).limit(500).lean()
  ]);

  const batches = (batchRows || [])
    .filter(
      (row) =>
        explicitBatchIds.includes(String(row._id)) ||
        hasLinkedId(row, productIds, ["productId", "linkedProductId"]) ||
        hasLinkedId(row, productLineIds, ["productLineId", "linkedProductLineId"])
    )
    .map(dto);
  const batchIds = idList(
    explicitBatchIds,
    batches.map((batch) => batch.id)
  );

  const trials = (trialRows || [])
    .filter(
      (row) =>
        explicitTrialIds.includes(String(row._id)) ||
        hasLinkedId(row, productIds, ["productId", "linkedProductId"]) ||
        hasLinkedId(row, productLineIds, ["productLineId", "linkedProductLineId"]) ||
        hasLinkedId(row, batchIds, ["batchId", "linkedBatchId"])
    )
    .map(dto);
  const growIds = idList(trials.map((trial) => trial.growId || trial.linkedGrowId));

  const grows = (growRows || [])
    .filter(
      (row) =>
        growIds.includes(String(row._id)) ||
        hasLinkedId(row, productIds, ["productId", "linkedProductId"]) ||
        hasLinkedId(row, batchIds, ["batchId", "linkedBatchId"])
    )
    .map(dto);

  const courses = (courseRows || [])
    .filter(
      (row) =>
        hasLinkedId(row, productIds, [
          "productId",
          "linkedProductId",
          "linkedProductIds"
        ]) ||
        hasLinkedId(row, productLineIds, [
          "productLineId",
          "linkedProductLineId",
          "linkedProductLineIds"
        ])
    )
    .map(dto);

  const completeTrials = trials.filter((trial) =>
    ["complete", "completed", "published"].includes(String(trial.status || ""))
  );
  const activeTrials = trials.filter((trial) =>
    ["planned", "active", "testing"].includes(String(trial.status || ""))
  );
  const measurements = trials.flatMap((trial) => {
    if (Array.isArray(trial.measurements)) return trial.measurements;
    if (trial.measurements && typeof trial.measurements === "object")
      return [trial.measurements];
    return [];
  });
  const harvestQualityTrials = trials.filter((trial) =>
    cleanString(trial.harvestQualityNotes)
  );
  const cropSummaryTrials = trials.filter((trial) =>
    cleanString(trial.commercialCropSummary)
  );
  const warnings = [];
  if (!batches.length)
    warnings.push("No linked batch/formula record is saved for this product.");
  if (!trials.length) warnings.push("No product trials are linked to this product.");
  if (!completeTrials.length)
    warnings.push(
      "No completed trial is available for publishable effectiveness claims."
    );

  return {
    product,
    linked: {
      batches,
      trials,
      grows,
      courses
    },
    summary: {
      batchCount: batches.length,
      activeTrialCount: activeTrials.length,
      completedTrialCount: completeTrials.length,
      growCount: grows.length,
      courseCount: courses.length,
      measurementCount: measurements.length,
      harvestQualityCount: harvestQualityTrials.length,
      commercialCropSummaryCount: cropSummaryTrials.length,
      latestHarvestQualityNotes: harvestQualityTrials[0]?.harvestQualityNotes || "",
      latestCommercialCropSummary: cropSummaryTrials[0]?.commercialCropSummary || "",
      publicProofReady: Boolean(batches.length && completeTrials.length),
      latestTrial: trials[0] || null,
      warnings,
      claimGuard:
        "Use linked batches, grow logs, pH/EC checks, harvest, dry/cure, and trial outcomes before making public product claims."
    }
  };
}

function currentAuthor(req) {
  const userId = getUserId(req);
  return {
    id: userId,
    displayName:
      cleanString(
        req.user?.displayName ||
          req.user?.name ||
          req.user?.username ||
          req.body?.authorName
      ) || "GrowPathAI user",
    email: req.user?.email || undefined,
    role: req.user?.role || undefined,
    plan: req.user?.plan || req.user?.accessPlan || undefined
  };
}

function postPayload(req) {
  const payload = createPayload(req.body || {});
  payload.type = cleanString(payload.type || "update");
  payload.title = cleanString(payload.title || "");
  payload.body = cleanString(payload.body || payload.description || "");
  payload.tags = Array.isArray(payload.tags)
    ? payload.tags.map((tag) => cleanString(tag)).filter(Boolean)
    : [];
  payload.externalLinks = Array.isArray(payload.externalLinks)
    ? payload.externalLinks
        .map((link) => ({
          label: cleanString(link?.label || link?.url || ""),
          url: cleanString(link?.url || "")
        }))
        .filter((link) => link.url)
    : [];
  payload.author = payload.author || currentAuthor(req);
  payload.likeCount = Number(payload.likeCount || 0);
  payload.commentCount = Number(payload.commentCount || 0);
  return payload;
}

async function findPublicOrOwnedPost(req, postId) {
  const userId = getUserId(req);
  return CommercialRecord.findOne({
    recordType: "post",
    _id: postId,
    deletedAt: null,
    ...(userId ? { $or: [{ userId }, { ...publicStatusQuery() }] } : publicStatusQuery())
  }).lean();
}

async function updatePostMetrics(postId, patch) {
  return CommercialRecord.findOneAndUpdate(
    { recordType: "post", _id: postId, deletedAt: null },
    patch,
    { new: true }
  ).lean();
}

async function createAnalyticsEvent({ userId, eventType, payload = {} }) {
  const created = await CommercialRecord.create({
    userId: userId || "anonymous",
    commercialAccountId: payload.commercialAccountId || null,
    recordType: "analyticsEvent",
    name: eventType,
    title: eventType,
    slug: "",
    status: "active",
    payload: { eventType, ...payload }
  });
  return dto(created);
}

async function getStorefrontRecord(userId) {
  return CommercialRecord.findOne(baseQuery(userId, "storefront")).lean();
}

router.get("/me", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const storefront = dto(await getStorefrontRecord(userId));
  res.json({
    success: true,
    commercialAccount: {
      ownerUserId: userId,
      businessName: storefront?.businessName || storefront?.name || "",
      slug: storefront?.slug || "",
      accountType: storefront?.accountType || "brand",
      storefrontId: storefront?.id || null,
      status: storefront?.status || "draft"
    }
  });
});

router.get("/dashboard", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const [
    productRows,
    productLineRows,
    trialRows,
    batchRows,
    campaignRows,
    orderRows,
    inventoryRows,
    courseRows,
    postRows,
    analyticsRows,
    storefront
  ] = await Promise.all([
    CommercialRecord.find(baseQuery(userId, "product"))
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    CommercialRecord.find(baseQuery(userId, "productLine"))
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    CommercialRecord.find(baseQuery(userId, "productTrial"))
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    CommercialRecord.find(baseQuery(userId, "soilNutrientBatch"))
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    CommercialRecord.find(baseQuery(userId, "campaign"))
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    CommercialRecord.find(baseQuery(userId, "order"))
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    CommercialRecord.find(baseQuery(userId, "inventory"))
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    CommercialRecord.find(baseQuery(userId, "course"))
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    CommercialRecord.find(baseQuery(userId, "post"))
      .sort({ updatedAt: -1 })
      .limit(250)
      .lean(),
    CommercialRecord.find(baseQuery(userId, "analyticsEvent"))
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean(),
    getStorefrontRecord(userId)
  ]);
  const products = (productRows || []).map(dto);
  const productLines = (productLineRows || []).map(dto);
  const trials = (trialRows || []).map(dto);
  const batches = (batchRows || []).map(dto);
  const campaigns = (campaignRows || []).map(dto);
  const orders = (orderRows || []).map(dto);
  const inventory = (inventoryRows || []).map(dto);
  const courses = (courseRows || []).map(dto);
  const posts = (postRows || []).map(dto);
  const analyticsEvents = (analyticsRows || []).map(dto);
  const completedTrials = trials.filter((trial) =>
    ["complete", "completed", "published"].includes(String(trial.status || ""))
  );
  const activeTrials = trials.filter((trial) =>
    ["planned", "active", "testing"].includes(String(trial.status || ""))
  );
  const batchProductIds = new Set(
    batches.flatMap((batch) => idList(batch.productId, batch.linkedProductId))
  );
  const completedTrialProductIds = new Set(
    completedTrials.flatMap((trial) => idList(trial.productId, trial.linkedProductId))
  );
  const productsMissingBatches = products.filter((product) => {
    const ids = idList(product.id, product._id, product.productId);
    const linked = idList(product.linkedBatchId, product.linkedBatchIds, product.batchId);
    return !linked.length && !ids.some((id) => batchProductIds.has(id));
  });
  const productsMissingCompletedTrials = products.filter((product) => {
    const ids = idList(product.id, product._id, product.productId);
    return !ids.some((id) => completedTrialProductIds.has(id));
  });
  const lowStock = inventory.filter((item) => {
    const qty = Number(item.quantity ?? item.qty ?? item.onHand ?? 0);
    const threshold = Number(item.lowStockThreshold ?? item.reorderPoint ?? 0);
    return threshold > 0 && qty <= threshold;
  });
  const externalLeads = orders.filter(
    (order) => order.status === "external_lead" || order.external === true
  );
  const draftCourses = courses.filter((course) =>
    ["draft", "pending_review", "rejected"].includes(String(course.status || ""))
  );
  const draftPosts = posts.filter((post) =>
    ["draft", "scheduled"].includes(String(post.status || ""))
  );
  const metricCounts = analyticsEvents.reduce(
    (acc, event) => {
      const type = String(event.eventType || event.name || "");
      if (type.includes("ad") && type.includes("click")) acc.adClicks += 1;
      if (type.includes("product_view")) acc.productViews += 1;
      if (type.includes("storefront_view")) acc.storefrontViews += 1;
      if (type.includes("link_click") || type.includes("external_link"))
        acc.externalClicks += 1;
      return acc;
    },
    { adClicks: 0, productViews: 0, storefrontViews: 0, externalClicks: 0 }
  );
  const actionItems = [
    ...productsMissingBatches.slice(0, 5).map((product) => ({
      type: "product_missing_batch",
      title: product.name || product.title || "Product missing batch",
      productId: product.id,
      priority: "medium"
    })),
    ...productsMissingCompletedTrials.slice(0, 5).map((product) => ({
      type: "product_missing_completed_trial",
      title: product.name || product.title || "Product missing completed trial",
      productId: product.id,
      priority: "high"
    })),
    ...lowStock.slice(0, 5).map((item) => ({
      type: "low_stock",
      title: item.name || item.title || "Low stock item",
      inventoryId: item.id,
      priority: "medium"
    }))
  ].slice(0, 12);
  res.json({
    success: true,
    dashboard: {
      storefront: dto(storefront),
      counts: {
        products: products.length,
        productLines: productLines.length,
        trials: trials.length,
        batches: batches.length,
        campaigns: campaigns.length,
        orders: orders.length,
        inventory: inventory.length,
        courses: courses.length,
        posts: posts.length,
        activeTrials: activeTrials.length,
        completedTrials: completedTrials.length,
        externalLeads: externalLeads.length,
        lowStock: lowStock.length,
        draftCourses: draftCourses.length,
        draftPosts: draftPosts.length,
        productsMissingBatches: productsMissingBatches.length,
        productsMissingCompletedTrials: productsMissingCompletedTrials.length,
        ...metricCounts
      },
      sections: {
        activeTrials: activeTrials.slice(0, 6),
        completedTrials: completedTrials.slice(0, 6),
        productsMissingBatches: productsMissingBatches.slice(0, 6),
        productsMissingCompletedTrials: productsMissingCompletedTrials.slice(0, 6),
        externalLeads: externalLeads.slice(0, 6),
        lowStock: lowStock.slice(0, 6),
        draftCourses: draftCourses.slice(0, 6),
        draftPosts: draftPosts.slice(0, 6),
        recentProducts: products.slice(0, 6),
        recentBatches: batches.slice(0, 6)
      },
      actionItems,
      guidance: [
        "Products need linked formulas/batches before strong public claims.",
        "Completed product trials are stronger proof than draft marketing copy.",
        "External purchase links should be measured as leads and clicks unless internal checkout is enabled."
      ]
    }
  });
});

router.get("/storefront", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  res.json({ success: true, storefront: dto(await getStorefrontRecord(userId)) });
});

router.post("/storefront", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = createPayload(req.body || {});
  const top = topLevelFromPayload("storefront", payload);
  const created = await CommercialRecord.create({
    userId,
    recordType: "storefront",
    ...top,
    payload
  });
  res.status(201).json({ success: true, storefront: dto(created) });
});

router.patch("/storefront", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = createPayload(req.body || {});
  const top = topLevelFromPayload("storefront", payload);
  const existing = await getStorefrontRecord(userId);
  const query = existing?._id
    ? { _id: existing._id, userId, recordType: "storefront", deletedAt: null }
    : { userId, recordType: "storefront", deletedAt: null };
  const updated = await CommercialRecord.findOneAndUpdate(
    query,
    {
      userId,
      recordType: "storefront",
      ...top,
      $set: Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [`payload.${k}`, v])
      )
    },
    { new: true, upsert: true }
  ).lean();
  res.json({ success: true, storefront: dto(updated) });
});

router.post("/storefront/publish", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const updated = await CommercialRecord.findOneAndUpdate(
    baseQuery(userId, "storefront"),
    { status: "published", "payload.status": "published", "payload.isPublished": true },
    { new: true }
  ).lean();
  if (!updated)
    return res.status(404).json({ success: false, message: "Storefront not found" });
  res.json({ success: true, storefront: dto(updated) });
});

router.get("/storefront/public", async (req, res) => {
  const q = cleanString(req.query.q || req.query.similarTo).toLowerCase();
  const similarTo = cleanString(req.query.similarTo || "");
  const limit = Math.min(Number(req.query.limit || 12), 50);
  const storefrontRows = await CommercialRecord.find({
    recordType: "storefront",
    ...publicStatusQuery()
  })
    .sort({ updatedAt: -1 })
    .limit(250)
    .lean();
  const userIds = Array.from(new Set((storefrontRows || []).map((row) => row.userId)));
  const relatedRows = userIds.length
    ? await CommercialRecord.find({
        userId: { $in: userIds },
        recordType: { $in: ["product", "productLine", "course", "productTrial", "post"] },
        ...publicStatusQuery()
      })
        .sort({ updatedAt: -1 })
        .limit(1000)
        .lean()
    : [];
  const source = similarTo
    ? (storefrontRows || []).find(
        (row) =>
          String(row.slug || row.payload?.slug || "").toLowerCase() ===
          similarTo.toLowerCase()
      )
    : null;
  const relatedByUser = new Map();
  for (const row of relatedRows || []) {
    const key = String(row.userId || "");
    if (!relatedByUser.has(key)) relatedByUser.set(key, []);
    relatedByUser.get(key).push(row);
  }
  const sourceRelated = source
    ? relatedByUser.get(String(source.userId || "")) || []
    : [];
  const queryTokens = tokenize(q && !similarTo ? q : "");
  const sourceTokens = source
    ? tokenize(discoveryText(source, sourceRelated))
    : tokenize(q);
  const scored = (storefrontRows || [])
    .filter((row) => !source || String(row._id) !== String(source._id))
    .map((row) => {
      const related = relatedByUser.get(String(row.userId || "")) || [];
      const scoredRow = scoreDiscoveryCandidate({
        storefront: row,
        related,
        queryTokens,
        sourceTokens
      });
      return {
        row,
        related,
        ...scoredRow
      };
    })
    .filter((item) => {
      if (!q && !similarTo) return true;
      return item.score > 0;
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(b.row.updatedAt).localeCompare(String(a.row.updatedAt))
    )
    .slice(0, limit);
  const rows = scored.map((item) => ({
    ...item.row,
    payload: {
      ...(item.row.payload || {}),
      matchScore: item.score,
      matchReasons: item.reasons,
      relatedProductCount: item.related.filter((row) => row.recordType === "product")
        .length,
      relatedCourseCount: item.related.filter((row) => row.recordType === "course")
        .length,
      relatedTrialCount: item.related.filter((row) => row.recordType === "productTrial")
        .length
    }
  }));
  res.json({
    success: true,
    storefronts: (rows || []).map(dto),
    brands: (rows || []).map(dto),
    similarTo: similarTo || undefined,
    query: q && !similarTo ? q : undefined
  });
});

router.get("/storefront/public/:slug", async (req, res) => {
  const slug = cleanString(req.params.slug);
  const storefront = await CommercialRecord.findOne({
    recordType: "storefront",
    slug,
    ...publicStatusQuery()
  }).lean();
  if (!storefront)
    return res.status(404).json({ success: false, message: "Storefront not found" });
  const userId = storefront.userId;
  const [products, courses, feedPosts, trials, forumThreads] = await Promise.all([
    CommercialRecord.find({ userId, recordType: "product", ...publicStatusQuery() })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    CommercialRecord.find({ userId, recordType: "course", ...publicStatusQuery() })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
    CommercialRecord.find({ userId, recordType: "post", ...publicStatusQuery() })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
    CommercialRecord.find({ userId, recordType: "productTrial", ...publicStatusQuery() })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
    CommercialRecord.find({ userId, recordType: "forumThread", ...publicStatusQuery() })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean()
  ]);
  res.json({
    success: true,
    storefront: dto(storefront),
    products: (products || []).map(dto),
    courses: (courses || []).map(dto),
    feedPosts: (feedPosts || []).map(dto),
    trials: (trials || []).map(dto),
    forumThreads: (forumThreads || []).map(dto)
  });
});

router.get("/products", (req, res) => listRecords(req, res, "product", "products"));
router.post("/products", (req, res) => createRecord(req, res, "product", "product"));
router.get("/products/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const product = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "product"),
      _id: req.params.id
    }).lean()
  );
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, product });
});
router.patch("/products/:id", (req, res) => updateRecord(req, res, "product", "product"));
router.delete("/products/:id", (req, res) => softDeleteRecord(req, res, "product"));
router.post("/products/:id/link-batch", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const product = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "product"),
      _id: req.params.id
    }).lean()
  );
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });
  const batchId = cleanString(req.body?.batchId || req.body?.linkedBatchId);
  if (!batchId)
    return res.status(400).json({ success: false, message: "batchId is required" });
  const batch = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "soilNutrientBatch"),
      _id: batchId
    }).lean()
  );
  if (!batch) return res.status(404).json({ success: false, message: "Batch not found" });
  const linkedBatchIds = idList(product.linkedBatchIds, product.linkedBatchId, batchId);
  const updatedProduct = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "product"), _id: req.params.id },
    {
      "payload.linkedBatchId": batchId,
      "payload.linkedBatchIds": linkedBatchIds,
      "payload.formulaVersion": req.body?.formulaVersion || product.formulaVersion || ""
    },
    { new: true }
  ).lean();
  const updatedBatch = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "soilNutrientBatch"), _id: batchId },
    {
      "payload.productId": req.params.id,
      "payload.linkedProductId": req.params.id,
      "payload.productName": product.name
    },
    { new: true }
  ).lean();
  res.json({
    success: true,
    product: dto(updatedProduct),
    batch: dto(updatedBatch),
    linkedBatchIds
  });
});
router.get("/products/:id/effectiveness", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const result = await productEffectiveness(userId, req.params.id);
  if (!result)
    return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, ...result });
});

router.post("/products/:id/checkout", async (req, res) => {
  const requesterUserId = getUserId(req);
  const productFilter = {
    recordType: "product",
    _id: req.params.id,
    deletedAt: null,
    ...(requesterUserId
      ? { $or: [{ userId: requesterUserId }, { ...publicStatusQuery() }] }
      : publicStatusQuery())
  };
  const product = dto(await CommercialRecord.findOne(productFilter).lean());
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });
  const regulatedCannabis =
    product.regulatedCannabis === true ||
    product.isCannabis === true ||
    product.productType === "cannabis" ||
    product.category === "cannabis";
  if (regulatedCannabis) {
    return res.status(403).json({
      success: false,
      code: "LICENSED_TRANSFER_REQUIRED",
      message:
        "Cannabis products cannot use public checkout. Record sales to verified licensed recipients through the facility transfer workflow."
    });
  }
  const externalUrl =
    product.externalPurchaseUrl || product.purchaseUrl || product.url || "";
  if (externalUrl) {
    const sellerUserId = product.userId || requesterUserId || "anonymous";
    const event = await createAnalyticsEvent({
      userId: sellerUserId,
      eventType: "product_external_link_click",
      payload: {
        objectType: "product",
        objectId: product.id,
        productId: product.id,
        productName: product.name,
        targetUrl: externalUrl,
        source: req.body?.source || "product_checkout",
        storefrontSlug: product.storefrontSlug || req.body?.storefrontSlug,
        requesterUserId: requesterUserId || "anonymous",
        successUrl: req.body?.successUrl,
        cancelUrl: req.body?.cancelUrl
      }
    });
    const lead = await CommercialRecord.create({
      userId: sellerUserId,
      commercialAccountId: product.commercialAccountId || null,
      recordType: "order",
      name: product.name || "External product lead",
      title: product.name || "External product lead",
      slug: "",
      status: "external_lead",
      payload: {
        productId: product.id,
        productName: product.name,
        status: "external_lead",
        fulfillmentStatus: "external",
        source: "external_checkout",
        external: true,
        targetUrl: externalUrl,
        customerUserId: requesterUserId || null,
        customerEmail: req.body?.customerEmail || "",
        customerName: req.body?.customerName || "",
        analyticsEventId: event.id,
        createdAt: new Date().toISOString()
      }
    });
    return res.json({
      success: true,
      url: externalUrl,
      external: true,
      event,
      lead: dto(lead),
      order: dto(lead)
    });
  }
  return res.status(501).json({
    success: false,
    message: "Internal checkout is not configured for this product."
  });
});

router.get("/product-lines", (req, res) =>
  listRecords(req, res, "productLine", "productLines")
);
router.post("/product-lines", (req, res) =>
  createRecord(req, res, "productLine", "productLine")
);
router.get("/product-lines/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const productLine = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "productLine"),
      _id: req.params.id
    }).lean()
  );
  if (!productLine)
    return res.status(404).json({ success: false, message: "Product line not found" });
  res.json({ success: true, productLine });
});
router.patch("/product-lines/:id", (req, res) =>
  updateRecord(req, res, "productLine", "productLine")
);

router.get("/batches", (req, res) =>
  listRecords(req, res, "soilNutrientBatch", "batches")
);
router.post("/batches", (req, res) =>
  createRecord(req, res, "soilNutrientBatch", "batch", "planned")
);
router.get("/batches/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const batch = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "soilNutrientBatch"),
      _id: req.params.id
    }).lean()
  );
  if (!batch) return res.status(404).json({ success: false, message: "Batch not found" });
  res.json({ success: true, batch });
});
router.patch("/batches/:id", (req, res) =>
  updateRecord(req, res, "soilNutrientBatch", "batch")
);

router.get("/trials", (req, res) => listRecords(req, res, "productTrial", "trials"));
router.post("/trials", (req, res) =>
  createRecord(req, res, "productTrial", "trial", "planned")
);
router.get("/trials/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const trial = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "productTrial"),
      _id: req.params.id
    }).lean()
  );
  if (!trial)
    return res.status(404).json({ success: false, message: "Product trial not found" });
  res.json({ success: true, trial });
});
router.patch("/trials/:id", (req, res) =>
  updateRecord(req, res, "productTrial", "trial")
);
router.post("/trials/:id/ai-review", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const trial = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "productTrial"),
      _id: req.params.id
    }).lean()
  );
  if (!trial)
    return res.status(404).json({ success: false, message: "Product trial not found" });
  const aiReview = {
    summary:
      req.body?.summary ||
      trial.commercialCropSummary ||
      "Product trial review saved. Compare linked grow logs, pH/EC checks, yield, plant response, harvest quality, dry/cure, and final quality before publishing claims.",
    evidence:
      req.body?.evidence ||
      [
        trial.effectivenessSummary
          ? `Effectiveness: ${trial.effectivenessSummary}`
          : null,
        trial.harvestQualityNotes
          ? `Harvest quality: ${trial.harvestQualityNotes}`
          : null,
        trial.commercialCropSummary
          ? `Crop summary: ${trial.commercialCropSummary}`
          : null
      ].filter(Boolean),
    limitations: req.body?.limitations || [
      "This review is based on saved trial data and user notes."
    ],
    reviewedAt: new Date().toISOString()
  };
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "productTrial"), _id: req.params.id },
    { "payload.AIReview": aiReview, "payload.aiReview": aiReview },
    { new: true }
  ).lean();
  res.json({ success: true, trial: dto(updated), aiReview });
});

router.get("/grows", (req, res) => listRecords(req, res, "commercialGrow", "grows"));
router.post("/grows", (req, res) =>
  createRecord(req, res, "commercialGrow", "grow", "active")
);
router.get("/grows/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const grow = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "commercialGrow"),
      _id: req.params.id
    }).lean()
  );
  if (!grow) return res.status(404).json({ success: false, message: "Grow not found" });
  res.json({ success: true, grow });
});
router.patch("/grows/:id", (req, res) =>
  updateRecord(req, res, "commercialGrow", "grow")
);

router.get("/courses", (req, res) => listRecords(req, res, "course", "courses"));
router.post("/courses", (req, res) => createRecord(req, res, "course", "course"));
router.get("/courses/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const course = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "course"),
      _id: req.params.id
    }).lean()
  );
  if (!course)
    return res.status(404).json({ success: false, message: "Course not found" });
  res.json({ success: true, course });
});
router.patch("/courses/:id", (req, res) => updateRecord(req, res, "course", "course"));
router.post("/courses/:id/lessons", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const course = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "course"),
      _id: req.params.id
    }).lean()
  );
  if (!course)
    return res.status(404).json({ success: false, message: "Course not found" });
  const lesson = normalizeLesson(req.body || {}, {
    order: (course.lessons || []).length + 1
  });
  const lessons = [...(Array.isArray(course.lessons) ? course.lessons : []), lesson];
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "course"), _id: req.params.id },
    { "payload.lessons": lessons },
    { new: true }
  ).lean();
  res.status(201).json({ success: true, lesson, course: dto(updated) });
});
router.patch("/courses/:id/lessons/:lessonId", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const course = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "course"),
      _id: req.params.id
    }).lean()
  );
  if (!course)
    return res.status(404).json({ success: false, message: "Course not found" });
  const lessons = (course.lessons || []).map((lesson) =>
    String(lesson.id) === String(req.params.lessonId)
      ? normalizeLesson(req.body || {}, lesson)
      : lesson
  );
  const lesson = lessons.find((item) => String(item.id) === String(req.params.lessonId));
  if (!lesson)
    return res.status(404).json({ success: false, message: "Lesson not found" });
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "course"), _id: req.params.id },
    { "payload.lessons": lessons },
    { new: true }
  ).lean();
  res.json({ success: true, lesson, course: dto(updated) });
});
router.delete("/courses/:id/lessons/:lessonId", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const course = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "course"),
      _id: req.params.id
    }).lean()
  );
  if (!course)
    return res.status(404).json({ success: false, message: "Course not found" });
  const before = Array.isArray(course.lessons) ? course.lessons : [];
  const lessons = before.filter(
    (lesson) => String(lesson.id) !== String(req.params.lessonId)
  );
  if (lessons.length === before.length)
    return res.status(404).json({ success: false, message: "Lesson not found" });
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "course"), _id: req.params.id },
    { "payload.lessons": lessons },
    { new: true }
  ).lean();
  res.json({ success: true, deleted: true, course: dto(updated) });
});
router.post("/courses/:id/publish", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "course"), _id: req.params.id },
    { status: "published", "payload.status": "published", "payload.isPublished": true },
    { new: true }
  ).lean();
  if (!updated)
    return res.status(404).json({ success: false, message: "Course not found" });
  res.json({ success: true, course: dto(updated) });
});

router.get("/inventory", (req, res) => listRecords(req, res, "inventory", "items"));
router.post("/inventory", (req, res) =>
  createRecord(req, res, "inventory", "item", "active")
);
router.get("/inventory/low-stock", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const rows = await CommercialRecord.find(baseQuery(userId, "inventory")).lean();
  const items = (rows || [])
    .map(dto)
    .filter(
      (item) =>
        Number(item.quantity || item.qty || 0) <=
        Number(item.reorderPoint || item.lowStockThreshold || 0)
    );
  res.json({ success: true, items, inventory: items });
});
router.get("/inventory/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const item = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "inventory"),
      _id: req.params.id
    }).lean()
  );
  if (!item)
    return res.status(404).json({ success: false, message: "Inventory item not found" });
  res.json({ success: true, item });
});
router.patch("/inventory/:id", (req, res) => updateRecord(req, res, "inventory", "item"));
router.post("/inventory/adjust", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const id = cleanString(req.body?.id || req.body?.itemId);
  const delta = Number(req.body?.delta || 0);
  const item = dto(
    await CommercialRecord.findOne({ ...baseQuery(userId, "inventory"), _id: id }).lean()
  );
  if (!item)
    return res.status(404).json({ success: false, message: "Inventory item not found" });
  const quantity = Math.max(0, Number(item.quantity || item.qty || 0) + delta);
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "inventory"), _id: id },
    { "payload.quantity": quantity, "payload.qty": quantity },
    { new: true }
  ).lean();
  res.json({ success: true, item: dto(updated) });
});

router.get("/campaigns", (req, res) => listRecords(req, res, "campaign", "campaigns"));
router.post("/campaigns", (req, res) => createRecord(req, res, "campaign", "campaign"));
router.patch("/campaigns/:id", (req, res) =>
  updateRecord(req, res, "campaign", "campaign")
);
router.delete("/campaigns/:id", (req, res) => softDeleteRecord(req, res, "campaign"));
router.post("/campaigns/:id/click", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const campaign = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "campaign"),
      _id: req.params.id
    }).lean()
  );
  if (!campaign)
    return res.status(404).json({ success: false, message: "Campaign not found" });
  const clickCount = Number(campaign.clickCount || campaign.metrics?.clickCount || 0) + 1;
  const event = await createAnalyticsEvent({
    userId,
    eventType: "ad_click",
    payload: {
      objectType: "campaign",
      objectId: campaign.id,
      campaignId: campaign.id,
      campaignName: campaign.name,
      linkedProductId: campaign.linkedProductId,
      linkedCourseId: campaign.linkedCourseId,
      targetUrl: req.body?.targetUrl || campaign.targetUrl || campaign.url || "",
      source: req.body?.source || "campaign"
    }
  });
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "campaign"), _id: req.params.id },
    { "payload.clickCount": clickCount, "metrics.clickCount": clickCount },
    { new: true }
  ).lean();
  res.json({ success: true, clickCount, event, campaign: dto(updated) });
});

router.get("/orders", (req, res) => listRecords(req, res, "order", "orders"));
router.post("/orders", (req, res) => createRecord(req, res, "order", "order", "draft"));
router.patch("/orders/:id", (req, res) => updateRecord(req, res, "order", "order"));

router.get("/links", (req, res) => listRecords(req, res, "link", "links"));
router.post("/links", (req, res) => createRecord(req, res, "link", "link", "active"));
router.patch("/links/:id", (req, res) => updateRecord(req, res, "link", "link"));
router.delete("/links/:id", (req, res) => softDeleteRecord(req, res, "link"));
router.post("/links/:id/click", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const link = dto(
    await CommercialRecord.findOne({
      ...baseQuery(userId, "link"),
      _id: req.params.id
    }).lean()
  );
  if (!link) return res.status(404).json({ success: false, message: "Link not found" });
  const clickCount = Number(link.clickCount || link.metrics?.clickCount || 0) + 1;
  const event = await createAnalyticsEvent({
    userId,
    eventType: "marketing_link_click",
    payload: {
      objectType: "link",
      objectId: link.id,
      linkId: link.id,
      targetUrl: link.url,
      label: link.label || link.name,
      source: req.body?.source || "commercial_link"
    }
  });
  const updated = await CommercialRecord.findOneAndUpdate(
    { ...baseQuery(userId, "link"), _id: req.params.id },
    { "payload.clickCount": clickCount, "metrics.clickCount": clickCount },
    { new: true }
  ).lean();
  res.json({ success: true, url: link.url, clickCount, event, link: dto(updated) });
});

router.get("/feed", async (req, res) => {
  const type = cleanString(req.query.type || "");
  const tag = cleanString(req.query.tag || "").toLowerCase();
  const q = cleanString(req.query.q || "").toLowerCase();
  const filter = { recordType: "post", ...publicStatusQuery() };
  if (type) filter["payload.type"] = type;
  const rows = await CommercialRecord.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(req.query.limit || 50), 100))
    .lean();
  const items = (rows || []).map(dto).filter((post) => {
    if (tag && !(post.tags || []).map((item) => String(item).toLowerCase()).includes(tag))
      return false;
    if (q) {
      const haystack = [post.title, post.body, post.location, ...(post.tags || [])]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  res.json({ success: true, items, nextCursor: null });
});
router.post("/posts", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = postPayload(req);
  const top = topLevelFromPayload("post", {
    ...payload,
    name: payload.title || payload.body.slice(0, 80),
    status: payload.status || "published"
  });
  const created = await CommercialRecord.create({
    userId,
    commercialAccountId: req.body?.commercialAccountId || null,
    ...top,
    payload
  });
  res.status(201).json({ success: true, post: dto(created), item: dto(created) });
});

router.post("/like/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const post = dto(await findPublicOrOwnedPost(req, req.params.id));
  if (!post) return res.status(404).json({ success: false, message: "Post not found" });
  const likedBy = Array.isArray(post.likedBy) ? post.likedBy.map(String) : [];
  const nextLikedBy = Array.from(new Set([...likedBy, userId]));
  const likeCount = nextLikedBy.length;
  const updated = await updatePostMetrics(req.params.id, {
    "payload.likedBy": nextLikedBy,
    "payload.likeCount": likeCount,
    "metrics.likeCount": likeCount
  });
  res.json({ success: true, liked: true, likeCount, post: dto(updated) });
});

router.post("/unlike/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const post = dto(await findPublicOrOwnedPost(req, req.params.id));
  if (!post) return res.status(404).json({ success: false, message: "Post not found" });
  const nextLikedBy = (
    Array.isArray(post.likedBy) ? post.likedBy.map(String) : []
  ).filter((id) => id !== userId);
  const likeCount = nextLikedBy.length;
  const updated = await updatePostMetrics(req.params.id, {
    "payload.likedBy": nextLikedBy,
    "payload.likeCount": likeCount,
    "metrics.likeCount": likeCount
  });
  res.json({ success: true, liked: false, likeCount, post: dto(updated) });
});

router.get("/comments/:id", async (req, res) => {
  const post = await findPublicOrOwnedPost(req, req.params.id);
  if (!post) return res.status(404).json({ success: false, message: "Post not found" });
  const rows = await CommercialRecord.find({
    recordType: "postComment",
    deletedAt: null,
    "payload.postId": req.params.id,
    status: { $in: ["published", "active"] }
  })
    .sort({ createdAt: 1 })
    .limit(250)
    .lean();
  res.json({
    success: true,
    comments: (rows || []).map(dto),
    items: (rows || []).map(dto)
  });
});

router.post("/comment/:id", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const post = dto(await findPublicOrOwnedPost(req, req.params.id));
  if (!post) return res.status(404).json({ success: false, message: "Post not found" });
  const payload = {
    postId: req.params.id,
    body: cleanString(req.body?.body || req.body?.text || req.body?.comment || ""),
    author: currentAuthor(req),
    linkedProductId: post.linkedProductId,
    storefrontSlug: post.storefrontSlug,
    createdAt: new Date().toISOString()
  };
  if (!payload.body)
    return res.status(400).json({ success: false, message: "Comment body is required" });
  const created = await CommercialRecord.create({
    userId,
    commercialAccountId: post.commercialAccountId || null,
    recordType: "postComment",
    name: payload.body.slice(0, 80),
    title: payload.body.slice(0, 80),
    status: "published",
    payload
  });
  const commentCount = Number(post.commentCount || 0) + 1;
  await updatePostMetrics(req.params.id, {
    "payload.commentCount": commentCount,
    "metrics.commentCount": commentCount
  });
  res.status(201).json({ success: true, comment: dto(created), commentCount });
});

router.get("/analytics/overview", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const events = await CommercialRecord.find(baseQuery(userId, "analyticsEvent")).lean();
  const breakdownMaps = {
    ads: new Map(),
    products: new Map(),
    storefronts: new Map(),
    links: new Map(),
    sources: new Map()
  };
  const addBreakdown = (map, key, label, event) => {
    const cleanKey = cleanString(key || "unknown");
    const cleanLabel = cleanString(label || cleanKey || "Unknown");
    const current = map.get(cleanKey) || {
      key: cleanKey,
      label: cleanLabel,
      count: 0,
      lastEventAt: null,
      eventTypes: []
    };
    current.count += 1;
    const eventTime = event.createdAt || event.updatedAt || new Date().toISOString();
    if (!current.lastEventAt || String(eventTime) > String(current.lastEventAt)) {
      current.lastEventAt = eventTime;
    }
    const eventType = cleanString(event.payload?.eventType || event.name || "");
    if (eventType && !current.eventTypes.includes(eventType))
      current.eventTypes.push(eventType);
    map.set(cleanKey, current);
  };
  const topBreakdownRows = (map) =>
    Array.from(map.values())
      .sort(
        (a, b) =>
          Number(b.count || 0) - Number(a.count || 0) ||
          String(b.lastEventAt || "").localeCompare(String(a.lastEventAt || ""))
      )
      .slice(0, 10);
  const overview = {
    adClicks: 0,
    marketingClicks: 0,
    linkClicks: 0,
    productCheckoutClicks: 0,
    externalCheckoutLeads: await CommercialRecord.countDocuments({
      ...baseQuery(userId, "order"),
      status: { $in: ["external_lead"] }
    }),
    productViews: 0,
    storefrontViews: 0,
    brandProfileViews: 0,
    feedClicks: 0,
    courseStarts: 0,
    forumReplies: 0,
    activeTrials: await CommercialRecord.countDocuments({
      ...baseQuery(userId, "productTrial"),
      status: { $in: ["planned", "active"] }
    }),
    completedTrials: await CommercialRecord.countDocuments({
      ...baseQuery(userId, "productTrial"),
      status: { $in: ["complete", "completed"] }
    })
  };
  for (const event of events || []) {
    const payload = event.payload || {};
    const type = String(payload.eventType || event.name || "");
    if (type.includes("ad") && type.includes("click")) overview.adClicks += 1;
    if (type.includes("marketing") || type.includes("campaign"))
      overview.marketingClicks += 1;
    if (type.includes("link_click")) overview.linkClicks += 1;
    if (type.includes("checkout") || type.includes("external_link"))
      overview.productCheckoutClicks += 1;
    if (type.includes("product_view")) overview.productViews += 1;
    if (type.includes("storefront_view")) overview.storefrontViews += 1;
    if (type.includes("brand_profile_view")) overview.brandProfileViews += 1;
    if (type.includes("feed") && type.includes("click")) overview.feedClicks += 1;
    if (type.includes("course_start")) overview.courseStarts += 1;
    if (type.includes("forum_reply")) overview.forumReplies += 1;
    if (type.includes("ad_click") || type.includes("campaign")) {
      addBreakdown(
        breakdownMaps.ads,
        payload.campaignId ||
          payload.linkedCampaignId ||
          payload.objectId ||
          payload.targetUrl ||
          payload.source,
        payload.campaignName ||
          payload.label ||
          payload.metadata?.label ||
          payload.targetUrl ||
          payload.source ||
          "Ad click",
        event
      );
    }
    if (type.includes("product")) {
      addBreakdown(
        breakdownMaps.products,
        payload.productId || payload.linkedProductId || payload.objectId,
        payload.productName ||
          payload.label ||
          payload.metadata?.label ||
          payload.productId ||
          payload.linkedProductId ||
          payload.objectId ||
          "Product",
        event
      );
    }
    if (type.includes("storefront") || payload.storefrontSlug) {
      addBreakdown(
        breakdownMaps.storefronts,
        payload.storefrontSlug || payload.storefrontId || payload.objectId,
        payload.storefrontName ||
          payload.metadata?.label ||
          payload.storefrontSlug ||
          payload.storefrontId ||
          payload.objectId ||
          "Storefront",
        event
      );
    }
    if (type.includes("click") && (payload.targetUrl || payload.url)) {
      addBreakdown(
        breakdownMaps.links,
        payload.targetUrl || payload.url,
        payload.label || payload.metadata?.label || payload.targetUrl || payload.url,
        event
      );
    }
    if (payload.source) {
      addBreakdown(
        breakdownMaps.sources,
        payload.source,
        String(payload.source).replace(/_/g, " "),
        event
      );
    }
  }
  overview.breakdowns = {
    ads: topBreakdownRows(breakdownMaps.ads),
    products: topBreakdownRows(breakdownMaps.products),
    storefronts: topBreakdownRows(breakdownMaps.storefronts),
    links: topBreakdownRows(breakdownMaps.links),
    sources: topBreakdownRows(breakdownMaps.sources)
  };
  res.json({ success: true, overview });
});

router.post("/analytics/events", async (req, res) => {
  const payload = createPayload(req.body || {});
  const userId = await resolveAnalyticsOwner(
    payload,
    getUserId(req) || cleanString(req.body?.userId)
  );
  const eventType = cleanString(payload.eventType || "commercial_event");
  const created = await CommercialRecord.create({
    userId,
    commercialAccountId: payload.commercialAccountId || null,
    recordType: "analyticsEvent",
    name: eventType,
    title: eventType,
    slug: "",
    status: "active",
    payload
  });
  res.status(201).json({ success: true, event: dto(created) });
});

module.exports = router;
