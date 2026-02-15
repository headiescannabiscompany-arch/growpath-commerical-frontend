import { useFacility } from "../facility/FacilityProvider";
import { useInvites } from "../hooks/useInvites";
import { useRooms } from "../features/rooms/hooks";
import { useGrows } from "../features/grows/hooks";

export function useOnboarding() {
  const facilityContext = useFacility();
  const invites = useInvites();
  const rooms = useRooms();
  const grows = useGrows();

  // 1️⃣ Add loading gate
  if (invites.isLoading || rooms.isLoading || grows.isLoading) {
    console.log(`[ONBOARDING] loading queries...`);
    return "loading";
  }

  // Get facilities from context (not a query)
  const facilities = facilityContext?.facilities || [];

  // 2️⃣ Enforce priority: Invite overrides all
  const inviteCount = invites.data ? invites.data.length : 0;
  if (inviteCount > 0) {
    console.log(
      `[ONBOARDING] facilities=${facilities.length} rooms=${rooms.data?.length || 0} grows=${grows.data?.length || 0} invites=${inviteCount} → join-facility`
    );
    return "join-facility";
  }

  // 3️⃣ Enforce single-facility shortcut
  if (facilities.length === 0) {
    console.log(`[ONBOARDING] facilities=0 → create-facility`);
    return "create-facility";
  }
  if (facilities.length > 1) {
    console.log(`[ONBOARDING] facilities=${facilities.length} → pick-facility`);
    return "pick-facility";
  }
  if (facilities.length === 1) {
    // Optionally set facilityId here if needed
    if (rooms.data?.length === 0) {
      console.log(`[ONBOARDING] facilities=1 rooms=0 → first-setup`);
      return "first-setup";
    }
    if (grows.data?.length === 0) {
      console.log(`[ONBOARDING] facilities=1 rooms>0 grows=0 → start-grow`);
      return "start-grow";
    }
    console.log(`[ONBOARDING] facilities=1 rooms>0 grows>0 → dashboard`);
    return "dashboard";
  }

  // Fallback
  console.log(`[ONBOARDING] fallback → loading (facilities=${facilities.length})`);
  return "loading";
}
