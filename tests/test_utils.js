export function setupNetworkMock(mockResponder) {
  const originalFetch = global.fetch;
  const useLiveFlag = process.env.USE_LIVE_BACKEND === "true";

  const fetchCalls = [];

  global.fetch = async (url, options) => {
    fetchCalls.push({ url, options });

    if (useLiveFlag && typeof originalFetch === "function") {
      try {
        const res = await originalFetch(url, options);
        return res;
      } catch (err) {
        console.warn(
          `FETCH (LIVE FAILED): ${url} - Falling back to mock. Error: ${err?.message || String(err)}`
        );
      }
    }

    // Optional: keep logs if you want; otherwise remove to reduce noise
    // console.log(`FETCH (MOCK): ${url}`);

    const res = await mockResponder(url, options);
    return {
      ok: res.ok ?? true,
      status: res.status ?? 200,
      text: async () => res.text ?? JSON.stringify(res.json ?? {}),
      json: async () => res.json ?? JSON.parse(res.text ?? "{}")
    };
  };

  afterAll(() => {
    global.fetch = originalFetch;
  });

  return fetchCalls;
}
