import React from "react";

import PdfExportScreen from "@/app/home/personal/(tabs)/tools/pdf-export";

export default function CommercialReportToolRoute() {
  return <PdfExportScreen backFallbackHref="/home/commercial/tools" />;
}
