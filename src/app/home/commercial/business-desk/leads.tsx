import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import LeadFollowUpTool from "@/features/businessDesk/LeadFollowUpTool";

export default function CommercialLeadFollowUpRoute() {
  return (
    <LeadFollowUpTool
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
    />
  );
}
