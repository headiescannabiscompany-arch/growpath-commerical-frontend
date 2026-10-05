import { demoStoryPath, parseDemoStory } from "@/utils/demoStoryLink";
import type { DemoStoryId } from "@/utils/demoStoryLink";

const stories: Array<[DemoStoryId, string]> = [
  ["free", "/demo"],
  ["pro", "/demo?story=pro"],
  ["seller", "/demo?story=seller"],
  ["creator", "/demo?story=creator"],
  ["facility", "/demo?story=facility"]
];

const rejectedValues: Array<{ name: string; value: unknown }> = [
  { name: "missing value", value: undefined },
  { name: "null", value: null },
  { name: "empty string", value: "" },
  { name: "whitespace", value: " " },
  { name: "leading whitespace", value: " pro" },
  { name: "trailing whitespace", value: "pro " },
  { name: "wrong case", value: "Pro" },
  { name: "uppercase", value: "FACILITY" },
  { name: "old plan identifier", value: "commercial" },
  { name: "unsupported story", value: "admin" },
  { name: "empty array", value: [] },
  { name: "single-value array", value: ["pro"] },
  { name: "duplicate values", value: ["pro", "pro"] },
  { name: "conflicting values", value: ["seller", "creator"] },
  { name: "nested array", value: [["facility"]] },
  { name: "object", value: {} },
  { name: "parameter object", value: { story: "pro" } },
  { name: "boxed string", value: Object("pro") },
  { name: "number", value: 1 },
  { name: "boolean", value: true },
  { name: "symbol", value: Symbol("pro") },
  { name: "prototype name", value: "__proto__" },
  { name: "constructor name", value: "constructor" },
  { name: "inherited property name", value: "toString" },
  { name: "percent-encoded enum", value: "%70ro" },
  { name: "double-encoded enum", value: "%2570ro" },
  { name: "encoded injected parameter", value: "pro%26token%3Dprivate-token" },
  { name: "malformed encoding", value: "%E0%A4%A" },
  { name: "control character", value: "pro\u0000" },
  { name: "newline", value: "pro\n" },
  { name: "query string", value: "?story=pro" },
  { name: "duplicate query string", value: "story=pro&story=seller" },
  { name: "record parameter", value: "seller&recordId=private-record" },
  { name: "token parameter", value: "creator&token=private-token" },
  { name: "name parameter", value: "facility&name=Private%20Person" },
  { name: "referrer parameter", value: "pro&referrer=https://example.com/private" },
  { name: "tracking parameter", value: "pro&utm_source=private-campaign" },
  { name: "fragment", value: "pro#private-record" },
  { name: "path", value: "/demo?story=pro&token=private-token" },
  { name: "external URL", value: "https://example.com/demo?story=pro" },
  { name: "protocol-relative URL", value: "//example.com/demo?story=pro" },
  { name: "script URL", value: "javascript:alert(1)" },
  { name: "markup", value: '<img src=x onerror="alert(1)">' }
];

describe("demo story links", () => {
  it.each(stories)("preserves the %s story in its public path", (story, path) => {
    expect(parseDemoStory(story)).toBe(story);
    expect(demoStoryPath(story)).toBe(path);
  });

  it.each(rejectedValues)("defaults safely for $name", ({ value }) => {
    expect(parseDemoStory(value)).toBe("free");
    expect(demoStoryPath(value)).toBe("/demo");
  });

  it("does not coerce objects or invoke user-supplied conversions", () => {
    const convert = jest.fn(() => {
      throw new Error("Untrusted values must not be converted");
    });
    const value = { toString: convert, valueOf: convert, [Symbol.toPrimitive]: convert };

    expect(parseDemoStory(value)).toBe("free");
    expect(demoStoryPath(value)).toBe("/demo");
    expect(convert).not.toHaveBeenCalled();
  });

  it.each(stories)(
    "round-trips the %s story without adding other URL fields",
    (story) => {
      const path = demoStoryPath(story);
      const url = new URL(path, "https://growpathai.com");

      expect(url.pathname).toBe("/demo");
      expect(url.hash).toBe("");
      expect(Array.from(url.searchParams.entries())).toEqual(
        story === "free" ? [] : [["story", story]]
      );
      expect(parseDemoStory(url.searchParams.get("story"))).toBe(story);
    }
  );
});
