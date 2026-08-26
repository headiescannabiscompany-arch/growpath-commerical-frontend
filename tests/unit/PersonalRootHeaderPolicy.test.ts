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

  test("lets Environment Review own one semantic page heading", () => {
    const toolsLayout = read("src/app/home/personal/(tabs)/tools/_layout.tsx");
    const commercialLayout = read("src/app/home/commercial/_layout.tsx");

    expect(toolsLayout).toContain(
      'options={{ title: "Environment Review", headerShown: false }}'
    );
    expect(commercialLayout).toContain(
      'options={{ title: "Environment Review", headerShown: false, href: null }}'
    );
  });

  test("gives Commercial shared AI tools exactly one heading owner", () => {
    const commercialLayout = read("src/app/home/commercial/_layout.tsx");

    expect(commercialLayout).toContain(
      'options={{ title: "Diagnose", headerShown: false, href: null }}'
    );
    expect(commercialLayout).toContain(
      'options={{ title: "IPM Scout", href: null, headerShown: true }}'
    );
    expect(commercialLayout).toMatch(
      /title: "Plant & Crop Identification",[\s\S]*?headerShown: true/
    );
    expect(commercialLayout).toContain(
      'options={{ title: "Auto Grow Calendar", href: null, headerShown: true }}'
    );
  });

  test("uses the Upgrade Account page heading without exposing route-template titles", () => {
    const personalLayout = read("src/app/home/personal/_layout.tsx");
    const upgrade = read("src/features/billing/screens/UpgradePlan.tsx");

    expect(personalLayout).toContain(
      '<Stack.Screen name="upgrade/index" options={{ headerShown: false }} />'
    );
    expect(personalLayout).toContain(
      '<Stack.Screen name="upgrade/[plan]" options={{ headerShown: false }} />'
    );
    expect(upgrade).toContain('<Text accessibilityRole="header" style={styles.title}>');
    expect(upgrade).toContain("Upgrade Account");
  });

  test("uses the loaded grow name as the overview heading instead of a raw id", () => {
    const growLayout = read("src/app/home/personal/(tabs)/grows/[growId]/_layout.tsx");
    const overview = read("src/app/home/personal/(tabs)/grows/[growId]/index.tsx");

    expect(growLayout).toContain(
      '<Stack.Screen name="index" options={{ headerShown: false }} />'
    );
    expect(growLayout).not.toContain("`Grow ${growId");
    expect(overview).toContain('<Text accessibilityRole="header" style={styles.title}>');
  });

  test.each([
    ["home", "src/app/home/personal/(tabs)/index.tsx", "Your Garden"],
    ["grows", "src/app/home/personal/(tabs)/grows/index.tsx", "Grows"],
    ["tools", "src/app/home/personal/(tabs)/tools/index.tsx", "AI Tools"],
    ["profile", "src/app/home/personal/(tabs)/profile/index.tsx", "Profile"],
    ["forum tab", "src/app/home/personal/(tabs)/community.tsx", "Forum / Q&A"],
    ["forum workflow", "src/app/home/personal/(tabs)/forum/index.tsx", "Forum / Q&A"],
    ["diagnosis", "src/app/home/personal/(tabs)/diagnose.tsx", "Plant Issue Diagnosis"],
    ["tasks", "src/app/home/personal/(tabs)/tasks.tsx", "Task Center / Schedule"],
    ["discover", "src/app/discover.tsx", "Discover"],
    ["courses", "src/screens/CoursesScreen.js", "Courses"]
  ])("gives the %s root title heading semantics", (_name, file, title) => {
    const source = read(file);

    expect(source).toContain('accessibilityRole="header"');
    expect(source).toContain(title);
  });

  test("uses the journal ScreenBoundary back control without a duplicate stack header", () => {
    const logsLayout = read("src/app/home/personal/(tabs)/logs/_layout.tsx");
    const newLog = read("src/app/home/personal/(tabs)/logs/new.tsx");
    const logDetail = read("src/app/home/personal/(tabs)/logs/[logId].tsx");

    expect(logsLayout).toContain("screenOptions={{ headerShown: false }}");
    expect(newLog).toContain("showBack");
    expect(logDetail).toContain("showBack");
    expect(newLog).toContain("preferBackFallback");
    expect(logDetail).toContain("preferBackFallback");
    expect(newLog).toContain('accessibilityRole="header"');
    expect(logDetail).toContain('accessibilityRole="header"');
  });

  test.each([
    ["journal", "Journal"],
    ["tasks", "Tasks"]
  ])(
    "uses the nested %s navigator title without a duplicate page heading",
    (route, title) => {
      const growLayout = read("src/app/home/personal/(tabs)/grows/[growId]/_layout.tsx");
      const source = read(`src/app/home/personal/(tabs)/grows/[growId]/${route}.tsx`);

      expect(growLayout).toContain(
        `<Stack.Screen name="${route}" options={{ title: "${title}" }} />`
      );
      expect(source).not.toContain(
        `<Text style={styles.title} accessibilityRole="header">`
      );
    }
  );
});
