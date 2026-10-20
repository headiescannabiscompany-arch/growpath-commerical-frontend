import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Platform, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import PrimaryButton from "@/components/PrimaryButton";
import { useAppTheme } from "@/theme/appTheme";
import {
  giftObjectId,
  giftUuid,
  safeGiftCheckoutUrl
} from "@/api/courseGiftSaleContract";
import {
  createCourseGiftContinuation,
  type CourseGiftAuth
} from "@/utils/courseGiftContinuation";
import { enterCourseGiftDiagnosticScope } from "@/utils/courseGiftDiagnosticPrivacy";
import { InternalCourseGiftSaleHost } from "./CourseGiftSaleHost";
import { InternalCourseGiftWebBoundary } from "./CourseGiftWebBoundary";

type Options = {
  children: React.ReactNode;
  storage: Pick<Storage, "getItem" | "setItem">;
  newRequestId: () => string;
  onNavigateToCheckout: (url: string) => void;
};
type EntryContext = Omit<Options, "children"> & {
  auth: CourseGiftAuth;
  revision: number;
};
const Entry = createContext<EntryContext | null>(null);
type Props = {
  courseId: unknown;
  requestedCourseId: unknown;
  mode: "creator" | "buyer";
  eligible: boolean;
};

/** Code-only LOCAL composition. The ordinary root never imports/mounts this
 * provider; flags, query params and account roles cannot enable public gifting.
 * Explicit storage/ID/navigation fixtures are required; no storage migration.
 * Local harnesses must separately isolate the existing HTTP adapter's transport.
 */
export function InternalCourseGiftEntryBoundary(props: Options) {
  if (
    process.env.NODE_ENV !== "test" ||
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  )
    return <>{props.children}</>;
  return <InternalCourseGiftScopedEntryBoundary {...props} />;
}

/** Shared composition, not an activation switch. Only the loopback wrapper above
 * and the origin-pinned staging wrapper select this owner. The staging candidate
 * root selects the latter; production/native/unknown targets remain inert.
 */
export function InternalCourseGiftScopedEntryBoundary(props: Options) {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const facility = useFacility();
  const userId = auth.user?.id || "";
  const ready =
    auth.isAuthed &&
    !auth.isHydrating &&
    auth.meStatus === "ready" &&
    Boolean(auth.token) &&
    auth.user?.emailVerified === true &&
    giftObjectId(userId) &&
    entitlements.ready === true &&
    ["personal", "commercial"].includes(entitlements.mode);
  const scope = JSON.stringify([
    ready,
    userId,
    auth.user?.role,
    auth.user?.plan,
    auth.user?.emailVerified,
    entitlements.mode,
    entitlements.facilityId,
    entitlements.facilityRole,
    facility.selectedId
  ]);
  const generation = useRef({ scope, token: auth.token, revision: 1 });
  if (scope !== generation.current.scope || auth.token !== generation.current.token) {
    generation.current = {
      scope,
      token: auth.token,
      revision: generation.current.revision + 1
    };
  }
  const revision = generation.current.revision;
  const value = useMemo<EntryContext | null>(
    () =>
      ready
        ? {
            storage: props.storage,
            newRequestId: props.newRequestId,
            onNavigateToCheckout: props.onNavigateToCheckout,
            revision,
            auth: {
              state: "ready",
              userId,
              sessionKey: `gift-entry-${revision}`,
              emailVerified: true
            }
          }
        : null,
    [
      ready,
      revision,
      userId,
      props.storage,
      props.newRequestId,
      props.onNavigateToCheckout
    ]
  );
  // Reuse the accepted root-owned claim/login/status continuation; not a second
  // router or a new account/session store. Entry and recipient scope are separate.
  return (
    <InternalCourseGiftWebBoundary>
      <Entry.Provider value={value}>{props.children}</Entry.Provider>
    </InternalCourseGiftWebBoundary>
  );
}

/** Real course pages mount this inert outlet. Only an explicit internal root
 * supplies context; ordinary production/native renders return null with no effect.
 */
export default function CourseGiftCourseEntry(props: Props) {
  const context = useContext(Entry);
  if (
    !context ||
    props.eligible !== true ||
    !giftObjectId(props.courseId) ||
    props.courseId !== props.requestedCourseId ||
    !["creator", "buyer"].includes(props.mode)
  )
    return null;
  return (
    <SelectedEntry
      key={`${context.revision}:${props.courseId}:${props.mode}`}
      context={context}
      courseId={props.courseId}
      mode={props.mode}
    />
  );
}

function SelectedEntry({
  context,
  courseId,
  mode
}: {
  context: EntryContext;
  courseId: string;
  mode: "creator" | "buyer";
}) {
  const { palette } = useAppTheme();
  const [attempt, setAttempt] = useState("");
  const [error, setError] = useState(false);
  const started = useRef(false);
  const alive = useRef(true);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  function open() {
    if (started.current || !alive.current) return;
    const continuation = createCourseGiftContinuation({ storage: context.storage });
    try {
      continuation.observe(context.auth);
      const saved = continuation.recoverSale(courseId, mode);
      // Corrupt/lost storage cannot prove no previous attempt. Never reset it.
      if (saved.state === "blocked" && !saved.value) throw Error("Unavailable");
      const original =
        saved.value?.kind === "buyer"
          ? saved.value.attemptId
          : saved.value?.kind === "creator"
            ? saved.value.requestId
            : context.newRequestId();
      if (!giftUuid(original)) throw Error("Unavailable");
      started.current = true;
      setAttempt(original);
      setError(false);
    } catch {
      setError(true);
    } finally {
      continuation.dispose();
    }
  }
  return (
    <View style={{ gap: 12 }}>
      {!attempt && (
        <PrimaryButton
          title={
            mode === "creator"
              ? "Review course gift settings"
              : "Review gifting this course"
          }
          onPress={open}
        />
      )}
      {error && (
        <Text accessibilityRole="alert" style={{ color: palette.text }}>
          Gift recovery is unavailable. Keep the original payment details for support; do
          not start another gift payment.
        </Text>
      )}
      {Boolean(attempt) && (
        <PrivateSale
          context={context}
          courseId={courseId}
          mode={mode}
          attempt={attempt}
          onNavigate={(url) => {
            if (alive.current && safeGiftCheckoutUrl(url))
              context.onNavigateToCheckout(url);
          }}
        />
      )}
    </View>
  );
}

function PrivateSale({
  context,
  courseId,
  mode,
  attempt,
  onNavigate
}: {
  context: EntryContext;
  courseId: string;
  mode: "creator" | "buyer";
  attempt: string;
  onNavigate: (url: string) => void;
}) {
  const [protectedScope, setProtectedScope] = useState(false);
  useLayoutEffect(() => {
    const leave = enterCourseGiftDiagnosticScope();
    setProtectedScope(true);
    return leave;
  }, []);
  // Generic course URLs are not private-route markers. Hold diagnostic suppression
  // before any recipient/terms form mounts; never change analytics consent.
  return protectedScope ? (
    <InternalCourseGiftSaleHost
      mode={mode}
      courseId={courseId}
      attemptId={attempt}
      storage={context.storage}
      newRequestId={context.newRequestId}
      onNavigateToCheckout={onNavigate}
    />
  ) : null;
}
