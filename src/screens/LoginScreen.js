import React, { useState, useEffect } from "react";
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
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext.js";
import { colors, radius, spacing } from "../theme/theme";
import { login as apiLogin, signup as apiSignup } from "../api/auth";

function LoginScreen({ navigation }) {
  const {
    login: contextLogin,
    token,
    user,
    mode: globalMode,
    setMode: setGlobalMode
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
      // Redirect based on selectedMode
      if (selectedMode === "facility") {
        navigation.replace("FacilityStack");
      } else if (selectedMode === "commercial") {
        navigation.replace("CommercialStack");
      } else {
        navigation.replace("MainTabs");
      }
    }
    AsyncStorage.getItem("HAS_LOGGED_IN_BEFORE").then((val) => {
      setHasLoggedInBefore(val === "true");
    });
  }, [token, user, navigation, selectedMode]);

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
      let authResult;

      if (authMode === "login") {
        authResult = await apiLogin(email.trim(), password.trim());
      } else {
        // Get business type from AsyncStorage
        const businessType = await AsyncStorage.getItem("businessType");
        authResult = await apiSignup(
          email.trim(),
          password.trim(),
          displayName.trim(),
          businessType || "cultivator"
        );
      }

      const { user, token } = authResult || {};

      if (!token || !user) {
        throw new Error("Login response missing credentials");
      }

      // Set selected mode in global context
      await setGlobalMode(selectedMode);

      // Update context state (without waiting for AsyncStorage on web)
      const authToken = token;
      await AsyncStorage.setItem("HAS_LOGGED_IN_BEFORE", "true");
      contextLogin(authToken, user); // Don't await - let it run async

      // Navigation will be handled by useEffect
    } catch (err) {
      console.error("Auth error:", err);

      // Better error messages
      let title = "Error";
      let message = err.message || "Authentication failed. Please check your connection.";

      if (err.message === "User already exists") {
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
      } else if (err.message === "Invalid credentials") {
        title = "Login Failed";
        message = "Invalid email or password. Please try again.";
        Alert.alert(title, message);
      } else {
        Alert.alert(title, message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer testID="login-form">
      <ImageBackground
        source={require("../../assets/ChatGPT Image Dec 12, 2025, 02_01_36 PM.png")}
        style={styles.headerBackground}
        imageStyle={styles.headerImageStyle}
      >
        <View style={styles.overlay}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>GrowPath AI</Text>
            <Text style={styles.tagline}>Your grow companion for every plant</Text>
          </View>
        </View>
      </ImageBackground>

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
          {authMode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </Text>
      </TouchableOpacity>
      {/* Privacy Policy link for onboarding */}
      <View style={{ alignItems: "center", marginTop: 30, marginBottom: 10 }}>
        <TouchableOpacity onPress={() => navigation.navigate("PrivacyPolicy")}>
          ...
          <Text
            style={{ color: "#3498db", fontSize: 15, textDecorationLine: "underline" }}
          >
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

export default LoginScreen;

const styles = StyleSheet.create({
  headerBackground: {
    width: "100%",
    height: 280,
    marginBottom: spacing(6)
  },
  headerImageStyle: {
    opacity: 0.9
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  },
  logoContainer: {
    alignItems: "center",
    paddingVertical: spacing(6)
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(16, 185, 129, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing(3),
    elevation: 8,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.9)"
  },
  logoImage: {
    width: 70,
    height: 70
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: spacing(1)
  },
  tagline: {
    fontSize: 15,
    color: "#e5e7eb",
    fontStyle: "italic",
    fontWeight: "600"
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: spacing(6),
    color: colors.text,
    textAlign: "center"
  },
  input: {
    padding: spacing(4),
    borderRadius: radius.card,
    backgroundColor: "#fff",
    marginBottom: spacing(4),
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16
  },
  link: {
    color: colors.accent,
    fontWeight: "600",
    textAlign: "center",
    fontSize: 15
  }
});
