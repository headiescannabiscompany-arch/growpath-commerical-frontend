import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, radius } from "../theme/theme.js";
import { captureException } from "../utils/monitoring";
import { useAppTheme } from "@/theme/appTheme";

/**
 * ErrorBoundary Component
 * Catches errors from child components and displays error UI
 */

class ErrorBoundaryBase extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error("ErrorBoundary caught:", error, errorInfo);
    captureException(error, {
      boundary: "legacy",
      componentStack: errorInfo?.componentStack
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    const { palette } = this.props;

    if (this.state.hasError) {
      return (
        <View
          style={[
            styles.container,
            { backgroundColor: palette.page, borderColor: palette.border }
          ]}
        >
          <MaterialCommunityIcons name="alert-circle" size={56} color={palette.danger} />
          <Text style={[styles.title, { color: palette.text }]}>
            Oops! Something went wrong
          </Text>
          <Text style={[styles.message, { color: palette.textMuted }]}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: palette.accent }]}
            onPress={this.handleReset}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={palette.accentText} />
            <Text style={[styles.resetText, { color: palette.accentText }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary(props) {
  const { palette } = useAppTheme();
  return <ErrorBoundaryBase {...props} palette={palette} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg
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
    borderRadius: radius.card,
    marginTop: Spacing.lg
  },
  resetText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: Typography.size.body,
    marginLeft: Spacing.sm
  }
});
