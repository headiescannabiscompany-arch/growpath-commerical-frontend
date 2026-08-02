import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ApiError } from "@/api/apiRequest";
import { confirmEmailVerification } from "@/api/auth";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { claimLoginPath, parseClaimReturnPath } from "@/utils/claimReturnPath";

type VerifyState = "checking" | "success" | "error";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = createVerifyEmailStyles(palette);
  const params = useLocalSearchParams<{
    token?: string | string[];
    next?: string | string[];
  }>();
  const claimNext = parseClaimReturnPath(params.next);
  const token = useMemo(() => {
    const raw = params.token;
    return Array.isArray(raw) ? raw[0] || "" : raw || "";
  }, [params.token]);

  const [state, setState] = useState<VerifyState>("checking");
  const [message, setMessage] = useState("Verifying your email address...");
  const [accountEmail, setAccountEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    async function verify() {
      if (!token) {
        setState("error");
        setMessage("This verification link is missing a token.");
        return;
      }

      try {
        const response = await confirmEmailVerification(token);
        if (!mounted) return;
        setAccountEmail(String(response.user?.email || ""));
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
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Email verification
        </Text>
        {state === "checking" ? <ActivityIndicator color={palette.info} /> : null}
        <Text style={styles.message}>{message}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to sign in"
          onPress={() => router.replace(claimLoginPath(accountEmail, claimNext) as any)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Go to sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const createVerifyEmailStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.page,
      padding: 16
    },
    panel: {
      width: "100%",
      maxWidth: 420,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      padding: 22,
      gap: 14
    },
    title: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "800"
    },
    message: {
      color: palette.textSoft,
      fontSize: 15,
      lineHeight: 22
    },
    button: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      borderRadius: radius.card,
      backgroundColor: palette.info,
      paddingHorizontal: 16
    },
    buttonText: {
      color: palette.accentText,
      fontSize: 15,
      fontWeight: "700"
    }
  });
