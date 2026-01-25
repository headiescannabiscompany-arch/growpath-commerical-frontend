import React from "react";
import { View, Text, Pressable } from "react-native";

export function LockedScreen({
  title = "Access restricted",
  message = "You don’t have access to this area with your current plan or role.",
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
      {!!onAction && (
        <Pressable
          onPress={onAction}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            alignSelf: "flex-start"
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
