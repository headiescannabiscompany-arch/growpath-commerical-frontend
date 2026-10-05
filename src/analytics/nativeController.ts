import { filterNativeEvent, NATIVE_SCREENS } from "./nativePolicy";

export type ScreenTransport = {
  screen: (name: string) => unknown;
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
  return {
    setConsent: async (value: boolean) => {
      const request = ++generation;
      // Close the send gate synchronously, before asynchronous storage/transport.
      enabled = false;
      lastScreen = "";
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
        void Promise.resolve(client.screen(path)).catch(() => {});
      } catch {
        /* Optional analytics must not interrupt navigation. */
      }
    }
  };
}
