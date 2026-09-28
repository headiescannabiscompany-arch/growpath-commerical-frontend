import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

declare const checkoutAttemptBrand: unique symbol;
export type CheckoutAttempt = Readonly<{ [checkoutAttemptBrand]: true }>;

/** A page-local latch; invalidating a result never cancels or retries server work. */
export function useCheckoutAttempt(scope: readonly unknown[]) {
  const mounted = useRef(false);
  const committedScope = useRef<readonly unknown[] | null>(null);
  const generation = useRef(0);
  const active = useRef<{ attempt: CheckoutAttempt; generation: number } | null>(null);

  // Commit only: a suspended/abandoned render must not invalidate the visible page.
  // Compare elements so a new outer array on an ordinary render is harmless.
  useLayoutEffect(() => {
    const previous = committedScope.current;
    if (
      previous === null ||
      previous.length !== scope.length ||
      scope.some((value, index) => !Object.is(value, previous[index]))
    ) {
      committedScope.current = [...scope];
      generation.current += 1;
    }
  });

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      // Retain the lock through unmount/Strict Mode replay until its own finish.
    };
  }, []);

  const begin = useCallback((): CheckoutAttempt | null => {
    if (!mounted.current || active.current) return null;
    // Scope values (including credentials) never become attempt metadata.
    const attempt = Object.freeze({}) as CheckoutAttempt;
    active.current = { attempt, generation: generation.current };
    return attempt;
  }, []);

  const isCurrent = useCallback((attempt: CheckoutAttempt): boolean => {
    return (
      mounted.current &&
      active.current?.attempt === attempt &&
      active.current.generation === generation.current
    );
  }, []);

  const finish = useCallback((attempt: CheckoutAttempt): boolean => {
    if (active.current?.attempt !== attempt) return false;
    active.current = null;
    return mounted.current;
  }, []);

  return useMemo(() => ({ begin, isCurrent, finish }), [begin, isCurrent, finish]);
}
