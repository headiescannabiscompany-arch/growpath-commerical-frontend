import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import VendorCompareTool from "@/features/businessDesk/VendorCompareTool";

export default function CommercialVendorCompareRoute() {
  return (
    <VendorCompareTool
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
    />
  );
}
