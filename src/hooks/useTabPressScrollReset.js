import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";

export default function useTabPressScrollReset(resetFn) {
  const navigation = useNavigation();

  useEffect(() => {
    if (typeof resetFn !== "function") return;
    const unsubscribe = navigation.addListener("tabPress", () => {
      requestAnimationFrame(() => {
        resetFn();
      });
    });
    return unsubscribe;
  }, [navigation, resetFn]);
}
