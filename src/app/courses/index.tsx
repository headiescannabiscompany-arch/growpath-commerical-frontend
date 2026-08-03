import React, { useCallback, useState } from "react";

import { useAuth } from "@/auth/AuthContext";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import CoursesScreen from "@/screens/CoursesScreen";

export default function Courses() {
  const auth = useAuth();
  const [detailVisible, setDetailVisible] = useState(false);
  const handleDetailVisibilityChange = useCallback((visible: boolean) => {
    setDetailVisible(visible);
  }, []);
  const backFallbackHref = auth?.isAuthed || auth?.user ? "/account/workspace" : "/";

  return (
    <ScreenBoundary
      title="Courses"
      showBack={!detailVisible}
      backFallbackHref={backFallbackHref}
    >
      <CoursesScreen
        catalogHref="/courses"
        onDetailVisibilityChange={handleDetailVisibilityChange}
      />
    </ScreenBoundary>
  );
}
