import { useEffect, useRef } from "react";

type PushAuth = {
  userId?: string | null;
  token?: string | null;
  isHydrating: boolean;
};

export function usePushRegistration({ userId, token, isHydrating }: PushAuth) {
  const lastTokenSent = useRef<string | null>(null);

  useEffect(() => {
    if (isHydrating || !userId || !token) return;

    // Avoid redundant calls if the token hasn't changed
    if (lastTokenSent.current === `${userId}:${token}`) return;

    let cancelled = false;

    (async () => {
      try {
        // ✅ PUT YOUR EXISTING PUSH REGISTRATION LOGIC HERE
        // Ensure the backend call uses the api client to attach the token,
        // like: await api.post('/push/register', { token, userId });

        if (!cancelled) lastTokenSent.current = `${userId}:${token}`;
      } catch (error) {
        // Optionally log or handle errors in a better way
        console.error("Push registration failed:", error);
      }
    })();

    return () => {
      cancelled = true; // Cancel if the component unmounts or token changes
    };
  }, [userId, token, isHydrating]);
}
