import fs from "fs";
import path from "path";

describe("CommercialStack", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/navigation/CommercialStack.js"),
    "utf8"
  );

  it("routes feed and orders through commercial workspace screens", () => {
    expect(source).toContain('../app/home/commercial/feed');
    expect(source).toContain('../app/home/commercial/orders');
    expect(source).not.toContain('../app/feed');
    expect(source).not.toContain('../screens/CommercialOrdersScreen');
    expect(source).toContain(
      '<Stack.Screen name="CommercialOrders" component={CommercialOrdersRoute} />'
    );
  });
});
