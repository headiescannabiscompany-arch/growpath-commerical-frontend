import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import QuoteEstimateTool from "@/features/businessDesk/QuoteEstimateTool";

export default function CommercialQuoteEstimateRoute() {
  return (
    <QuoteEstimateTool
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
    />
  );
}
