import React from "react";
// Fixture-only account/decoration seams. The actual Profile handlers, API client,
// React Native Web, Blob/anchor download and backend authentication are retained.
const denied = () => {
  throw new Error("Outside the read-only export fixture");
};
const fixture = () => (globalThis as any).__exportFixture;
export const getToken = async () => fixture().token;
export const useAuth = () => ({
  user: fixture().user,
  token: fixture().token,
  logout: denied,
  retryMe: denied
});
export const CAPABILITY_KEYS = { COURSES_SELL_PAID: "courses.sellPaid" };
export const useEntitlements = () => ({
  mode: "personal",
  plan: "free",
  can: () => false
});
export const useRouter = () => ({ push: denied, replace: denied, back: denied });
const palette = {
  page: "#10171e",
  card: "#18222d",
  surface: "#18222d",
  surfaceMuted: "#1e2b38",
  border: "#415063",
  text: "#f1f5f9",
  textMuted: "#c4cedb",
  accent: "#80aaff",
  accentText: "#10171e",
  success: "#a5d990",
  danger: "#ff9a9a",
  warning: "#e4c57e"
};
export const useAppTheme = () => ({ palette });
export const requestEmailVerification = denied;
export const updateContentControls = denied;
export const getVideoQuota = async () => ({
  limitBytes: 1024,
  usedBytes: 0,
  reservedBytes: 0
});
export default function Decoration({ children, header }: any) {
  return (
    <>
      {header}
      {children}
    </>
  );
}
