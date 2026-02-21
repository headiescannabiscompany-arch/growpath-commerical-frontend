// Intentionally left empty: undici teardown caused crashes in this runtime.
afterAll(() => {});

afterEach(() => {
  try {
    jest.clearAllTimers();
  } catch (_e) {
    // ignore if timers are not in use
  }
});
