import { useEffect } from "react";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";

/**
 * Canonical deep link handler (safe + lint-clean).
 * If you later want specific deep-link routes (invites, joins, etc),
 * we’ll extend handleUrl() with explicit mapping.
 */
export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const handleUrl = (url: string) => {
      try {
        const parsed = Linking.parse(url);
        const path = typeof parsed?.path === "string" ? parsed.path : "";
        if (!path) return;

        // Keep it simple: route by path only (query handling can be added later)
        router.push(`/${path}`);
      } catch {
        // ignore
      }
    };

    (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (!mounted || !initialUrl) return;
        handleUrl(initialUrl);
      } catch {
        // ignore
      }
    })();

    const sub = Linking.addEventListener("url", (evt) => {
      if (!mounted) return;
      if (evt?.url) handleUrl(evt.url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [router]);

  return null;
}
