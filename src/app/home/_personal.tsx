import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

/**
 * Personal home redirect.
 *
 * This route exists to forward legacy personal entry points into tabs.
 */
export default function PersonalHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home/personal" as any);
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
