import {
  filterNativeEvent,
  NATIVE_SCREENS,
  NATIVE_PROJECT_METADATA
} from "./nativePolicy";
import { HEYCATCH_PROJECT_KEY } from "./marketingPolicy";

export type ScreenTransport = {
  screen: (name: string) => unknown;
  capture: (
    event: string,
    properties: Record<string, string | Record<string, string>>
  ) => unknown;
  optOut: () => Promise<unknown>;
  optIn: () => Promise<unknown>;
};
export function createNativeAnalyticsController(
  createTransport: (
    filter: (
      event: Parameters<typeof filterNativeEvent>[0]
    ) => ReturnType<typeof filterNativeEvent>
  ) => ScreenTransport
) {
  let client: ScreenTransport | null = null;
  let enabled = false;
  let currentPath = "";
  let lastScreen = "";
  let generation = 0;
  let registered = false;
  return {
    setConsent: async (value: boolean) => {
      const request = ++generation;
      // Close the send gate synchronously, before asynchronous storage/transport.
      enabled = false;
      lastScreen = "";
      registered = false;
      if (!value) {
        if (client) await client.optOut();
        return;
      }
      client ??= createTransport((event) =>
        filterNativeEvent(event, currentPath, enabled)
      );
      await client.optIn();
      // A late opt-in must never undo revocation or component cleanup.
      if (request === generation) enabled = true;
    },
    setPath: (path: string) => {
      currentPath = path;
      if (!NATIVE_SCREENS.has(path)) {
        lastScreen = "";
        return;
      }
      if (!enabled || !client || lastScreen === path) return;
      lastScreen = path;
      try {
        // Defer registration until a consented PUBLIC screen. Opt-in happens
        // on the private Privacy page, where no analytics may leave the device.
        if (!registered) {
          // group() requires person processing in this transport. Keep
          // personProfiles=never and send only this filtered public registration.
          void Promise.resolve(
            client.capture("$groupidentify", {
              $group_type: "project",
              $group_key: HEYCATCH_PROJECT_KEY,
              $group_set: { ...NATIVE_PROJECT_METADATA }
            })
          ).catch(() => {});
          registered = true;
        }
        void Promise.resolve(client.screen(path)).catch(() => {});
      } catch {
        /* Optional analytics must not interrupt navigation. */
      }
    }
  };
}
