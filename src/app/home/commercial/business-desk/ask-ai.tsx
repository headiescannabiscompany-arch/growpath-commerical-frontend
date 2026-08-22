import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import BusinessAskTool from "@/features/businessDesk/BusinessAskTool";

export default function CommercialBusinessAskRoute() {
  return (
    <BusinessAskTool
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
    />
  );
}
