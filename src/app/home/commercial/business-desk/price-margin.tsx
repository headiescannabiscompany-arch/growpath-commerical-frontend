import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import PriceMarginTool from "@/features/businessDesk/PriceMarginTool";

export default function CommercialPriceMarginRoute() {
  return (
    <PriceMarginTool
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
    />
  );
}
