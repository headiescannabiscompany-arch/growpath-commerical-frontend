import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing } from "../theme/theme.js";

/**
 * ErrorBoundary Component
 * Catches errors from child components and displays error UI
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <MaterialCommunityIcons name="alert-circle" size={56} color="#EF4444" />
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={this.handleReset}>
            <MaterialCommunityIcons name="refresh" size={18} color="#FFF" />
            <Text style={styles.resetText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background
  },
  title: {
    fontSize: Typography.size.h3,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: Spacing.lg,
    textAlign: "center"
  },
  message: {
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: "center",
    marginBottom: Spacing.lg
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    marginTop: Spacing.lg
  },
  resetText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: Typography.size.body,
    marginLeft: Spacing.sm
  }
});

export default ErrorBoundary;
