import React from "react";
import { Text, ScrollView, View } from "react-native";
import FacilityWorkflowNav from "@/components/facility/FacilityWorkflowNav";
import BackButton from "@/components/nav/BackButton";
import { captureException } from "@/utils/monitoring";

type Props = {
  name?: string;
  title?: string;
  showBack?: boolean;
  backFallbackHref?: string;
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
    captureException(error, { screen: label, componentStack: info?.componentStack });
  }

  render() {
    const showBack = Boolean(this.props.showBack);
    const fallbackHref = this.props.backFallbackHref || "/home";

    if (!this.state.error) {
      if (!showBack) {
        return (
          <View style={{ flex: 1 }}>
            <FacilityWorkflowNav />
            {this.props.children}
          </View>
        );
      }
      return (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <BackButton fallbackHref={fallbackHref} />
          </View>
          <FacilityWorkflowNav />
          {this.props.children}
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {showBack ? <BackButton fallbackHref={fallbackHref} /> : null}
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
