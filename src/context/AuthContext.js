import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSubscriptionStatus } from "../api/subscribe";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    try {
      // Add timeout for storage access
      const storageTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Storage timeout")), 1000)
      );

      const storedToken = await Promise.race([
        AsyncStorage.getItem("token"),
        storageTimeout
      ]);
      const storedUser = await Promise.race([
        AsyncStorage.getItem("user"),
        storageTimeout
      ]);

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        // Load PRO status with timeout
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        );

        try {
          await Promise.race([loadProStatus(storedToken), timeout]);
        } catch (err) {
          // Continue without PRO status - user can still use app
        }
      }
    } catch (error) {
      // Failed to load auth - user will need to login
      console.log("Auth load failed:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProStatus = async (authToken) => {
    try {
      const result = await getSubscriptionStatus(authToken || token);
      if (result.success) {
        setIsPro(result.isPro);
      }
    } catch (error) {
      // Default to free tier if API is unreachable
      setIsPro(false);
    }
  };

  const login = async (authToken, userData) => {
    // Update state immediately
    setToken(authToken);
    setUser(userData);
    
    // Save to storage async (don't block on web)
    AsyncStorage.setItem("token", authToken).catch(() => {});
    AsyncStorage.setItem("user", JSON.stringify(userData)).catch(() => {});
    
    // Load pro status in background
    loadProStatus(authToken).catch(() => {});
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setIsPro(false);
    } catch (error) {
      // Failed to logout
    }
  };

  const refreshProStatus = () => {
    loadProStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isPro,
        loading,
        login,
        logout,
        refreshProStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
