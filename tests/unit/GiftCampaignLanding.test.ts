import { isGiftCampaignLanding } from "@/features/billing/isGiftCampaignLanding";
import { resolveAuthReturnPath } from "@/utils/authReturnPath";

describe("advertised subscription gift landing", () => {
  it.each([
    "fbclid",
    "gclid",
    "msclkid",
    "utm_source",
    "utm_campaign",
    "utm_content",
    "gbraid"
  ])(
    "opens a gift when an ad adds %s while preserving the separate auth return rules",
    (field) => {
      const params = { gift: "1", [field]: "holiday" };
      const path = `/offers?${field}=holiday&gift=1`;
      expect(isGiftCampaignLanding(params, "", path)).toBe(true);
      expect(resolveAuthReturnPath("/offers", params, "", path)).not.toBe(
        "/offers?gift=1"
      );
    }
  );
  it("supports several ad fields and a native deep link", () => {
    const params = { gift: "1", utm_campaign: "Winter gifts", utm_source: "newsletter" };
    expect(
      isGiftCampaignLanding(
        params,
        "",
        "/offers?gift=1&utm_campaign=Winter%20gifts&utm_source=newsletter"
      )
    ).toBe(true);
    expect(isGiftCampaignLanding(params, "", undefined)).toBe(true);
  });
  it.each([
    "next",
    "plan",
    "session_id",
    "checkout_attempt_id",
    "token",
    "liveSessionId"
  ])("keeps %s out of a campaign landing", (field) => {
    expect(
      isGiftCampaignLanding(
        { gift: "1", fbclid: "ad", [field]: "x" },
        "",
        `/offers?gift=1&fbclid=ad&${field}=x`
      )
    ).toBe(false);
  });
  it("rejects ambiguous route values, duplicated browser keys, fragments and other paths", () => {
    const good = { gift: "1", gclid: "abc" };
    expect(isGiftCampaignLanding({ gift: ["1", "1"], gclid: "abc" }, "", undefined)).toBe(
      false
    );
    expect(isGiftCampaignLanding(good, "", "/offers?gift=1&gclid=x&gift=1")).toBe(false);
    expect(
      isGiftCampaignLanding(good, "#token=sensitive", "/offers?gift=1&gclid=abc")
    ).toBe(false);
    expect(isGiftCampaignLanding(good, "", "/account?gift=1&gclid=abc")).toBe(false);
    expect(
      isGiftCampaignLanding(good, "", "/offers?gift=1&gclid=abc&next=anything")
    ).toBe(false);
    expect(isGiftCampaignLanding({ gift: "1" }, "", "/offers?gift=1")).toBe(false);
  });
});
