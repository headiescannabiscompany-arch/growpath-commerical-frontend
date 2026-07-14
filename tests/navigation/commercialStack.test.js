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
    expect(source).toMatch(
      /name="CommercialEvidenceRuns"\s+component={CommercialEvidenceRunsRoute}/
    );
    expect(source).toMatch(
      /name="NewCommercialEvidenceRun"\s+component={NewCommercialEvidenceRunRoute}/
    );
    expect(source).toMatch(
      /name="CommercialEvidenceRunDetail"\s+component={CommercialEvidenceRunDetailRoute}/
    );
    expect(source).toContain(
      '<Stack.Screen name="CommercialGrows" component={CommercialEvidenceRunsRoute} />'
    );
    expect(source).toContain(
      '<Stack.Screen name="NewCommercialGrow" component={NewCommercialEvidenceRunRoute} />'
    );
    expect(source).toMatch(
      /name="CommercialGrowDetail"\s+component={CommercialEvidenceRunDetailRoute}/
    );
  });

  it("routes inventory stack entries through canonical wrappers with legacy screen names", () => {
    expect(source).toContain("../app/home/commercial/inventory");
    expect(source).toContain("../app/home/commercial/inventory/new");
    expect(source).toContain("../app/home/commercial/inventory/[id]");
    expect(source).not.toContain("../app/home/commercial/inventory-create");
    expect(source).not.toContain("../app/home/commercial/inventory-item/[id]");
    expect(source).toMatch(
      /name="CommercialInventoryCreate"\s+component={CommercialInventoryCreateRoute}/
    );
    expect(source).toMatch(
      /name="CommercialInventoryItemDetail"\s+component={CommercialInventoryItemDetailRoute}/
    );
  });
});
