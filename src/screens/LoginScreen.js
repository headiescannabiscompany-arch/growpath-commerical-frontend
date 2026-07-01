import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenContainer from "../components/ScreenContainer.js";
import PrimaryButton from "../components/PrimaryButton.js";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "expo-router";
import { config } from "../config/config";
import { colors, radius, spacing } from "../theme/theme.js";
// DEBUG_LAYOUT: toggle yellow background for debug
const DEBUG_LAYOUT = __DEV__ && false;

function LoginScreen() {
  const router = useRouter();
  const {
    login: contextLogin,
    signup: contextSignup,
    token,
    user,
    mode: globalMode
  } = useAuth();
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [selectedMode, setSelectedMode] = useState(globalMode || "personal"); // "personal", "facility", "commercial"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(false);

  useEffect(() => {
    if (token && user) {
      // Always set mode to 'personal' for new users unless already set
      if (!selectedMode || selectedMode === "personal") {
        router.replace("/");
      } else if (selectedMode === "facility") {
        router.replace("/");
      } else if (selectedMode === "commercial") {
        router.replace("/");
      } else {
        // fallback: set to personal
        router.replace("/");
      }
    }
    // @ts-ignore
    AsyncStorage.getItem("HAS_LOGGED_IN_BEFORE").then((val) => {
      setHasLoggedInBefore(val === "true");
    });
  }, [token, user, selectedMode, router]);

  async function handleAuth() {
    if (loading) return;

    // Validate input
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    if (authMode === "signup" && !displayName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    setLoading(true);
    try {
      if (authMode === "login") {
        // Call context login, which wraps API errors properly
        await contextLogin(email.trim(), password.trim());
      } else {
        // Get business type from AsyncStorage
        // @ts-ignore
        const businessType = await AsyncStorage.getItem("businessType");
        // Create signup body and call context signup
        await contextSignup({
          email: email.trim(),
          password: password.trim(),
          displayName: displayName.trim(),
          businessType: businessType || "cultivator"
        });
      }

      // Navigation will be handled by useEffect after state updates
      // @ts-ignore
      await AsyncStorage.setItem("HAS_LOGGED_IN_BEFORE", "true");
    } catch (err) {
      console.error("Auth error:", err);

      const errorCode = err?.code;
      const errorMessage =
        err?.message || "Authentication failed. Please check your connection.";

      if (err?.status === 401 || errorCode === "INVALID_CREDENTIALS") {
        Alert.alert("Login Failed", "Incorrect email or password. Please try again.");
      } else if (errorCode === "VALIDATION_ERROR") {
        Alert.alert("Invalid Input", errorMessage);
      } else if (
        errorMessage === "User already exists" ||
        String(errorMessage).toLowerCase().includes("already")
      ) {
        Alert.alert(
          "Account Already Exists",
          "This email is already registered. Would you like to login instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Switch to Login", onPress: () => setAuthMode("login") }
          ]
        );
      } else if (errorCode === "NETWORK_ERROR") {
        Alert.alert("Connection Error", "Unable to reach the server. Please try again.");
      } else if (errorCode === "UNAUTHORIZED" || errorCode === "UNAUTHENTICATED") {
        Alert.alert("Session Expired", "Please login again.");
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer
      testID="login-form"
      scroll={true}
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Image
        // @ts-ignore
        source={require("../../assets/banner.png")}
        style={styles.heroImage}
        resizeMode="contain"
      />

      <View style={styles.authShell}>
        <View style={styles.logoContainer}>
          <Text style={styles.appName}>GrowPath</Text>
          <Text style={styles.tagline}>Your grow companion for every plant</Text>
        </View>

        <Text style={styles.title}>
          {authMode === "login"
            ? hasLoggedInBefore
              ? "Welcome Back"
              : "Log in"
            : "Create Account"}
        </Text>

        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              selectedMode === "personal" && styles.modeButtonSelected
            ]}
            onPress={() => setSelectedMode("personal")}
          >
            <Text
              style={[
                styles.modeText,
                selectedMode === "personal" && styles.modeTextSelected
              ]}
            >
              Single User
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              selectedMode === "facility" && styles.modeButtonSelected
            ]}
            onPress={() => setSelectedMode("facility")}
          >
            <Text
              style={[
                styles.modeText,
                selectedMode === "facility" && styles.modeTextSelected
              ]}
            >
              Facility
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              selectedMode === "commercial" && styles.modeButtonSelected
            ]}
            onPress={() => setSelectedMode("commercial")}
          >
            <Text
              style={[
                styles.modeText,
                selectedMode === "commercial" && styles.modeTextSelected
              ]}
            >
              Commercial
            </Text>
          </TouchableOpacity>
        </View>

        {authMode === "signup" && (
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display Name"
            placeholderTextColor={colors.textSoft}
            style={styles.input}
          />
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textSoft}
          style={styles.input}
          autoCapitalize="none"
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textSoft}
          secureTextEntry
          style={styles.input}
          returnKeyType="go"
          onSubmitEditing={handleAuth}
        />

        <PrimaryButton
          title={loading ? "" : authMode === "login" ? "Login" : "Sign Up"}
          onPress={handleAuth}
          style={{ marginTop: spacing(4) }}
          disabled={loading}
        >
          {loading && <ActivityIndicator color="#fff" />}
        </PrimaryButton>

        <TouchableOpacity
          onPress={() => setAuthMode(authMode === "login" ? "signup" : "login")}
          style={{ marginTop: spacing(3) }}
        >
          <Text style={styles.link}>
            {authMode === "login"
              ? "Need an account? Sign up"
              : "Have an account? Log in"}
          </Text>
        </TouchableOpacity>
        {/* Privacy Policy link for onboarding */}
        <View style={{ alignItems: "center", marginTop: 30, marginBottom: 10 }}>
          <TouchableOpacity
            onPress={() => Linking.openURL(config.privacyUrl)}
          >
            <Text
              style={{ color: "#3498db", fontSize: 15, textDecorationLine: "underline" }}
            >
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

export default LoginScreen;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 0,
    paddingTop: 0
  },
  content: {
    alignItems: "center",
    paddingBottom: 40
  },
  heroImage: {
    width: "100%",
    maxWidth: 520,
    aspectRatio: 1,
    marginTop: spacing(3)
  },
  authShell: {
    width: "100%",
    maxWidth: 460,
    paddingHorizontal: 20
  },
  logoContainer: {
    alignItems: "center",
    paddingTop: spacing(2),
    paddingBottom: spacing(5)
  },
  appName: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing(2)
  },
  tagline: {
    fontSize: 16,
    color: colors.textSoft,
    fontStyle: "italic",
    fontWeight: "600"
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(4),
    color: colors.text,
    textAlign: "center"
  },
  modeSelector: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing(5)
  },
  modeButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginHorizontal: 4
  },
  modeButtonSelected: {
    backgroundColor: "#166534"
  },
  modeText: {
    color: "#222",
    fontWeight: "700"
  },
  modeTextSelected: {
    color: "white"
  },
  input: {
    padding: spacing(5),
    borderRadius: radius.card,
    backgroundColor: "#fff",
    marginBottom: spacing(5),
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 18
  },
  link: {
    color: colors.accent,
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16
  }
});
