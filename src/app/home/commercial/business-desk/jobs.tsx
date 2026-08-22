import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import { useAuth } from "@/auth/AuthContext";
import JobNotesTool from "@/features/businessDesk/JobNotesTool";

export default function CommercialJobNotesRoute() {
  const { user } = useAuth();
  const userId = String(user?.id || "").trim();
  return (
    <JobNotesTool
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
      canConfigureTimeZone
      currentUser={
        userId
          ? {
              userId,
              label: String(
                user?.displayName || user?.email || "Commercial workspace owner"
              )
            }
          : null
      }
    />
  );
}
