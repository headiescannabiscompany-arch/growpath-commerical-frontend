import Constants from "expo-constants";
import { API_URL } from "../api/apiRequest";

type Extra = {
  API_BASE_URL?: string;
};

function _readExtra(): Extra {
  const cfg = Constants.expoConfig as any;
  return (cfg?.extra || {}) as Extra;
}

export const config = {
  env: __DEV__ ? "dev" : "prod",
  apiBaseUrl: API_URL
};

void _readExtra;
