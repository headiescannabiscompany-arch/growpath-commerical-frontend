import React, { useContext, useRef, useState, useSyncExternalStore } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { API_URL } from "@/api/apiRequest";
import { getAdminSecurityIdentityEpoch, subscribeAdminSecurity } from "@/api/adminPasskeys";
import { useAuth } from "@/auth/AuthContext";
import { InternalCourseGiftTransportContext } from "@/components/courseGifts/CourseGiftTransportContext";
import AppCard from "@/components/layout/AppCard";
import { useAppTheme } from "@/theme/appTheme";
import { InternalCourseGiftFinancialReviewPanel } from "./CourseGiftFinancialReviewPanel";

/** A prepared production transport is code-selected separately. Neither Admin
 * role, an environment flag, a query nor visiting this card activates gifts. */
export default function PreparedProductionCourseGiftFinancialEntry() {
  const transport = useContext(InternalCourseGiftTransportContext), auth = useAuth();
  const epoch = useSyncExternalStore(subscribeAdminSecurity, getAdminSecurityIdentityEpoch, () => 0);
  const ready = Platform.OS === "web" && Boolean(transport) && typeof window !== "undefined" &&
    window.location?.origin === "https://growpathai.com" && API_URL === "https://api.growpathai.com" &&
    auth.isAuthed && !auth.isHydrating && auth.meStatus === "ready" && Boolean(auth.token) &&
    auth.user?.emailVerified === true && auth.user?.role?.toLowerCase() === "admin" && /^[a-f0-9]{24}$/.test(auth.user?.id || "");
  const binding = useRef({ ready, actor: auth.user?.id, token: auth.token, transport, epoch, revision: 0 });
  const previous = binding.current;
  if (ready !== previous.ready || auth.user?.id !== previous.actor || auth.token !== previous.token || transport !== previous.transport || epoch !== previous.epoch)
    binding.current = { ready, actor: auth.user?.id, token: auth.token, transport, epoch, revision: previous.revision + 1 };
  if (!ready) return null;
  return <Entry key={binding.current.revision} />;
}
function Entry() {
  const [open, setOpen] = useState(false), { palette } = useAppTheme();
  return <AppCard title="Private course-gift payment review" titleLevel={2}
    subtitle="Requires the configured Platform Owner, an existing passkey and original financial evidence.">
    <View style={{ gap: 12, minWidth: 0 }}><Text style={{ color: palette.textMuted }}>Opening this panel does not issue a refund. Closing clears the private form; retain the original operation references.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={open ? "Close course-gift payment review" : "Open course-gift payment review"}
        accessibilityState={{ expanded: open }} onPress={() => setOpen(v => !v)} style={{ padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 8 }}>
        <Text style={{ color: palette.link, fontWeight: "700" }}>{open ? "Close payment review" : "Open payment review"}</Text></Pressable>
      {open ? <InternalCourseGiftFinancialReviewPanel /> : null}
    </View></AppCard>;
}
