import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ApiError } from "@/api/apiRequest";
import { confirmEmailVerification } from "@/api/auth";
import { radius } from "@/theme/theme";

type VerifyState = "checking" | "success" | "error";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => {
    const raw = params.token;
    return Array.isArray(raw) ? raw[0] || "" : raw || "";
  }, [params.token]);

  const [state, setState] = useState<VerifyState>("checking");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    let mounted = true;

    async function verify() {
      if (!token) {
        setState("error");
        setMessage("This verification link is missing a token.");
        return;
      }

      try {
        await confirmEmailVerification(token);
        if (!mounted) return;
        setState("success");
        setMessage("Your email is verified. You can sign in to GrowPath.");
      } catch (err: any) {
        if (!mounted) return;
        setState("error");
        if (err instanceof ApiError) {
          setMessage(err.message || "This verification link is invalid or expired.");
        } else {
          setMessage(err?.message || "This verification link is invalid or expired.");
        }
      }
    }

    void verify();

    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <Text style={styles.title}>Email verification</Text>
        {state === "checking" ? <ActivityIndicator color="#2563eb" /> : null}
        <Text style={styles.message}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to sign in"
          onPress={() => router.replace("/login")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Go to sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: 16
  },
  panel: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#dbe3ea",
    backgroundColor: "#ffffff",
    padding: 22,
    gap: 14
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800"
  },
  message: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 22
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: radius.card,
    backgroundColor: "#2563eb",
    paddingHorizontal: 16
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  }
});
