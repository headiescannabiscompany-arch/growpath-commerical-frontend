import Constants from "expo-constants";
import { API_URL } from "../api/apiRequest";

type Extra = {
  API_BASE_URL?: string;
  PRIVACY_URL?: string;
  TERMS_URL?: string;
  SUPPORT_URL?: string;
  DELETE_ACCOUNT_URL?: string;
};

function _readExtra(): Extra {
  const cfg = Constants.expoConfig as any;
  return (cfg?.extra || {}) as Extra;
}

export const config = {
  env: __DEV__ ? "dev" : "prod",
  apiBaseUrl: API_URL,
  privacyUrl:
    process.env.EXPO_PUBLIC_PRIVACY_URL ||
    _readExtra().PRIVACY_URL ||
    "https://growpathai.com/privacy",
  termsUrl:
    process.env.EXPO_PUBLIC_TERMS_URL ||
    _readExtra().TERMS_URL ||
    "https://growpathai.com/terms",
  supportUrl:
    process.env.EXPO_PUBLIC_SUPPORT_URL ||
    _readExtra().SUPPORT_URL ||
    "https://growpathai.com/support",
  deleteAccountUrl:
    process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL ||
    _readExtra().DELETE_ACCOUNT_URL ||
    "https://growpathai.com/account/delete",
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || ""
};
