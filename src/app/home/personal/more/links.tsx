import { ScreenBoundary } from "@/components/ScreenBoundary";
import PersonalCreatorProfileScreen from "@/screens/PersonalCreatorProfileScreen";

export default function PersonalLinksRoute() {
  return (
    <ScreenBoundary title="Creator profile & links" showBack={false}>
      <PersonalCreatorProfileScreen />
    </ScreenBoundary>
  );
}
