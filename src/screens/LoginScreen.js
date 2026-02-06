import React, { useState, useEffect } from "react";
// DEBUG_LAYOUT: toggle yellow background for debug
const DEBUG_LAYOUT = __DEV__ && false;
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ImageBackground,
  StyleSheet
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenContainer from "../components/ScreenContainer.js";
import PrimaryButton from "../components/PrimaryButton.js";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "expo-router";
import { colors, radius, spacing } from "../theme/theme.js";

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

      // Extract error message - handles Error objects and plain objects
      const errorMessage =
        err?.message || "Authentication failed. Please check your connection.";
      const errorCode = err?.code;

      let title = "Error";
      let message = errorMessage;

      // Handle 401 / INVALID_CREDENTIALS - show friendly message
      if (
        errorCode === "INVALID_CREDENTIALS" ||
        errorMessage.includes("Incorrect email or password")
      ) {
        title = "Login Failed";
        message = "Incorrect email or password. Please try again.";
        Alert.alert(title, message);
      } else if (errorCode === "VALIDATION_ERROR") {
        title = "Invalid Input";
        Alert.alert(title, message);
      } else if (
        errorMessage === "User already exists" ||
        errorMessage.includes("already registered")
      ) {
        title = "Account Already Exists";
        message = "This email is already registered. Would you like to login instead?";

        Alert.alert(title, message, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Switch to Login",
            onPress: () => setAuthMode("login"),
            style: "default"
          }
        ]);
      } else if (errorCode === "NETWORK_ERROR") {
        title = "Connection Error";
        message = "Unable to reach the server. Please check your internet connection.";
        Alert.alert(title, message);
      } else {
        // Fallback for unknown errors
        Alert.alert(title, message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {__DEV__ && DEBUG_LAYOUT ? (
        <Text
          style={{
            color: "black",
            fontSize: 24,
            fontWeight: "bold",
            backgroundColor: "yellow",
            padding: 8,
            textAlign: "center"
          }}
        >
          {null}
        </Text>
      ) : (
        <Text
          style={{
            color: "black",
            fontSize: 24,
            fontWeight: "bold",
            padding: 8,
            textAlign: "center"
          }}
        >
          {null}
        </Text>
      )}
      <ScreenContainer testID="login-form" scroll={true}>
        {/* Banner Image */}
        <ImageBackground
          // @ts-ignore
          source={require("../../assets/banner.png")}
          style={styles.headerBackground}
          imageStyle={styles.headerImageStyle}
          resizeMode="contain"
        />

        {/* Logo and Text Below Banner */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            {/* @ts-ignore: Metro/JS false positive for PNG import */}
            <Image
              // @ts-ignore
              source={require("../../assets/icon-white.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>GrowPath AI</Text>
          <Text style={styles.tagline}>Your grow companion for every plant</Text>
        </View>

        {/* Mode Selector */}
        <View
          style={{ flexDirection: "row", justifyContent: "center", marginVertical: 16 }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: selectedMode === "personal" ? "#0ea5e9" : "#e5e7eb",
              paddingVertical: 8,
              paddingHorizontal: 18,
              borderRadius: 8,
              marginHorizontal: 4
            }}
            onPress={() => setSelectedMode("personal")}
          >
            <Text style={{ color: selectedMode === "personal" ? "white" : "#222" }}>
              Single User
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: selectedMode === "facility" ? "#0ea5e9" : "#e5e7eb",
              paddingVertical: 8,
              paddingHorizontal: 18,
              borderRadius: 8,
              marginHorizontal: 4
            }}
            onPress={() => setSelectedMode("facility")}
          >
            <Text style={{ color: selectedMode === "facility" ? "white" : "#222" }}>
              Facility
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: selectedMode === "commercial" ? "#0ea5e9" : "#e5e7eb",
              paddingVertical: 8,
              paddingHorizontal: 18,
              borderRadius: 8,
              marginHorizontal: 4
            }}
            onPress={() => setSelectedMode("commercial")}
          >
            <Text style={{ color: selectedMode === "commercial" ? "white" : "#222" }}>
              Commercial
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          {authMode === "login"
            ? hasLoggedInBefore
              ? "Welcome Back"
              : " "
            : "Create Account"}
        </Text>

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
          <TouchableOpacity onPress={() => navigation.navigate("PrivacyPolicy")}>
            <Text
              style={{ color: "#3498db", fontSize: 15, textDecorationLine: "underline" }}
            >
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    </>
  );
}

export default LoginScreen;

const styles = StyleSheet.create({
  headerBackground: {
    width: "100%",
    height: 420,
    marginBottom: spacing(6)
  },
  headerImageStyle: {
    opacity: 1
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 1
  },
  logoContainer: {
    alignItems: "center",
    paddingVertical: spacing(8)
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing(4)
  },
  logoImage: {
    width: 160,
    height: 160
  },
  appName: {
    fontSize: 48,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: spacing(2)
  },
  tagline: {
    fontSize: 18,
    color: "#e5e7eb",
    fontStyle: "italic",
    fontWeight: "600"
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: spacing(8),
    color: colors.text,
    textAlign: "center"
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
