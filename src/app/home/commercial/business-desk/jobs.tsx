import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import JobNotesTool from "@/features/businessDesk/JobNotesTool";

export default function CommercialJobNotesRoute() {
  return (
    <JobNotesTool
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
    />
  );
}
