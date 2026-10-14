import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAppTheme } from "@/theme/appTheme";
import {
  getPublicMarketingObservations,
  type PublicMarketingObservation
} from "@/api/publicMarketingActivity";
import marketing from "./publicMarketing.json";

/** No static copies, credentials, private records, photos, identities or usage counts. */
export default function PublicCommunityActivity() {
  const { palette } = useAppTheme();
  const [rows, setRows] = useState<PublicMarketingObservation[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const mounted = useRef(false);
  const generation = useRef(0);
  const operation = useRef<AbortController | null>(null);
  const invalidate = useCallback(() => {
    generation.current++;
    operation.current?.abort();
    operation.current = null;
  }, []);
  const load = useCallback(async () => {
    if (!mounted.current || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    const request = ++generation.current;
    setRows([]);
    setState("loading");
    try {
      const result = await getPublicMarketingObservations(controller.signal);
      if (mounted.current && generation.current === request) {
        setRows(result);
        setState("ready");
      }
    } catch {
      if (mounted.current && generation.current === request) setState("failed");
    } finally {
      if (operation.current === controller) operation.current = null;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void load();
      else {
        invalidate();
        setRows([]);
        setState("loading");
      }
    });
    return () => {
      mounted.current = false;
      invalidate();
      subscription.remove();
    };
  }, [load, invalidate]);
  const copy = marketing.communityActivity;
  const text = { color: palette.textMuted, fontSize: 16, lineHeight: 25 };
  const link = { color: palette.link, paddingVertical: 12, minHeight: 44 };
  return (
    <View
      style={{ backgroundColor: palette.card, padding: 22, borderRadius: 18, gap: 12 }}
    >
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={{ color: palette.text, fontSize: 23, fontWeight: "800" }}
      >
        {copy.title}
      </Text>
      <Text style={text}>{copy.description}</Text>
      {rows.length > 0 && (
        <>
          <Text accessibilityRole="header" aria-level={3} style={text}>
            {copy.observationsTitle}
          </Text>
          {rows.map((row) => (
            <View key={`${row.href}:${row.publishedAt}:${row.title}`}>
              <Link href={row.href as never} style={link}>
                {row.title}
              </Link>
              <Text style={text}>
                Published{" "}
                {new Date(row.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC"
                })}
              </Text>
            </View>
          ))}
        </>
      )}
      {state === "loading" && <Text style={text}>Loading public observations…</Text>}
      {state === "ready" && !rows.length && (
        <Text style={text}>No public observations to show here yet.</Text>
      )}
      {state === "failed" && (
        <>
          <Text style={text}>Public observations are temporarily unavailable.</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={link}>
            <Text style={{ color: palette.link }}>Retry public observations</Text>
          </Pressable>
        </>
      )}
      {copy.links.map((item) => (
        <Link key={item.href} href={item.href as never} style={link}>
          {item.label}
        </Link>
      ))}
    </View>
  );
}
