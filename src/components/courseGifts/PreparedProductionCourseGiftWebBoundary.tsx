import React from "react";
import { createProductionCourseGiftWebContextInternal } from "@/utils/courseGiftStagingWebContext";
import { PreparedCourseGiftWebBoundaryInternal } from "./PreparedStagingCourseGiftWebBoundary";

function prepare() {
  try {
    return createProductionCourseGiftWebContextInternal();
  } catch {
    return null;
  }
}

/** Local candidate only. The normal production root remains the inert boundary.
 * Future reviewed source selection is distinct from provider/payment permission. */
export function PreparedProductionCourseGiftWebBoundary({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <PreparedCourseGiftWebBoundaryInternal prepareContext={prepare}>
      {children}
    </PreparedCourseGiftWebBoundaryInternal>
  );
}
