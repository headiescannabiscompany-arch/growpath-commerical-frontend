import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { Switch, Text, View } from "react-native";
import { usePathname } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PostHog } from "posthog-react-native";
import { HEYCATCH_INGESTION_TOKEN } from "./marketingPolicy";
import { createNativeAnalyticsController } from "./nativeController";
import { useAppTheme } from "../theme/appTheme";

const CONSENT_KEY = "growpath.mobile-screen-analytics.v1";
const PrivacyContext = createContext({
  enabled: false,
  ready: false,
  busy: false,
  error: "",
  change: async (_value: boolean) => {}
});

// Custom native transport: HeyCatch0.8.0's provider ignores beforeSend. Do NOT
// mount it or init its native entry. This uses its existing transport/protocol,
// with filtering wired directly and all automatic content capture disabled.
export function MobileAnalyticsBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const changing = useRef(false);
  const controller = useRef<ReturnType<typeof createNativeAnalyticsController> | null>(
    null
  );
  controller.current ??= createNativeAnalyticsController(
    (filter) =>
      new PostHog(HEYCATCH_INGESTION_TOKEN, {
        host: "https://in.heycatch.ai",
        persistence: "memory",
        defaultOptIn: false,
        captureAppLifecycleEvents: false,
        capturePushNotificationSubscriptions: false,
        capturePushNotificationOpened: false,
        enableSessionReplay: false,
        personProfiles: "never",
        errorTracking: { autocapture: false },
        preloadFeatureFlags: false,
        disableRemoteFeatureFlags: true,
        disableSurveys: true,
        sendFeatureFlagEvent: false,
        setDefaultPersonProperties: false,
        disableGeoip: true,
        flushAt: 1,
        flushInterval: 0,
        before_send: [filter]
      })
  );
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void AsyncStorage.getItem(CONSENT_KEY)
      .then(async (value) => {
        if (!active) return;
        const allowed = value === "yes";
        await controller.current!.setConsent(allowed);
        if (active) {
          setEnabled(allowed);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load your preference. Optional analytics is off.");
          setReady(true);
        }
      });
    return () => {
      active = false;
      mounted.current = false;
      void controller.current!.setConsent(false).catch(() => {});
    };
  }, []);
  useLayoutEffect(() => {
    controller.current!.setPath(pathname);
  }, [pathname, enabled]);
  const change = async (value: boolean) => {
    if (!ready || changing.current) return;
    changing.current = true;
    setBusy(true);
    setError("");
    setEnabled(false);
    try {
      await controller.current!.setConsent(false);
      await AsyncStorage.setItem(CONSENT_KEY, value ? "yes" : "no");
      if (!mounted.current) return;
      await controller.current!.setConsent(value);
      if (mounted.current) setEnabled(value);
    } catch {
      if (mounted.current)
        setError(
          "Could not save the preference. Analytics is off for this session; please retry."
        );
    } finally {
      changing.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <PrivacyContext.Provider value={{ enabled, ready, busy, error, change }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function MobileAnalyticsChoice() {
  const state = useContext(PrivacyContext);
  const { palette } = useAppTheme();
  return (
    <View style={{ gap: 10, paddingTop: 20 }}>
      <Text
        accessibilityRole="header"
        style={{ color: palette.text, fontWeight: "700", fontSize: 20 }}
      >
        Optional mobile analytics
      </Text>
      <Text style={{ color: palette.textSoft }}>
        Help improve GrowPathAI by sharing approved public and browsing screen names with
        HeyCatch. Off by default. No account identity, journal content, photos, searches,
        route parameters, taps, recordings, or Admin/Vault activity. Anonymous identifiers
        reset when the app restarts. You can change this choice here anytime.
      </Text>
      <Switch
        accessibilityLabel="Allow optional mobile screen analytics"
        value={state.enabled}
        disabled={!state.ready || state.busy}
        onValueChange={(value) => {
          void state.change(value);
        }}
      />
      {state.error ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          {state.error}
        </Text>
      ) : null}
    </View>
  );
}
