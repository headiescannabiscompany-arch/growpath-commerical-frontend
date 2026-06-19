"use strict";

const request = require("supertest");
const { connect, clear, disconnect } = require("../helpers/dbTestUtils");
const User = require("../../models/User");
const Grow = require("../../models/Grow");

let app;

describe("nutrient recipe API", () => {
  let userId;
  let growId;

  beforeAll(async () => {
    await connect();
    app = require("../../app")();
  });

  beforeEach(async () => {
    const user = await User.create({ email: "recipe@test.com", password: "pw" });
    userId = String(user._id);
    const grow = await Grow.create({ user: userId, name: "Recipe grow" });
    growId = String(grow._id);
  });

  afterEach(clear);
  afterAll(disconnect);

  function payload(name = "Veg base") {
    return {
      name,
      growId,
      batchVolume: 5,
      batchUnit: "gal",
      stage: "veg",
      medium: "coco",
      products: [
        {
          name: "Base A",
          amount: 10,
          unit: "g",
          N: 10,
          P: 5,
          K: 5,
          chemistryKey: "water_soluble_nitrate",
          sourceType: "manufacturer"
        }
      ]
    };
  }

  test("saves, versions, clones, and records recipe use", async () => {
    const created = await request(app)
      .post("/api/tools/recipes")
      .set("x-test-user-id", userId)
      .send(payload());
    expect(created.statusCode).toBe(201);
    expect(created.body.recipe.version).toBe(1);
    const recipeId = String(created.body.recipe._id);

    const revised = await request(app)
      .post(`/api/tools/recipes/${recipeId}/revisions`)
      .set("x-test-user-id", userId)
      .send({ ...payload("Veg base revised"), batchVolume: 10 });
    expect(revised.statusCode).toBe(201);
    expect(revised.body.recipe.version).toBe(2);
    expect(revised.body.recipe.previousVersionId).toBe(recipeId);

    const revisedId = String(revised.body.recipe._id);
    const cloned = await request(app)
      .post(`/api/tools/recipes/${revisedId}/clone`)
      .set("x-test-user-id", userId)
      .send({ name: "Flower experiment" });
    expect(cloned.statusCode).toBe(201);
    expect(cloned.body.recipe.version).toBe(1);
    expect(cloned.body.recipe.clonedFromRecipeId).toBe(revisedId);

    const used = await request(app)
      .post(`/api/tools/recipes/${revisedId}/use`)
      .set("x-test-user-id", userId)
      .send({ growId, batchVolume: 2, batchUnit: "gal" });
    expect(used.statusCode).toBe(201);
    expect(used.body.toolRun.linkedRecipeId).toBe(revisedId);
    expect(used.body.log.type).toBe("FEEDING");

    const list = await request(app)
      .get(`/api/tools/recipes?growId=${growId}`)
      .set("x-test-user-id", userId);
    expect(list.statusCode).toBe(200);
    expect(list.body.items.some((row) => row.name === "Veg base revised")).toBe(true);
  });
});
