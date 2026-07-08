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

  it("routes evidence stack entries through canonical wrappers with legacy aliases", () => {
    expect(source).toContain("../app/home/commercial/evidence-runs");
    expect(source).toContain("../app/home/commercial/evidence-runs/[id]");
    expect(source).toContain("../app/home/commercial/evidence-runs/new");
    expect(source).not.toContain('../app/home/commercial/grows"');
    expect(source).not.toContain("../app/home/commercial/grows/[growId]");
    expect(source).toContain(
      'name="CommercialEvidenceRuns"\n        component={CommercialEvidenceRunsRoute}'
    );
    expect(source).toContain(
      'name="NewCommercialEvidenceRun"\n        component={NewCommercialEvidenceRunRoute}'
    );
    expect(source).toContain(
      'name="CommercialEvidenceRunDetail"\n        component={CommercialEvidenceRunDetailRoute}'
    );
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

  it("routes inventory stack entries through canonical wrappers with legacy screen names", () => {
    expect(source).toContain("../app/home/commercial/inventory");
    expect(source).toContain("../app/home/commercial/inventory/new");
    expect(source).toContain("../app/home/commercial/inventory/[id]");
    expect(source).not.toContain("../app/home/commercial/inventory-create");
    expect(source).not.toContain("../app/home/commercial/inventory-item/[id]");
    expect(source).toContain(
      'name="CommercialInventoryCreate"\n        component={CommercialInventoryCreateRoute}'
    );
    expect(source).toContain(
      'name="CommercialInventoryItemDetail"\n        component={CommercialInventoryItemDetailRoute}'
    );
  });
});
