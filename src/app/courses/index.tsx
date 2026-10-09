import React, { useCallback, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import CoursesScreen from "@/screens/CoursesScreen";
import { personalMoreReturnHref } from "@/utils/personalMoreReturn";

export default function Courses() {
  const auth = useAuth();
  const { from } = useLocalSearchParams<{ from?: string | string[] }>();
  const moreReturn = personalMoreReturnHref(from);
  const [detailVisible, setDetailVisible] = useState(false);
  const handleDetailVisibilityChange = useCallback((visible: boolean) => {
    setDetailVisible(visible);
  }, []);
  const backFallbackHref = auth?.isAuthed || auth?.user ? "/account/workspace" : "/";

  return (
    <ScreenBoundary
      title="Courses"
      showBack={!detailVisible}
      backFallbackHref={moreReturn || backFallbackHref}
      preferBackFallback={Boolean(moreReturn)}
    >
      <CoursesScreen
        catalogHref="/courses"
        onDetailVisibilityChange={handleDetailVisibilityChange}
      />
    </ScreenBoundary>
  );
}
