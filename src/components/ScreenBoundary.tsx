import React from "react";
import { Text, ScrollView, View } from "react-native";
import BackButton from "@/components/nav/BackButton";
import { captureException } from "@/utils/monitoring";
import { useAppTheme } from "@/theme/appTheme";

type Props = {
  name?: string;
  title?: string;
  showBack?: boolean;
  backFallbackHref?: string;
  preferBackFallback?: boolean;
  children: React.ReactNode;
};

type State = { error?: Error };

type BoundaryProps = Props & {
  palette: ReturnType<typeof useAppTheme>["palette"];
};

class ScreenBoundaryBase extends React.PureComponent<BoundaryProps, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    const label = this.props.name || this.props.title || "UnknownScreen";
    console.error(`[SCREEN_CRASH] ${label}`, error, info);
    captureException(error, { screen: label, componentStack: info?.componentStack });
  }

  render() {
    const showBack = this.props.showBack ?? true;
    const fallbackHref = this.props.backFallbackHref || "/account/workspace";
    const { palette } = this.props;

    if (!this.state.error) {
      if (!showBack) {
        return (
          <View style={{ flex: 1, backgroundColor: palette.page }}>
            {this.props.children}
          </View>
        );
      }
      return (
        <View style={{ flex: 1, backgroundColor: palette.page }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <BackButton
              fallbackHref={fallbackHref}
              preferFallback={this.props.preferBackFallback}
            />
          </View>
          {this.props.children}
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: palette.page }}>
        {showBack ? (
          <BackButton
            fallbackHref={fallbackHref}
            preferFallback={this.props.preferBackFallback}
          />
        ) : null}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 8,
            color: palette.text
          }}
        >
          Screen crashed: {this.props.name || this.props.title || "UnknownScreen"}
        </Text>
        <Text style={{ marginBottom: 12, color: palette.textMuted }}>
          {String(this.state.error?.message || this.state.error)}
        </Text>
        <Text style={{ fontWeight: "700", marginBottom: 6, color: palette.text }}>
          Stack
        </Text>
        <Text selectable style={{ color: palette.textMuted }}>
          {String(this.state.error?.stack || "(no stack)")}
        </Text>
      </ScrollView>
    );
  }
}

export function ScreenBoundary(props: Props) {
  const { palette } = useAppTheme();
  return <ScreenBoundaryBase {...props} palette={palette} />;
}
