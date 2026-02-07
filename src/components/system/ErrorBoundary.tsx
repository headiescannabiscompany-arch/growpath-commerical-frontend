import React from "react";
import { View, Text } from "react-native";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  { hasError: boolean; message?: string }
> {
  state = { hasError: false as boolean, message: undefined as string | undefined };

  static getDerivedStateFromError(err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Unknown error";
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown) {
    console.error("[ErrorBoundary]", this.props.label || "boundary", err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Screen crashed</Text>
          <Text style={{ marginTop: 8, opacity: 0.8 }}>{this.state.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
