import React, {
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { Platform, Pressable, Text, View } from "react-native";
import {
  getAdminSecurityIdentityEpoch,
  subscribeAdminSecurity
} from "@/api/adminPasskeys";
import { giftObjectId } from "@/api/courseGiftSaleContract";
import { useAuth } from "@/auth/AuthContext";
import { InternalCourseGiftTransportContext } from "@/components/courseGifts/CourseGiftTransportContext";
import AppCard from "@/components/layout/AppCard";
import { useAppTheme } from "@/theme/appTheme";
import { InternalCourseCheckoutSupportPanel } from "./CourseCheckoutSupportPanel";

/** The pinned staging root supplies this context; production/native stay inert.
 * This is display selection only. The existing server still verifies Platform
 * Owner authority, a fresh passkey and the exact original checkout evidence.
 */
export default function StagingCourseCheckoutSupportEntry() {
  const transport = useContext(InternalCourseGiftTransportContext);
  const auth = useAuth();
  const identityEpoch = useSyncExternalStore(
    subscribeAdminSecurity,
    getAdminSecurityIdentityEpoch,
    () => 0
  );
  const actorId = auth.user?.id || "";
  const ready =
    Platform.OS === "web" &&
    Boolean(transport) &&
    auth.isAuthed &&
    !auth.isHydrating &&
    auth.meStatus === "ready" &&
    Boolean(auth.token) &&
    auth.user?.emailVerified === true &&
    String(auth.user?.role || "").toLowerCase() === "admin" &&
    giftObjectId(actorId);
  const binding = useRef({
    ready,
    actorId,
    token: auth.token,
    identityEpoch,
    transport,
    revision: 1
  });
  const previous = binding.current;
  if (
    ready !== previous.ready ||
    actorId !== previous.actorId ||
    auth.token !== previous.token ||
    identityEpoch !== previous.identityEpoch ||
    transport !== previous.transport
  ) {
    binding.current = {
      ready,
      actorId,
      token: auth.token,
      identityEpoch,
      transport,
      revision: previous.revision + 1
    };
  }
  // Changing identity/target synchronously discards the old admission and form.
  // Proof refresh is deliberately not a new identity: the accepted panel keeps
  // the same-account original operation while requiring fresh verification.
  if (!ready) return null;
  const admitted = binding.current;
  return (
    <SelectedSupportEntry
      key={admitted.revision}
      isCurrent={() =>
        admitted === binding.current &&
        admitted.ready &&
        admitted.identityEpoch === getAdminSecurityIdentityEpoch()
      }
    />
  );
}

function SelectedSupportEntry({ isCurrent }: { isCurrent: () => boolean }) {
  const [open, setOpen] = useState(false);
  const mounted = useRef(true);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { palette } = useAppTheme();
  return (
    <AppCard
      title="Private course-gift support"
      titleLevel={2}
      subtitle="Staging only. Requires Platform Owner access, an existing passkey and original checkout evidence."
    >
      <View style={{ gap: 12 }}>
        <Text style={{ color: palette.textMuted }}>
          Opening this panel does not send email or change a payment. Closing it
          clears the private form; keep the original references before closing.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            open ? "Close course-gift support" : "Open course-gift support"
          }
          accessibilityState={{ expanded: open }}
          onPress={() => {
            if (mounted.current && isCurrent()) setOpen((current) => !current);
          }}
          style={{
            alignSelf: "flex-start",
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 8,
            padding: 12
          }}
        >
          <Text style={{ color: palette.link, fontWeight: "700" }}>
            {open ? "Close course-gift support" : "Open course-gift support"}
          </Text>
        </Pressable>
        {open ? <InternalCourseCheckoutSupportPanel /> : null}
      </View>
    </AppCard>
  );
}
