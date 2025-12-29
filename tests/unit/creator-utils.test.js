import { test } from "node:test";
import assert from "node:assert/strict";
import { getCreatorName } from "../../src/utils/creator.js";

test("prefers explicit name", () => {
  const name = getCreatorName({ name: "Acceptance Creator", username: "creator123" });
  assert.equal(name, "Acceptance Creator");
});

test("falls back to displayName, then username", () => {
  const viaDisplayName = getCreatorName({ displayName: "Display", username: "handle" });
  assert.equal(viaDisplayName, "Display");

  const viaUsername = getCreatorName({ username: "handle" });
  assert.equal(viaUsername, "handle");
});

test("uses custom fallback when creator info is missing", () => {
  assert.equal(getCreatorName(null, "Instructor"), "Instructor");
  assert.equal(getCreatorName(undefined), "Unknown");
});
