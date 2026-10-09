import { personalMoreReturnHref } from "@/utils/personalMoreReturn";

describe("Personal More creator return marker", () => {
  it.each(["personal-more", ["personal-more", "https://example.com"]])(
    "maps only the explicit first source marker %j to More",
    (from) => expect(personalMoreReturnHref(from)).toBe("/home/personal/more")
  );

  it.each([
    undefined,
    "",
    [],
    "https://example.com",
    "//example.com",
    "/admin",
    "/home/personal/more",
    "personal-more?next=/admin",
    ["/admin", "personal-more"]
  ])("leaves ordinary history unchanged for %j", (from) => {
    expect(personalMoreReturnHref(from)).toBeUndefined();
  });
});
