import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ImageBackground
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";
import { colors, radius, spacing } from "../theme/theme";
import { login as apiLogin, signup as apiSignup } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login: contextLogin } = useAuth();
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (loading) return;

    console.log("handleAuth called, mode:", mode);

    // Validate input
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    if (mode === "signup" && !displayName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    setLoading(true);
    console.log("Starting auth request...");

    try {
      let user;

      if (mode === "login") {
        console.log("Calling login API...");
        user = await apiLogin(email.trim(), password.trim());
        console.log("Login successful, user:", user);
      } else {
        console.log("Calling signup API...");
        user = await apiSignup(email.trim(), password.trim(), displayName.trim());
        console.log("Signup successful, user:", user);
      }

      // Update context state (without waiting for AsyncStorage on web)
      const authToken = global.authToken;
      console.log("Auth token:", authToken);
      console.log("Calling contextLogin...");
      contextLogin(authToken, user); // Don't await - let it run async

      console.log("Navigating to MainTabs...");
      navigation.replace("MainTabs");
      console.log("Navigation called");
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
            onPress: () => setMode("login"),
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
      console.log("Loading set to false");
    }
  }

  return (
    <ScreenContainer>
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
            <Text style={styles.tagline}>Your cannabis cultivation companion</Text>
          </View>
        </View>
      </ImageBackground>

      <Text style={styles.title}>
        {mode === "login" ? "Welcome Back" : "Create Account"}
      </Text>

      {mode === "signup" && (
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
      />

      <PrimaryButton
        title={loading ? "" : mode === "login" ? "Login" : "Sign Up"}
        onPress={handleAuth}
        style={{ marginTop: spacing(4) }}
        disabled={loading}
      >
        {loading && <ActivityIndicator color="#fff" />}
      </PrimaryButton>

      <TouchableOpacity
        onPress={() => setMode(mode === "login" ? "signup" : "login")}
        style={{ marginTop: spacing(3) }}
      >
        <Text style={styles.link}>
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
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
  );
}

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
    boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.3)",
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
    marginBottom: spacing(1),
    textShadow: "0px 2px 8px rgba(0,0,0,0.5)"
  },
  tagline: {
    fontSize: 15,
    color: "#e5e7eb",
    fontStyle: "italic",
    fontWeight: "600",
    textShadow: "0px 1px 4px rgba(0,0,0,0.6)"
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
