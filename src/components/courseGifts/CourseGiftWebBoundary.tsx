import React, { useContext, useLayoutEffect, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  usePathname,
  useGlobalSearchParams,
  useNavigationContainerRef,
  useUnstableGlobalHref,
  useRouter
} from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import {
  createInternalCourseGiftWebSession,
  type CourseGiftWebSnapshot
} from "@/utils/courseGiftWebSession";
import { type CourseGiftAuth } from "@/utils/courseGiftContinuation";
import { InternalCourseGiftWebContext } from "./CourseGiftWebScreen";
import { InternalCourseGiftTransportContext } from "./CourseGiftTransportContext";

/** The shipped boundary is deliberately inert. Activating the internal boundary
 * requires a reviewed code change; no environment, account or query can open it.
 */
export default function CourseGiftWebBoundary({
  children
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

/** Future root-level web owner, above Slot so ordinary login navigation does not
 * unmount private continuation. Not used by the public export above.
 */
export function InternalCourseGiftWebBoundary({
  children
}: {
  children: React.ReactNode;
}) {
  const invoke = useContext(InternalCourseGiftTransportContext);
  const transport = useRef({ invoke, revision: 1 });
  if (transport.current.invoke !== invoke)
    transport.current = { invoke, revision: transport.current.revision + 1 };
  // A transport replacement must dispose the old continuation, not carry it into
  // a different context. The selected staging wrapper keeps this function stable.
  return (
    <TransportBoundWebOwner key={transport.current.revision} invoke={invoke}>
      {children}
    </TransportBoundWebOwner>
  );
}

function TransportBoundWebOwner({
  children,
  invoke
}: {
  children: React.ReactNode;
  invoke: React.ContextType<typeof InternalCourseGiftTransportContext>;
}) {
  const auth = useAuth();
  const routePath = usePathname();
  const routeParams = useGlobalSearchParams();
  const router = useRouter();
  const navigation = useNavigationContainerRef();
  const routeHref = useUnstableGlobalHref();
  const latest = useRef(auth);
  latest.current = auth;
  const identity = useRef({ token: auth.token, generation: 1 });
  if (identity.current.token !== auth.token) {
    identity.current = { token: auth.token, generation: identity.current.generation + 1 };
  }
  const readAuth = (): CourseGiftAuth => {
    const value = latest.current;
    const ready = value.isAuthed && Boolean(value.token) && value.meStatus === "ready";
    return {
      state:
        value.isHydrating || (value.token && !ready)
          ? "pending"
          : ready
            ? "ready"
            : "signed_out",
      userId: ready ? value.user?.id || "" : "",
      sessionKey: ready ? `course-gift-session-${identity.current.generation}` : "",
      emailVerified: ready && value.user?.emailVerified === true
    };
  };
  const [session] = useState(() =>
    createInternalCourseGiftWebSession({
      auth: readAuth,
      getAccessToken: async () => latest.current.token || "",
      invoke,
      // Access may be denied by browser privacy controls. No raw token is stored.
      storage: {
        getItem: (key) => window.sessionStorage.getItem(key),
        setItem: (key, value) => window.sessionStorage.setItem(key, value)
      }
    })
  );
  const [snapshot, setSnapshot] = useState<CourseGiftWebSnapshot | null>(null);
  useLayoutEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      session.dispose();
      setSnapshot(null);
      return;
    }
    // Router state can commit before the address bar. Reconcile the route that
    // actually owns the screen, not the previous browser URL.
    const location = new URL(routeHref, window.location.origin);
    const next = session.sync(location.pathname + location.search + location.hash, {
      location,
      history: {
        replaceState: (state, unused, url) =>
          window.history.replaceState(state, unused, url)
      }
    });
    setSnapshot((old) => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
  }, [
    session,
    routeHref,
    auth.token,
    auth.isHydrating,
    auth.isAuthed,
    auth.meStatus,
    auth.user?.id,
    auth.user?.emailVerified
  ]);
  useEffect(() => {
    // Expo retains a fragment as the '#' route param. Clear it after the root
    // navigator mounts, so later history serialization cannot restore it.
    if (Platform.OS !== "web" || routePath !== "/claim-course-gift") return;
    const scrub = () => {
      if (!navigation.isReady()) return;
      const keys = Object.keys(routeParams).filter(
        (key) =>
          routeParams[key] !== undefined && !(key === "#" && routeParams[key] === "")
      );
      if (keys.length)
        router.setParams(
          Object.fromEntries(keys.map((key) => [key, key === "#" ? "" : undefined]))
        );
    };
    const unsubscribe = navigation.addListener("ready", scrub);
    scrub();
    return unsubscribe;
  }, [navigation, routePath, routeParams, router]);
  useEffect(() => () => session.dispose(), [session]);
  return (
    <InternalCourseGiftWebContext.Provider value={{ session, snapshot }}>
      {children}
    </InternalCourseGiftWebContext.Provider>
  );
}
