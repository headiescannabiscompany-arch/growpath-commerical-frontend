import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import {
  useRouter,
  usePathname,
  useGlobalSearchParams,
  useNavigationContainerRef
} from "expo-router";
import AppCard from "@/components/layout/AppCard";
import PrimaryButton from "@/components/PrimaryButton";
import { useAppTheme } from "@/theme/appTheme";
import { CourseGiftClientError } from "@/api/courseGiftClient";
import { CourseGiftRecipientPanel } from "./CourseGiftPanels";
import {
  buyerGiftMessage,
  type GiftRecipientState,
  type GiftBuyerStatus
} from "./courseGiftPresentation";
import {
  type CourseGiftWebSnapshot,
  createInternalCourseGiftWebSession
} from "@/utils/courseGiftWebSession";

type Session = ReturnType<typeof createInternalCourseGiftWebSession>;
export const InternalCourseGiftWebContext = createContext<{
  session: Session;
  snapshot: CourseGiftWebSnapshot | null;
} | null>(null);

/** Actual route entry stays closed: no public runtime installs this context.
 * No env/query/Admin override, automatic request, native purchase or claim.
 */
export default function CourseGiftWebScreen() {
  const context = useContext(InternalCourseGiftWebContext);
  const router = useRouter();
  const routePath = usePathname();
  const routeParams = useGlobalSearchParams();
  const navigation = useNavigationContainerRef();
  const { palette } = useAppTheme();
  useEffect(() => {
    if (context || Platform.OS !== "web" || typeof window === "undefined") return;
    if (!["/claim-course-gift", "/course-gifts/checkout"].includes(routePath)) return;
    const scrub = () => {
      try {
        if (window.location.pathname === routePath)
          window.history.replaceState(null, "", routePath);
        if (navigation.isReady()) {
          const keys = Object.keys(routeParams).filter(
            (key) =>
              routeParams[key] !== undefined && !(key === "#" && routeParams[key] === "")
          );
          if (keys.length)
            router.setParams(
              Object.fromEntries(keys.map((key) => [key, key === "#" ? "" : undefined]))
            );
        }
      } catch {
        /* No secret is retained. */
      }
    };
    const unsubscribe = navigation.addListener("ready", scrub);
    scrub();
    return unsubscribe;
  }, [context, routePath, routeParams, navigation, router]);
  if (!context || Platform.OS !== "web")
    return (
      <AppCard title="Course gifting" titleLevel={1}>
        <Text style={{ color: palette.text }}>
          Course gifting is not available yet. No payment or claim has been started.
        </Text>
      </AppCard>
    );
  if (!context.snapshot)
    return (
      <AppCard title="Course gift" titleLevel={1}>
        <Text style={{ color: palette.text }}>
          Open the original course-gift link to continue. No request has been sent.
        </Text>
      </AppCard>
    );
  return (
    <GiftScreen
      key={context.snapshot.key + context.snapshot.path}
      session={context.session}
      snapshot={context.snapshot}
      navigate={(path) => router.push(path as any)}
    />
  );
}

function GiftScreen({
  session,
  snapshot,
  navigate
}: {
  session: Session;
  snapshot: CourseGiftWebSnapshot;
  navigate: (path: string) => void;
}) {
  const { palette } = useAppTheme();
  const [review, setReview] = useState<GiftRecipientState | null>(null);
  const [buyer, setBuyer] = useState<GiftBuyerStatus | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const flight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function read() {
    if (flight.current || snapshot.authState !== "ready") return;
    flight.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (snapshot.kind === "claim") {
        const result = await session.reviewRecipient();
        if (alive.current) setReview(result);
      } else {
        const result = await session.readBuyerStatus();
        if (alive.current) {
          setBuyer(result.status);
          if (!result.reloadSaved)
            setMessage(
              "Reload recovery was not saved. Keep the original checkout-return link; do not start another payment."
            );
        }
      }
    } catch (error) {
      if (alive.current) {
        setReview(null);
        setBuyer(null);
        setMessage(
          error instanceof CourseGiftClientError &&
            error.code === "COURSE_GIFT_REOPEN_INVITATION"
            ? "Reopen the original invitation to check this gift."
            : "We could not confirm this result. Check again; do not start another payment or assume access."
        );
      }
    } finally {
      if (alive.current) {
        flight.current = false;
        setBusy(false);
      }
    }
  }
  const ready = snapshot.authState === "ready";
  const available =
    snapshot.kind === "checkout" ? Boolean(snapshot.attempt) : snapshot.hasInvitation;
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <AppCard
        title={
          snapshot.kind === "claim" ? "Your course gift" : "Course gift payment status"
        }
        titleLevel={1}
      >
        <View style={{ gap: 12 }}>
          <Text style={{ color: palette.text }}>
            This gift does not change your subscription, AI credits, or access to other
            features. Returning here does not confirm payment, email delivery or course
            access.
          </Text>
          <Text style={{ color: palette.text }}>
            For gift support, contact support@growpathai.com.
          </Text>
          {snapshot.authState === "pending" && (
            <Text style={{ color: palette.text }}>
              Waiting for your sign-in to be verified. No gift request has been sent.
            </Text>
          )}
          {snapshot.authState === "signed_out" && (
            <>
              <Text style={{ color: palette.text }}>
                Sign in to review this gift. Signing in does not claim it. Reloading or
                leaving this flow requires the original invitation again.
              </Text>
              <PrimaryButton
                title="Sign in to review gift"
                onPress={() => {
                  try {
                    navigate(session.beginSignIn());
                  } catch {
                    setMessage("Sign-in changed. Reopen the original invitation.");
                  }
                }}
              />
            </>
          )}
          {ready && !available && (
            <Text style={{ color: palette.text }}>
              Reopen the original invitation or checkout-return link. No access has been
              granted.
            </Text>
          )}
          {message ? (
            <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>
              {message}
            </Text>
          ) : null}
          {buyer && (
            <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>
              {buyerGiftMessage(buyer)}
            </Text>
          )}
          {ready && available && !review && (
            <PrimaryButton
              title={
                snapshot.kind === "claim"
                  ? "Review course gift"
                  : "Check this payment attempt"
              }
              disabled={busy}
              accessibilityState={{ busy }}
              onPress={() => void read()}
            />
          )}
        </View>
      </AppCard>
      {ready && review && (
        <CourseGiftRecipientPanel
          scopeKey={snapshot.key}
          state={review}
          onClaim={() => session.claimRecipient()}
          onRenew={() => session.renewRecipient()}
          onRecheck={() => session.reviewRecipient()}
          onSignIn={() => {
            /* Signed-out handling is above; never switch an account here. */
          }}
          onOpenCourse={(id) => navigate(`/courses?courseId=${id}`)}
        />
      )}
    </ScrollView>
  );
}
