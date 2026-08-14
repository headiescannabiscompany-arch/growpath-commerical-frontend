#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function fail(message) {
  console.error(`[course-media-contract] ${message}`);
  process.exitCode = 1;
}

function requireText(label, contents, pattern, description) {
  if (!pattern.test(contents)) fail(`${label} missing ${description}`);
}

const utility = read("src/features/learning/lessonMedia.ts");
const editor = read("src/components/learning/LessonMediaSourceEditor.tsx");
const player = read("src/components/learning/LessonMediaCard.tsx");
const personalAdd = read("src/screens/AddLessonScreen.js");
const personalEdit = read("src/screens/EditLessonScreen.js");
const personalPlayer = read("src/screens/CourseDetailScreen.js");
const commercialAuthor = read("src/app/home/commercial/courses/[courseId].tsx");
const sharedCreate = read("src/screens/commercial/CreateCourseScreen.js");
const sharedCatalog = read("src/screens/CoursesScreen.js");
const nestedService = read("backend/services/lessonMedia.js");
const method = read("docs/knowledge/methods/course-media-workflow-method.md");
const registry = read("src/knowledge/methodRegistry.ts");
const sources = read("src/knowledge/sourceRegistry.ts");
const tests = `${read("tests/unit/lessonMedia.test.ts")}\n${read(
  "tests/unit/LessonMediaComponents.test.tsx"
)}\n${read("tests/unit/CreateCourseScreen.test.tsx")}\n${read(
  "tests/unit/CommercialWorkflowPages.test.tsx"
)}\n${read(
  "tests/unit/CoursesScreenCommercialDiscovery.test.tsx"
)}`;

[
  ["GrowPath upload", /growpath_upload/],
  ["YouTube", /youtube/],
  ["Rumble", /rumble/],
  ["Vimeo", /vimeo/],
  ["Other URL", /other_url/],
  ["unsafe markup rejection", /iframe\|script\|object\|embed\|video\|html/],
  ["Vimeo privacy hash", /providerPrivacyHash/],
  ["external link fallback", /externalLinkFallback/]
].forEach(([description, pattern]) => {
  requireText("lesson media utility", utility, pattern, description);
  requireText("nested backend media service", nestedService, pattern, description);
});

[
  ["rights confirmation", /Rights or permission confirmed/],
  ["availability review", /Current availability/],
  ["captions status", /Captions/],
  ["transcript status", /Transcript/],
  ["text summary", /Learner-visible video summary/],
  ["privacy-aware embed opt-in", /Allow privacy-aware in-course player/]
].forEach(([description, pattern]) =>
  requireText("lesson media editor", editor, pattern, description)
);

[
  ["click-to-load privacy notice", /Load video from/],
  ["provider link fallback", /Open on/],
  ["text summary fallback", /Video summary/],
  ["explicit GrowPath completion", /progress changes only when you choose Mark Complete/]
].forEach(([description, pattern]) =>
  requireText("lesson media player", player, pattern, description)
);

[
  ["personal add editor", personalAdd],
  ["personal edit editor", personalEdit],
  ["commercial author editor", commercialAuthor]
].forEach(([description, contents]) =>
  requireText(description, contents, /LessonMediaSourceEditor/, "provider-aware editor")
);
requireText(
  "personal course player",
  personalPlayer,
  /LessonMediaCard/,
  "resilient lesson media card"
);
requireText(
  "course media method",
  method,
  /click to load|click-to-load/i,
  "privacy method"
);
requireText(
  "method registry",
  registry,
  /course-media-workflow/,
  "runtime course media method"
);
requireText(
  "source registry",
  sources,
  /youtube-player-documentation[\s\S]*vimeo-video-privacy-documentation/,
  "provider documentation sources"
);
requireText(
  "course media tests",
  tests,
  /preserves Vimeo unlisted privacy hashes/,
  "Vimeo hash test"
);
requireText(
  "course media tests",
  tests,
  /requires learner consent before loading/,
  "click-to-load test"
);
requireText(
  "shared course creator",
  sharedCreate,
  /entitlements\.mode === "commercial" \? createCommercialCourse : createCourse/,
  "Commercial workspace course creation boundary"
);
requireText(
  "shared course creator",
  sharedCreate,
  /entitlements\.mode === "commercial"[\s\S]*growInterests:[\s\S]*growInterestTags/,
  "Commercial flat grow-interest handoff"
);
requireText(
  "commercial course author",
  commercialAuthor,
  /courseGrowInterests[\s\S]*flattenTierSelections/,
  "legacy structured grow-interest normalization"
);
requireText(
  "shared course catalog",
  sharedCatalog,
  /COURSE_CATALOG_REQUEST_TIMEOUT_MS[\s\S]*Promise\.allSettled[\s\S]*retries: 0[\s\S]*Some course sources could not load[\s\S]*Retry course catalog/,
  "bounded partial catalog recovery"
);
requireText(
  "course media tests",
  tests,
  /creates Commercial drafts through the Commercial course workflow/,
  "Commercial full-builder creation test"
);
requireText(
  "course media tests",
  tests,
  /shows available courses and a retry when one source fails/,
  "partial catalog recovery regression test"
);
requireText(
  "course media tests",
  tests,
  /normalizes structured Full Course Builder grow interests on Commercial detail/,
  "Commercial structured grow-interest regression test"
);

if (!process.exitCode) {
  console.log("[course-media-contract] Course media contract verified");
}
