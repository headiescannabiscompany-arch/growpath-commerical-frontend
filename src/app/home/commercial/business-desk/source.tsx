import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import BusinessAskCitationSource from "@/features/businessDesk/BusinessAskCitationSource";

export default function CommercialBusinessAskSourceRoute() {
  return (
    <BusinessAskCitationSource
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
    />
  );
}
