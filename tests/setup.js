// tests/setup.js

// If you use fake timers in any tests, this prevents timers from hanging
afterEach(() => {
  try {
    jest.clearAllMocks();
  } catch (_) {}
});

afterAll(async () => {
  // 1) Close mongoose connection if it exists
  try {
    const mongoose = require("mongoose");
    if (mongoose?.connection?.readyState === 1) {
      await mongoose.connection.close();
    }
  } catch (_) {}

  // 2) Close any HTTP server you stored globally
  // (Add this pattern in tests if you start listening: global.__server = app.listen(...))
  try {
    if (global.__server && typeof global.__server.close === "function") {
      await new Promise((res) => global.__server.close(res));
      global.__server = null;
    }
  } catch (_) {}

  // 3) Kill any lingering timers/intervals
  try {
    jest.clearAllTimers();
    jest.useRealTimers();
  } catch (_) {}
});
