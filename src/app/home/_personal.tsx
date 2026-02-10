import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

/**
 * Personal Home Redirect
 *
 * This route exists to forward /home/personal → /home/personal/(tabs)
 * so the tab layout always renders.
 */
export default function PersonalHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home/personal/(tabs)" as any);
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff"
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}
