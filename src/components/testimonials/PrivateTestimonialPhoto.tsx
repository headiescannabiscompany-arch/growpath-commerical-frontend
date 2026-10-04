import React, { useEffect, useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { apiRequest } from "@/api/apiRequest";
import { testimonialPhotoUrl } from "@/api/testimonials";
import { useAppTheme } from "@/theme/appTheme";

/** Authenticated bytes only; never puts a token or a separately usable original URL in markup. */
export default function PrivateTestimonialPhoto({
  path,
  contextKey,
  onReady
}: {
  path: string;
  contextKey: string;
  onReady?: (ready: boolean) => void;
}) {
  const { palette } = useAppTheme();
  const [result, setResult] = useState<{
    key: string;
    uri: string;
    failed: boolean;
  } | null>(null);
  const readyCallback = useRef(onReady);
  readyCallback.current = onReady;
  const key = `${contextKey}:${path}`;
  const live = useRef({ key, mounted: true });
  live.current.key = key;
  useEffect(() => {
    let active = true;
    const lifetime = live.current;
    lifetime.mounted = true;
    const controller = new AbortController();
    readyCallback.current?.(false);
    setResult(null);
    void (async () => {
      try {
        const blob = await apiRequest<Blob>(testimonialPhotoUrl(path), {
          responseType: "blob",
          cache: "no-store",
          signal: controller.signal
        });
        if (!active) return;
        if (
          !(blob instanceof Blob) ||
          blob.type !== "image/jpeg" ||
          blob.size <= 0 ||
          blob.size > 5 * 1024 * 1024
        )
          throw new Error("Unavailable photo");
        const uri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Unavailable photo"));
          reader.readAsDataURL(blob);
        });
        if (!active) return;
        if (!uri.startsWith("data:image/jpeg;base64,"))
          throw new Error("Unavailable photo");
        setResult({ key, uri, failed: false });
      } catch {
        if (active) {
          setResult({ key, uri: "", failed: true });
          readyCallback.current?.(false);
        }
      }
    })();
    return () => {
      active = false;
      lifetime.mounted = false;
      controller.abort();
    };
  }, [key, path]);
  const photo = result?.key === key ? result : null;
  return (
    <View>
      {!photo ? (
        <Text style={{ color: palette.textMuted }}>Loading private photo preview...</Text>
      ) : photo.failed ? (
        <Text style={{ color: palette.textMuted }}>
          The exact photo preview is unavailable. Refresh the preview before continuing.
        </Text>
      ) : (
        <Image
          source={{ uri: photo.uri }}
          accessibilityLabel="Exact selected feedback photo preview"
          alt="Exact selected feedback photo preview"
          style={{ width: 240, height: 240, maxWidth: "100%" }}
          resizeMode="contain"
          onLoad={() => {
            if (live.current.mounted && live.current.key === key)
              readyCallback.current?.(true);
          }}
          onError={() => {
            if (live.current.mounted && live.current.key === key) {
              setResult({ key, uri: "", failed: true });
              readyCallback.current?.(false);
            }
          }}
        />
      )}
    </View>
  );
}
