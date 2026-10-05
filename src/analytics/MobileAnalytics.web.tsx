import React from "react";
// Keep the existing, separately verified public website integration unchanged.
export function MobileAnalyticsBoundary({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function MobileAnalyticsChoice() {
  return null;
}
