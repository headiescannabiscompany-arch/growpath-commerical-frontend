export type DemoStoryId = "free" | "pro" | "seller" | "creator" | "facility";

/** Accept one decoded route value; arrays and unrecognized values use the default. */
export function parseDemoStory(value: unknown): DemoStoryId {
  switch (value) {
    case "free":
    case "pro":
    case "seller":
    case "creator":
    case "facility":
      return value;
    default:
      return "free";
  }
}

/** Rebuild a public path from the allowlist without copying any incoming URL data. */
export function demoStoryPath(story: unknown): string {
  const selectedStory = parseDemoStory(story);
  return selectedStory === "free" ? "/demo" : `/demo?story=${selectedStory}`;
}
