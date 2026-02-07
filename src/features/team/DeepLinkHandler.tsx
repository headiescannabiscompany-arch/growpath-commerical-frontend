import { useEffect } from "react";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";

export default function DeepLinkHandler() {
  const navigation = useNavigation();
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const { path, queryParams } = Linking.parse(url);
      if (path?.startsWith("invite/")) {
        const token = path.split("/")[1];
        (navigation as any).navigate("AcceptInvite", { token });
      }
    };
    // Phase 2.3.3: React Native modern API - addEventListener returns subscription
    const subscription = Linking.addEventListener("url", handleUrl);
    return () => subscription.remove();
  }, [navigation]);
  return null;
}
