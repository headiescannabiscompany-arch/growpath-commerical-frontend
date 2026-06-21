import React from "react";
import { Pressable, Text, View } from "react-native";

export function LockedScreen({
  title = "Access restricted",
  message = "Your account does not have access to this area.",
  onAction,
  actionLabel = "Go back"
}: {
  title?: string;
  message?: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>{title}</Text>
      <Text style={{ fontSize: 16, opacity: 0.8, marginBottom: 18 }}>{message}</Text>
      {onAction ? (
        <Pressable
          onPress={onAction}
          style={{
            alignSelf: "flex-start",
            borderRadius: 8,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingVertical: 12
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
