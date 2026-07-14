import { commercialToolHref } from "@/components/commercial/CommercialContextualTools";

describe("commercial contextual tool links", () => {
  it("launches the shared tool inside the commercial workspace with record context", () => {
    const href = commercialToolHref("environment", {
      source: "commercial_evidence_run_detail",
      growId: "run-1",
      productId: "product-1",
      batchId: "batch-1",
      prompt: "Review this run"
    });

    expect(href).toContain("/home/commercial/tools/environment?");
    expect(href).toContain("workspace=commercial");
    expect(href).toContain("source=commercial_evidence_run_detail");
    expect(href).toContain("growId=run-1");
    expect(href).toContain("productId=product-1");
    expect(href).toContain("batchId=batch-1");
    expect(href).toContain("prompt=Review+this+run");
  });

  it("does not leak blank identifiers into a product tool launch", () => {
    const href = commercialToolHref("recipe-builder", {
      source: "commercial_product_detail",
      productId: "product-2",
      growId: ""
    });

    expect(href).toContain("productId=product-2");
    expect(href).not.toContain("growId=");
  });
});
