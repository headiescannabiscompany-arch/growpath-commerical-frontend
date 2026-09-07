import { ScreenBoundary } from "@/components/ScreenBoundary";
import LinksScreen from "@/screens/LinksScreen";

export default function PersonalLinksRoute() {
  return (
    <ScreenBoundary
      title="Public Links"
      showBack
      backFallbackHref="/home/personal/profile"
    >
      <LinksScreen />
    </ScreenBoundary>
  );
}
