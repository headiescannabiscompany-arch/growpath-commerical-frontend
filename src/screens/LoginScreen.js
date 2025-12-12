import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image
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
      Alert.alert("Error", err.message || "Authentication failed. Please check your connection.");
    } finally {
      setLoading(false);
      console.log("Loading set to false");
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🌱</Text>
        </View>
        <Text style={styles.appName}>GrowPath AI</Text>
        <Text style={styles.tagline}>Your cannabis cultivation companion</Text>
      </View>

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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    marginTop: spacing(8),
    marginBottom: spacing(8)
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing(3),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  logoEmoji: {
    fontSize: 50
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.accent,
    marginBottom: spacing(1)
  },
  tagline: {
    fontSize: 14,
    color: colors.textSoft,
    fontStyle: "italic"
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
