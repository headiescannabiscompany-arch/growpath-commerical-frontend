import React from "react";
import { Text, ScrollView } from "react-native";

type Props = {
  name?: string;
  title?: string;
  children: React.ReactNode;
};

type State = { error?: Error };

export class ScreenBoundary extends React.PureComponent<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    // Deterministic, visible logging
    const label = this.props.name || this.props.title || "UnknownScreen";
    console.error(`[SCREEN_CRASH] ${label}`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
          Screen crashed: {this.props.name || this.props.title || "UnknownScreen"}
        </Text>
        <Text style={{ marginBottom: 12 }}>
          {String(this.state.error?.message || this.state.error)}
        </Text>
        <Text style={{ fontWeight: "700", marginBottom: 6 }}>Stack</Text>
        <Text selectable>{String(this.state.error?.stack || "(no stack)")}</Text>
      </ScrollView>
    );
  }
}
