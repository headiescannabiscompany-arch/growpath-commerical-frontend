import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Personal root header policy", () => {
  test("keeps the outer tab navigator from duplicating page and stack titles", () => {
    const tabsLayout = read("src/app/home/personal/(tabs)/_layout.tsx");

    expect(tabsLayout).toContain("headerShown: false");
    expect(tabsLayout).not.toContain("headerShown: true");
  });

  test.each(["grows", "tools", "profile", "forum"])(
    "uses the %s page heading instead of a second root stack header",
    (route) => {
      const routeLayout = read(`src/app/home/personal/(tabs)/${route}/_layout.tsx`);

      expect(routeLayout).toContain(
        '<Stack.Screen name="index" options={{ headerShown: false }} />'
      );
    }
  );

  test("keeps a single navigator title when the AI page has no content heading", () => {
    const aiLayout = read("src/app/home/personal/(tabs)/ai/_layout.tsx");

    expect(aiLayout).toContain("headerShown: true");
    expect(aiLayout).toContain('options={{ title: "AI Assistant" }}');
  });
});
