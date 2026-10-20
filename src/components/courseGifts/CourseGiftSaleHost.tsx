import React, { useContext, useLayoutEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import { giftObjectId, giftUuid } from "@/api/courseGiftSaleContract";
import {
  createCourseGiftContinuation,
  type CourseGiftAuth
} from "@/utils/courseGiftContinuation";
import {
  createInternalCourseGiftSaleHttpSession,
  InternalCourseGiftSaleScreen
} from "./CourseGiftSaleScreens";
import { InternalCourseGiftTransportContext } from "./CourseGiftTransportContext";

type Session = ReturnType<typeof createInternalCourseGiftSaleHttpSession>;
type Props = {
  mode: "creator" | "buyer";
  courseId: string;
  // Caller supplies a stable original attempt, never a new ID on retry or mount.
  attemptId: string;
  onNavigateToCheckout: (url: string) => void;
  storage?: Pick<Storage, "getItem" | "setItem">;
  newRequestId?: () => string;
};
const browserStorage = {
  getItem: (key: string) => window.sessionStorage.getItem(key),
  setItem: (key: string, value: string) => window.sessionStorage.setItem(key, value)
};
const newRequestId = () => globalThis.crypto.randomUUID();

/** No public route imports or mounts the internal host. No flag opens this gate. */
export default function CourseGiftSaleHost() {
  return null;
}

export function InternalCourseGiftSaleHost(props: Props) {
  return Platform.OS === "web" ? <AuthenticatedSaleHost {...props} /> : null;
}

function AuthenticatedSaleHost(props: Props) {
  const invoke = useContext(InternalCourseGiftTransportContext);
  const auth = useAuth();
  const entitlements = useEntitlements();
  const facility = useFacility();
  const ready =
    auth.isAuthed &&
    Boolean(auth.token) &&
    !auth.isHydrating &&
    auth.meStatus === "ready" &&
    entitlements.ready;
  const state: CourseGiftAuth["state"] = ready
    ? "ready"
    : auth.isHydrating || Boolean(auth.token)
      ? "pending"
      : "signed_out";
  // Token is compared only in memory, never in a React key, record or diagnostic.
  const identity = JSON.stringify([
    state,
    auth.user?.id,
    auth.user?.emailVerified,
    auth.user?.role,
    auth.user?.plan,
    entitlements.mode,
    entitlements.facilityId,
    entitlements.facilityRole,
    facility.selectedId,
    props.mode,
    props.courseId,
    props.attemptId
  ]);
  const generation = useRef({ identity, token: auth.token, invoke, revision: 1 });
  if (
    generation.current.identity !== identity ||
    generation.current.token !== auth.token ||
    generation.current.invoke !== invoke
  )
    generation.current = {
      identity,
      token: auth.token,
      invoke,
      revision: generation.current.revision + 1
    };
  const revision = generation.current.revision;
  const latest = useRef({ auth, state, revision });
  latest.current = { auth, state, revision };
  const storage = props.storage || browserStorage;
  const makeId = props.newRequestId || newRequestId;
  const key = `${revision}:${props.mode}:${props.courseId}:${props.attemptId}`;
  const [frame, setFrame] = useState<{ key: string; session: Session } | null>(null);

  useLayoutEffect(() => {
    if (!ready || !giftObjectId(props.courseId) || !giftUuid(props.attemptId)) {
      setFrame(null);
      return;
    }
    const readAuth = (): CourseGiftAuth => ({
      state: latest.current.state,
      userId: latest.current.auth.user?.id || "",
      sessionKey: `course-gift-sale-${latest.current.revision}`,
      emailVerified: latest.current.auth.user?.emailVerified === true
    });
    const session = createInternalCourseGiftSaleHttpSession({
      platform: "web",
      auth: readAuth,
      getAccessToken: async () => latest.current.auth.token || "",
      invoke,
      continuation: createCourseGiftContinuation({ storage }),
      courseId: props.courseId,
      attemptId: props.attemptId,
      newRequestId: makeId
    });
    setFrame({ key, session });
    return () => session.dispose(); // Also safe under Strict Mode setup/cleanup replay.
  }, [key, ready, storage, makeId, props.courseId, props.attemptId, invoke]);

  // Hide old data during the render that changes scope, before effect cleanup.
  if (!ready || !frame || frame.key !== key) return null;
  return (
    <InternalCourseGiftSaleScreen
      mode={props.mode}
      session={frame.session}
      onNavigateToCheckout={props.onNavigateToCheckout}
    />
  );
}
