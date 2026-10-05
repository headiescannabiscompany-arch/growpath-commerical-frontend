import { filterNativeEvent, NATIVE_SCREENS } from "../../src/analytics/nativePolicy";
import {
  HEYCATCH_INGESTION_TOKEN,
  HEYCATCH_PROJECT_KEY
} from "../../src/analytics/marketingPolicy";
import { createNativeAnalyticsController } from "../../src/analytics/nativeController";

const event = (path = "/about") => ({
  event: "$screen",
  properties: {
    $screen_name: path,
    token: HEYCATCH_INGESTION_TOKEN,
    distinct_id: "anonymous"
  }
});
describe("native analytics privacy", () => {
  it.each([...NATIVE_SCREENS])("admits only the fixed screen %s", (path) => {
    const result = filterNativeEvent(event(path), path, true);
    expect(result?.properties?.$screen_name).toBe(path);
    expect(result?.properties?.$groups).toEqual({ project: HEYCATCH_PROJECT_KEY });
    expect(result?.properties?.token).toBe(HEYCATCH_INGESTION_TOKEN);
  });
  it.each([
    "/admin",
    "/privacy",
    "/feedback",
    "/login",
    "/account/billing",
    "/home/personal/logs/secret",
    "/vault",
    "/store/secret",
    "/courses/secret",
    "/about?email=secret",
    "/about#secret"
  ])("rejects %s", (path) => {
    expect(filterNativeEvent(event(path), path, true)).toBeNull();
  });
  it("reconstructs the envelope without arbitrary content or person fields", () => {
    const dirty = {
      ...event(),
      $set: { email: "PRIVATE" },
      $set_once: { name: "PRIVATE" },
      unknown: "PRIVATE",
      properties: {
        ...event().properties,
        $current_url: "PRIVATE",
        $set: { email: "PRIVATE" },
        params: { token: "PRIVATE" },
        $el_text: "PRIVATE",
        $device_name: "PRIVATE",
        $groups: { user: "PRIVATE" }
      }
    };
    const result = filterNativeEvent(dirty, "/about", true);
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(result?.properties?.$process_person_profile).toBe(false);
    expect(result?.properties?.distinct_id).toBe("anonymous");
  });
  it("fails closed for no consent, wrong event, identity, token and stale path", () => {
    expect(filterNativeEvent(event(), "/about", false)).toBeNull();
    expect(
      filterNativeEvent({ ...event(), event: "$autocapture" }, "/about", true)
    ).toBeNull();
    expect(
      filterNativeEvent(
        { ...event(), properties: { ...event().properties, $is_identified: true } },
        "/about",
        true
      )
    ).toBeNull();
    expect(
      filterNativeEvent(
        { ...event(), properties: { ...event().properties, token: "secret" } },
        "/about",
        true
      )
    ).toBeNull();
    expect(filterNativeEvent(event(), "/pricing", true)).toBeNull();
  });
});

describe("native consent controller", () => {
  function fixture() {
    let filter: any;
    const transport = {
      screen: jest.fn(),
      optIn: jest.fn(async () => {}),
      optOut: jest.fn(async () => {})
    };
    const factory = jest.fn((fn) => {
      filter = fn;
      return transport;
    });
    const controller = createNativeAnalyticsController(factory);
    return { controller, transport, factory, filter: () => filter(event()) };
  }
  it("constructs nothing before opt-in and deduplicates screen changes", async () => {
    const f = fixture();
    f.controller.setPath("/about");
    await f.controller.setConsent(false);
    expect(f.factory).not.toHaveBeenCalled();
    await f.controller.setConsent(true);
    f.controller.setPath("/about");
    f.controller.setPath("/about");
    expect(f.transport.screen).toHaveBeenCalledTimes(1);
    f.controller.setPath("/admin");
    expect(f.filter()).toBeNull();
    f.controller.setPath("/about");
    expect(f.transport.screen).toHaveBeenCalledTimes(2);
  });
  it("closes the gate before opt-out resolves", async () => {
    const f = fixture();
    await f.controller.setConsent(true);
    f.controller.setPath("/about");
    let finish!: () => void;
    f.transport.optOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const disabling = f.controller.setConsent(false);
    expect(f.filter()).toBeNull();
    finish();
    await disabling;
  });
  it("late opt-in cannot undo revocation", async () => {
    const f = fixture();
    await f.controller.setConsent(true);
    f.controller.setPath("/about");
    let finish!: () => void;
    f.transport.optIn.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const enabling = f.controller.setConsent(true);
    await f.controller.setConsent(false);
    finish();
    await enabling;
    expect(f.filter()).toBeNull();
  });
  it("failed opt-in stays closed and screen failure does not break navigation", async () => {
    const f = fixture();
    await f.controller.setConsent(true);
    f.controller.setPath("/about");
    f.transport.optIn.mockRejectedValueOnce(new Error("offline"));
    await expect(f.controller.setConsent(true)).rejects.toThrow("offline");
    expect(f.filter()).toBeNull();
    await f.controller.setConsent(true);
    f.transport.screen.mockImplementation(() => {
      throw new Error("offline");
    });
    expect(() => f.controller.setPath("/pricing")).not.toThrow();
  });
});
