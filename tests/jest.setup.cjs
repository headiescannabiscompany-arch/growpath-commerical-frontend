process.env.NODE_ENV = "development";
process.env.EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost";
process.env.USE_LIVE_BACKEND = process.env.USE_LIVE_BACKEND || "false";
process.env.LIVE_BACKEND = process.env.LIVE_BACKEND || process.env.USE_LIVE_BACKEND;
process.env.EXPO_PUBLIC_USE_LIVE_BACKEND =
  process.env.EXPO_PUBLIC_USE_LIVE_BACKEND || process.env.USE_LIVE_BACKEND;

try {
  require("@testing-library/jest-native/extend-expect");
} catch (e) {}

try {
  jest.mock("@react-native-async-storage/async-storage", () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock")
  );
} catch (e) {
  const store = {};
  jest.mock("@react-native-async-storage/async-storage", () => ({
    getItem: jest.fn(async (k) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k, v) => {
      store[k] = String(v);
    }),
    removeItem: jest.fn(async (k) => {
      delete store[k];
    }),
    clear: jest.fn(async () => {
      for (const k of Object.keys(store)) delete store[k];
    })
  }));
}

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined)
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    NavigationContainer: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    useNavigation: () => ({
      addListener: jest.fn(() => jest.fn()),
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn()
    }),
    useRoute: () => ({ params: {} }),
    useIsFocused: () => true,
    useFocusEffect: (fn) => {
      if (typeof fn === "function") fn();
    }
  };
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true)
  }),
  Link: ({ children }) => children
}));

function makeHeaders(obj) {
  const lower = {};
  if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) lower[String(k).toLowerCase()] = obj[k];
  }
  return { get: (k) => lower[String(k || "").toLowerCase()] || null };
}

function makeRes(status, body, headers) {
  const text =
    typeof body === "undefined"
      ? ""
      : typeof body === "string"
        ? body
        : JSON.stringify(body);

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: makeHeaders(headers || { "content-type": "application/json" }),
    text: async () => text
  };
}

function asUrlString(input) {
  if (typeof input === "string") return input;
  if (input && typeof input.url === "string") return input.url;
  return String(input || "");
}

function pathFrom(urlStr) {
  try {
    if (/^https?:\/\//i.test(urlStr)) {
      const u = new URL(urlStr);
      return u.pathname + (u.search || "");
    }
  } catch (e) {}
  return urlStr;
}

global.fetch = jest.fn(async (input, init = {}) => {
  const urlStr = asUrlString(input);
  const method = String((init && init.method) || "GET").toUpperCase();
  const p = pathFrom(urlStr);

  // AUTH
  if (/\/api\/auth\/login\b/i.test(p) && method === "POST") {
    return makeRes(
      200,
      { token: "test-token", user: { id: "u1", role: "OWNER" } },
      { "x-request-id": "req-login-1" }
    );
  }
  // legacy /login
  if (/\/login\b/i.test(p) && method === "POST") {
    return makeRes(
      200,
      { token: "test-token", user: { id: "u1", role: "OWNER" } },
      { "x-request-id": "req-login-1" }
    );
  }

  // ME
  if (/\/api\/me\b/i.test(p) && method === "GET") {
    return makeRes(200, {
      id: "u1",
      email: "test@example.com",
      capabilities: { canUseCourses: true, canPostForum: true }
    });
  }
  if (/\/me\b/i.test(p) && method === "GET") {
    return makeRes(200, {
      id: "u1",
      email: "test@example.com",
      capabilities: { canUseCourses: true, canPostForum: true }
    });
  }

  // TASKS (today + list)
  if (/\/api\/tasks\/today\b/i.test(p) && method === "GET") {
    return makeRes(200, [{ id: "t1", title: "Water plants", status: "open" }]);
  }
  if (/\/api\/tasks\b/i.test(p) && method === "GET") {
    return makeRes(200, [{ id: "t1", title: "Water plants", status: "open" }]);
  }

  // GROWS
  if (/\/api\/grows\b/i.test(p) && method === "GET") {
    return makeRes(200, [{ id: "g1", _id: "g1", name: "Test Grow", stage: "flower" }]);
  }
  if (/\/api\/grows\b/i.test(p) && method === "POST") {
    return makeRes(201, { id: "g-new", _id: "g-new", name: "New Grow" });
  }

  // LOGS / GROWLOGS
  if (/\/api\/(logs|growlogs)\b/i.test(p)) {
    if (method === "POST") return makeRes(201, { id: "log-1", _id: "log-1", ok: true });
    return makeRes(200, []);
  }

  // POSTS FEED
  if (/\/api\/posts\/feed\b/i.test(p) && method === "GET") {
    return makeRes(200, {
      items: [
        {
          id: "p1",
          _id: "p1",
          title: "Welcome",
          body: "Hello world",
          createdAt: "2026-02-19T00:00:00Z"
        }
      ],
      page: 1
    });
  }
  if (/\/api\/posts\b/i.test(p) && method === "GET") {
    return makeRes(200, { items: [], page: 1 });
  }

  // FORUM
  if (/\/api\/forum\/create\b/i.test(p) && method === "POST") {
    return makeRes(201, { id: "f1", _id: "f1", ok: true });
  }
  if (/\/api\/forum\/.*comment/i.test(p) && method === "POST") {
    return makeRes(201, { id: "c1", _id: "c1", ok: true });
  }

  // CREATOR ONBOARD
  if (/\/api\/user\/creator\/onboard\b/i.test(p) && method === "POST") {
    return makeRes(200, { ok: true });
  }

  // COURSES LIST/ENROLL
  if (/\/api\/courses\/list\b/i.test(p) && method === "GET") {
    return makeRes(200, [{ id: "c1", _id: "c1", title: "Intro Course" }]);
  }
  if (/\/api\/courses\b/i.test(p) && method === "GET") {
    return makeRes(200, [{ id: "c1", _id: "c1", title: "Intro Course" }]);
  }

  // DIAGNOSE
  if (/\/api\/diagnose\/analyze\b/i.test(p) && method === "POST") {
    return makeRes(200, { ok: true, id: "d1", _id: "d1", result: { summary: "ok" } });
  }

  // FOLLOW + GUILDS
  if (/\/api\/user\/follow\//i.test(p) && (method === "POST" || method === "GET")) {
    return makeRes(200, { ok: true });
  }
  if (/\/api\/guilds\b/i.test(p) && method === "GET") {
    return makeRes(200, [{ id: "gld1", _id: "gld1", name: "Test Guild" }]);
  }

  // LIVE SESSIONS
  if (/\/api\/live/i.test(p) && /session/i.test(p) && method === "GET") {
    if (/session-1/i.test(p)) {
      return makeRes(200, {
        id: "session-1",
        _id: "session-1",
        title: "Live Session 1",
        twitchChannel: "growpath",
        moderationUrl: "https://twitch.tv/moderator",
        twitchModerationUrl: "https://twitch.tv/moderator"
      });
    }
    // simulate not found for any other id
    return makeRes(404, { message: "No session found", code: "NOT_FOUND" });
  }

  // DEFAULT
  return makeRes(200, { ok: true, path: p, method });
});

/* Reanimated mock (defensive; only if installed) */
try {
  jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
  global.__reanimatedWorkletInit = () => {};
} catch (e) {}
