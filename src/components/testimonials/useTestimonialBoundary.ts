import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useOptionalAuth } from "@/auth/AuthContext";

export type TestimonialOperation = { key: number; controller: AbortController };

/** Page-local, individual-account boundary. A workspace never owns a testimonial. */
export function useTestimonialBoundary(scope = "owner", authorized = true) {
  const auth = useOptionalAuth();
  const accountId = String(auth?.user?.id || auth?.user?._id || "");
  const enabled = Boolean(
    authorized &&
    auth?.isAuthed &&
    auth.token &&
    !auth.isHydrating &&
    auth.meStatus === "ready" &&
    accountId
  );
  const identity = JSON.stringify([
    accountId,
    auth?.token,
    auth?.isAuthed,
    auth?.isHydrating,
    auth?.meStatus,
    authorized,
    scope
  ]);
  const [context, setContext] = useState({ identity, key: 0 });
  let activeContext = context;
  if (context.identity !== identity) {
    activeContext = { identity, key: context.key + 1 };
    setContext(activeContext);
  }
  const key = activeContext.key;
  const contextRef = useRef(activeContext);
  useLayoutEffect(() => {
    contextRef.current = activeContext;
  }, [activeContext]);
  const mounted = useRef(true);
  const operation = useRef<TestimonialOperation | null>(null);
  const [busy, setBusy] = useState(false);
  const current = useCallback(
    (candidate: number) => mounted.current && contextRef.current.key === candidate,
    []
  );
  const idle = useCallback(() => !operation.current, []);
  const begin = useCallback(() => {
    if (!enabled || !current(key) || operation.current) return null;
    const next = { key, controller: new AbortController() };
    operation.current = next;
    setBusy(true);
    return next;
  }, [current, enabled, key]);
  const finish = useCallback(
    (candidate: TestimonialOperation) => {
      if (operation.current === candidate) {
        operation.current = null;
        if (current(candidate.key)) setBusy(false);
      }
    },
    [current]
  );
  useEffect(() => {
    mounted.current = true;
    operation.current?.controller.abort();
    operation.current = null;
    setBusy(false);
    return () => {
      operation.current?.controller.abort();
      operation.current = null;
      mounted.current = false;
    };
  }, [key]);
  return { auth, accountId, enabled, key, busy, current, begin, finish, idle };
}
