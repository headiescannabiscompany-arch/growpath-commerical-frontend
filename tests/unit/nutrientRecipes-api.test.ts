const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  compareNutrientRecipes,
  convertRecipeToProductDraft,
  convertRecipeToProductionBatch
} = require("@/api/nutrientRecipes");

describe("shared recipe API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("compares exactly two durable recipe versions", async () => {
    mockApiRequest.mockResolvedValue({
      comparison: { leftRecipeId: "recipe-1", rightRecipeId: "recipe-2" }
    });

    await expect(compareNutrientRecipes("recipe-1", "recipe-2")).resolves.toEqual({
      leftRecipeId: "recipe-1",
      rightRecipeId: "recipe-2"
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools/recipes/compare", {
      method: "POST",
      body: { recipeIds: ["recipe-1", "recipe-2"] }
    });
  });

  it("converts a recipe to linked product and production drafts", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ product: { id: "product-1" } })
      .mockResolvedValueOnce({ batch: { id: "batch-1" } });

    await expect(
      convertRecipeToProductDraft("recipe-1", { name: "Veg Mix" })
    ).resolves.toEqual({ id: "product-1" });
    await expect(
      convertRecipeToProductionBatch("recipe-1", { facilityId: "facility-1" })
    ).resolves.toEqual({ id: "batch-1" });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/tools/recipes/recipe-1/product-draft",
      { method: "POST", body: { name: "Veg Mix" } }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/tools/recipes/recipe-1/production-batch",
      { method: "POST", body: { facilityId: "facility-1" } }
    );
  });
});
