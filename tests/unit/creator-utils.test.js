import { test, expect } from "@jest/globals";
import { getCreatorName } from "../../src/utils/creator.js";

test("prefers explicit name", () => {
  const name = getCreatorName({ name: "Acceptance Creator", username: "creator123" });
  expect(name).toBe("Acceptance Creator");
});

test("falls back to displayName, then username", () => {
  const viaDisplayName = getCreatorName({ displayName: "Display", username: "handle" });
  expect(viaDisplayName).toBe("Display");

  const viaUsername = getCreatorName({ username: "handle" });
  expect(viaUsername).toBe("handle");
});

test("uses custom fallback when creator info is missing", () => {
  expect(getCreatorName(null, "Instructor")).toBe("Instructor");
  expect(getCreatorName(undefined)).toBe("Unknown");
});
