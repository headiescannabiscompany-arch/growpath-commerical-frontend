import React from "react";

import { useAuth } from "@/auth/AuthContext";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import ForumRoute from "@/app/home/personal/(tabs)/forum";

export default function SharedForumRoute() {
  const auth = useAuth();
  const backFallbackHref = auth?.isAuthed || auth?.user ? "/account/workspace" : "/";

  return (
    <ScreenBoundary title="Forum and Q&A" showBack backFallbackHref={backFallbackHref}>
      <ForumRoute />
    </ScreenBoundary>
  );
}
