import { normalizeApiError } from "./errors";

type RequestOptions = {
  body?: any;
};

type MockProfile = {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: "user" | "creator" | "admin";
    plan: string | null;
    subscriptionStatus: string | null;
  };
  session: {
    plan: string;
    mode: "personal" | "commercial" | "facility";
    facilityId?: string | null;
    facilityRole?: string | null;
    facilityFeaturesEnabled?: boolean;
  };
  entitlements: {
    capabilities: Record<string, boolean>;
    limits: Record<string, number>;
  };
  facilities: Record<string, any>[];
};

const MOCK_PASSWORD = "password";

const MOCK_PROFILES: Record<string, MockProfile> = {
  "free@dev.com": {
    user: {
      id: "user-free-dev",
      email: "free@dev.com",
      displayName: "Free Dev",
      role: "user",
      plan: "free",
      subscriptionStatus: "free"
    },
    session: {
      plan: "free",
      mode: "personal",
      facilityId: null,
      facilityRole: null,
      facilityFeaturesEnabled: false
    },
    entitlements: {
      capabilities: {},
      limits: { maxPlants: 1, maxGrows: 1 }
    },
    facilities: []
  },
  "commercial@dev.com": {
    user: {
      id: "user-commercial-dev",
      email: "commercial@dev.com",
      displayName: "Commercial Dev",
      role: "user",
      plan: "commercial",
      subscriptionStatus: "active"
    },
    session: {
      plan: "commercial",
      mode: "commercial",
      facilityId: "facility-dev-commercial",
      facilityRole: "OWNER",
      facilityFeaturesEnabled: true
    },
    entitlements: {
      capabilities: {},
      limits: { maxPlants: 50, maxGrows: 10 }
    },
    facilities: [
      {
        id: "facility-dev-commercial",
        facilityId: "facility-dev-commercial",
        name: "Commercial Dev Facility",
        businessType: "cultivator",
        trackingMode: "commercial"
      }
    ]
  },
  "facility@dev.com": {
    user: {
      id: "user-facility-dev",
      email: "facility@dev.com",
      displayName: "Facility Dev",
      role: "user",
      plan: "facility",
      subscriptionStatus: "active"
    },
    session: {
      plan: "facility",
      mode: "facility",
      facilityId: "facility-dev-1",
      facilityRole: "OWNER",
      facilityFeaturesEnabled: true
    },
    entitlements: {
      capabilities: {},
      limits: { maxPlants: 200, maxGrows: 25 }
    },
    facilities: [
      {
        id: "facility-dev-1",
        facilityId: "facility-dev-1",
        name: "Facility Dev One",
        businessType: "cultivator",
        trackingMode: "facility"
      }
    ]
  }
};

function normalizeMockEmail(email: string | undefined) {
  return (email || "").trim().toLowerCase();
}

function makeMockToken(email: string) {
  return `mock::${email}`;
}

function getMockProfileFromToken(token: string | null) {
  if (!token || !token.startsWith("mock::")) return null;
  const email = token.replace("mock::", "");
  return MOCK_PROFILES[email] || null;
}

function parseBody(body: any) {
  if (body == null) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body;
}

function throwMockError(status: number, code: string, message: string) {
  throw normalizeApiError({ error: { code, message }, status });
}

export async function mockRequest(
  rawPath: string,
  method: string,
  options: RequestOptions,
  headers: Record<string, string>,
  authToken: string | null
) {
  const path = rawPath.startsWith("http")
    ? new URL(rawPath).pathname
    : rawPath.startsWith("/")
      ? rawPath
      : `/${rawPath}`;
  const body = parseBody(options.body);

  if (path === "/api/auth/login" && method === "POST") {
    const loginEmail = normalizeMockEmail(body?.email);
    const loginPassword = body?.password;
    const loginProfile = MOCK_PROFILES[loginEmail];
    if (!loginProfile || loginPassword !== MOCK_PASSWORD) {
      throwMockError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const loginToken = makeMockToken(loginEmail);
    return { token: loginToken, user: loginProfile.user };
  }

  if (path === "/api/auth/signup" && method === "POST") {
    const signupEmail = normalizeMockEmail(body?.email);
    const signupProfile = MOCK_PROFILES[signupEmail] || MOCK_PROFILES["free@dev.com"];
    const signupToken = makeMockToken(signupProfile.user.email);
    return { token: signupToken, user: signupProfile.user };
  }

  if (path === "/api/auth/register" && method === "POST") {
    const registerEmail = normalizeMockEmail(body?.email);
    const registerProfile = MOCK_PROFILES[registerEmail] || MOCK_PROFILES["free@dev.com"];
    const registerToken = makeMockToken(registerProfile.user.email);
    return { token: registerToken };
  }

  if (path === "/api/auth/save-push-token" && method === "POST") {
    return { ok: true };
  }

  if (path === "/api/auth/become-creator" && method === "POST") {
    return { ok: true, role: "creator" };
  }

  if (path === "/api/events" && method === "POST") {
    return { ok: true };
  }

  if (path === "/api/me" && method === "GET") {
    const meHeaderToken = headers["Authorization"]?.replace("Bearer ", "");
    const meToken = authToken || meHeaderToken || null;
    const meProfile = getMockProfileFromToken(meToken);
    if (!meProfile) {
      throwMockError(401, "UNAUTHORIZED", "Missing or invalid token");
      return { user: null, session: null, entitlements: null } as any;
    }
    return {
      user: meProfile.user,
      session: meProfile.session,
      entitlements: meProfile.entitlements
    };
  }

  if (path === "/api/entitlements" && method === "GET") {
    const entitlementsHeaderToken = headers["Authorization"]?.replace("Bearer ", "");
    const entitlementsToken = authToken || entitlementsHeaderToken || null;
    const entitlementsProfile = getMockProfileFromToken(entitlementsToken);
    if (!entitlementsProfile) {
      throwMockError(401, "UNAUTHORIZED", "Missing or invalid token");
      return { entitlements: null } as any;
    }
    return { entitlements: entitlementsProfile.entitlements };
  }

  if (path === "/api/facilities" && method === "GET") {
    const facilitiesHeaderToken = headers["Authorization"]?.replace("Bearer ", "");
    const facilitiesToken = authToken || facilitiesHeaderToken || null;
    const facilitiesProfile = getMockProfileFromToken(facilitiesToken);
    if (!facilitiesProfile) {
      throwMockError(401, "UNAUTHORIZED", "Missing or invalid token");
      return [] as any;
    }
    return facilitiesProfile.facilities;
  }

  if (path === "/api/health" && method === "GET") {
    return { ok: true, mock: true };
  }

  throwMockError(
    501,
    "NOT_IMPLEMENTED",
    `Mock endpoint not implemented: ${method} ${path}`
  );
}
