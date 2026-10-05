import {
  filterMarketingEvent,
  MARKETING_PATHS
} from "../../src/analytics/marketingPolicy";
const origin = "https://growpathai.com";
const event = (url = origin + "/pricing") => ({
  event: "$pageview",
  properties: {
    $current_url: url,
    distinct_id: "anonymous-id",
    $is_identified: false,
    $session_id: "anonymous-session",
    $browser: "Safari"
  }
});
describe("public-only HeyCatch policy", () => {
  it.each([...MARKETING_PATHS])("permits only the public marketing path %s", (path) => {
    expect(
      filterMarketingEvent(event(origin + path), origin + path)?.properties.$pathname
    ).toBe(path);
  });
  it.each([
    "/admin",
    "/feedback",
    "/login",
    "/register",
    "/contact",
    "/account/billing",
    "/home/personal",
    "/home/facility/reports",
    "/store",
    "/videos/abc",
    "/live-session",
    "/reset-password",
    "/features/secret",
    "/ABOUT",
    "/a"
  ])(
    "rejects private/non-marketing route %s on either side of SPA navigation",
    (path) => {
      expect(filterMarketingEvent(event(origin + path), origin + "/")).toBeNull();
      expect(filterMarketingEvent(event(), origin + path)).toBeNull();
    }
  );
  it.each([
    "http://growpathai.com",
    "https://growpath-web-staging.onrender.com",
    "http://localhost:8081",
    "https://growpathai.com.evil.test",
    "https://user:password@growpathai.com"
  ])("rejects non-production or credentialed origin %s", (url) => {
    expect(filterMarketingEvent(event(url + "/pricing"), url + "/pricing")).toBeNull();
  });
  it("removes secrets, user text, identity properties and query/referrer history", () => {
    const input = event(origin + "/pricing?email=private@example.com#secret");
    Object.assign(input.properties, {
      $set: { email: "private@example.com" },
      $set_once: { $initial_current_url: origin + "/admin?token=secret" },
      $referrer: origin + "/feedback?token=secret",
      $elements: [{ text: "private" }],
      $elements_chain: "private",
      email: "private@example.com",
      utm_campaign: "private"
    });
    const result = filterMarketingEvent(input, origin + "/pricing?token=secret");
    expect(JSON.stringify(result)).not.toMatch(/secret|private|email|elements|referrer/);
    expect(result?.properties.$current_url).toBe(origin + "/pricing");
    expect(result?.properties.distinct_id).toBe("anonymous-id");
  });
  it("keeps documented short-channel attribution only", () => {
    const input = event();
    Object.assign(input.properties, { utm_source: "heycatch", utm_campaign: "x" });
    expect(filterMarketingEvent(input, origin)?.properties.utm_campaign).toBe("x");
  });
  it("preserves useful fixed navigation labels, never arbitrary text or attributes", () => {
    const input = { ...event(), event: "$autocapture" };
    Object.assign(input.properties, {
      $el_text: "Create free account",
      $elements_chain: "input:value=secret"
    });
    const result = filterMarketingEvent(input, origin);
    expect(result?.properties.$el_text).toBe("Create free account");
    expect(result?.properties.$elements_chain).toBeUndefined();
    Object.assign(input.properties, { $el_text: "Customer private email@example.com" });
    expect(filterMarketingEvent(input, origin)?.properties.$el_text).toBeUndefined();
  });
  it("rejects identity/business events, identified visitors and missing URL", () => {
    expect(filterMarketingEvent({ ...event(), event: "$identify" }, origin)).toBeNull();
    expect(
      filterMarketingEvent({ ...event(), event: "subscription_started" }, origin)
    ).toBeNull();
    const identified = event();
    identified.properties.$is_identified = true;
    expect(filterMarketingEvent(identified, origin)).toBeNull();
    expect(
      filterMarketingEvent({ event: "$pageview", properties: {} }, origin)
    ).toBeNull();
    expect(filterMarketingEvent(null, origin)).toBeNull();
  });
});
