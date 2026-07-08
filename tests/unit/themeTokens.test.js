import { radius } from "@/theme/theme.js";

describe("shared theme tokens", () => {
  it("keeps shared cards aligned with the tighter workspace style", () => {
    expect(radius.card).toBe(8);
    expect(radius.pill).toBe(999);
  });
});
