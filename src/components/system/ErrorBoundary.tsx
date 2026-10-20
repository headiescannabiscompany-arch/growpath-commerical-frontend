import React from "react";
import { View, Text } from "react-native";
import { captureException } from "@/utils/monitoring";
import {
  suppressCourseGiftDiagnostic,
  PRIVATE_PAGE_ERROR
} from "@/utils/courseGiftDiagnosticPrivacy";
import { useAppTheme } from "@/theme/appTheme";

type BoundaryProps = { children: React.ReactNode; label?: string } & {
  palette: ReturnType<typeof useAppTheme>["palette"];
};

class ErrorBoundaryBase extends React.Component<
  BoundaryProps,
  { hasError: boolean; message?: string }
> {
  state = { hasError: false as boolean, message: undefined as string | undefined };

  static getDerivedStateFromError(err: unknown) {
    const message = suppressCourseGiftDiagnostic(err)
      ? PRIVATE_PAGE_ERROR
      : err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Unknown error";
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown) {
    if (suppressCourseGiftDiagnostic(err, this.props.label)) return;
    console.error("[ErrorBoundary]", this.props.label || "boundary", err);
    captureException(err, { boundary: this.props.label || "boundary" });
  }

  render() {
    const { palette } = this.props;

    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 16, backgroundColor: palette.page }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: palette.text }}>
            Screen crashed
          </Text>
          <Text style={{ marginTop: 8, color: palette.textMuted }}>
            {suppressCourseGiftDiagnostic(this.state.message, this.props.label)
              ? PRIVATE_PAGE_ERROR
              : this.state.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary(props: { children: React.ReactNode; label?: string }) {
  const { palette } = useAppTheme();
  return <ErrorBoundaryBase {...props} palette={palette} />;
}
