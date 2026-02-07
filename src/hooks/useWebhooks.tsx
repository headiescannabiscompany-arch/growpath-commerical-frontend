import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Plan = "free" | "pro" | "commercial" | "facility";
type Entitlements = {
  plan: Plan;
  capabilities: Record<string, boolean>;
};

const EntitlementsContext = createContext<Entitlements | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<Plan>("free");
  const [capabilities, setCapabilities] = useState({});

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("entitlements");
      if (stored) {
        const parsed = JSON.parse(stored);
        setPlan(parsed.plan);
        setCapabilities(parsed.capabilities);
      }
    })();
  }, []);

  return (
    <EntitlementsContext.Provider value={{ plan, capabilities }}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error("useEntitlements outside provider");
  return ctx;
}

export type Webhook = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
};

// Stub for Phase 2.3 compilation (webhooks not implemented yet)
export function useWebhooks() {
  return {
    data: [] as Webhook[],
    isLoading: false,
    createWebhook: async (_data: any) => {},
    updateWebhook: async (_id: string, _data: any) => {},
    deleteWebhook: async (_id: string) => {}
  };
}
