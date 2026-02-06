import Constants from "expo-constants";

type Extra = {
  API_BASE_URL?: string;
};

function readExtra(): Extra {
  const cfg = Constants.expoConfig as any;
  return (cfg?.extra || {}) as Extra;
}

export const config = {
  env: __DEV__ ? "dev" : "prod",
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_URL ||
    (__DEV__ ? "http://localhost:5001" : "https://api.growpath.ai")
};
