import fs from "fs";
import path from "path";

describe("CommercialStack", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/navigation/CommercialStack.js"),
    "utf8"
  );

  it("routes feed and orders through commercial workspace screens", () => {
    expect(source).toContain("../app/home/commercial/feed");
    expect(source).toContain("../app/home/commercial/orders");
    expect(source).not.toContain("../app/feed");
    expect(source).not.toContain("../screens/CommercialOrdersScreen");
    expect(source).toContain(
      '<Stack.Screen name="CommercialOrders" component={CommercialOrdersRoute} />'
    );
  });

  it("routes legacy evidence stack entries through canonical evidence-run wrappers", () => {
    expect(source).toContain("../app/home/commercial/evidence-runs");
    expect(source).toContain("../app/home/commercial/evidence-runs/[id]");
    expect(source).toContain("../app/home/commercial/evidence-runs/new");
    expect(source).not.toContain('../app/home/commercial/grows"');
    expect(source).not.toContain("../app/home/commercial/grows/[growId]");
    expect(source).toContain(
      '<Stack.Screen name="CommercialGrows" component={CommercialEvidenceRunsRoute} />'
    );
    expect(source).toContain(
      '<Stack.Screen name="NewCommercialGrow" component={NewCommercialEvidenceRunRoute} />'
    );
    expect(source).toContain(
      'name="CommercialGrowDetail"\n        component={CommercialEvidenceRunDetailRoute}'
    );
  });
});
