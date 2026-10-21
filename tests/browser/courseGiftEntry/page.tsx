import React from "react";
// Excludes unrelated advertising/back-button infrastructure, not the course route.
export default function Page({ header, children }: any) {
  return (
    <section>
      {header}
      {children}
    </section>
  );
}
