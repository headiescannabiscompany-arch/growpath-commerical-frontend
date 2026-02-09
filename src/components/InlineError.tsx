import React from "react";
import { View, Text } from "react-native";

type Props = {
  title?: string;
  message: string;
  requestId?: string | null;
};

export function InlineError({ title, message, requestId }: Props) {
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#ddd",
        backgroundColor: "#fff",
        marginBottom: 12
      }}
      accessibilityRole="alert"
    >
      {title ? <Text style={{ fontWeight: "700", marginBottom: 4 }}>{title}</Text> : null}

      <Text style={{ lineHeight: 20 }}>{message}</Text>

      {requestId ? (
        <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>Ref: {requestId}</Text>
      ) : null}
    </View>
  );
}
