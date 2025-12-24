const { validateResponse, getSpec } = require("./contract_utils.js");

const fetchCalls = [];
globalThis.__FETCH_CALLS__ = fetchCalls;
globalThis.__MOCK_RESPONDER__ = null;

const originalFetch = globalThis.fetch;

globalThis.fetch = async (...args) => {
  const url = String(args[0]);
  const options = args[1] || {};
  const method = options.method || "GET";
  
  fetchCalls.push({ url, args, options });
  
  const useLive = process.env.USE_LIVE_BACKEND === "true";

  if (useLive) {
     try {
       const res = await originalFetch(...args);
       
       if (res.ok) {
          const clone = res.clone();
          const contentType = res.headers.get("content-type");
          
          if (contentType && contentType.includes("application/json")) {
             try {
                const body = await clone.json();
                const urlObj = new URL(url, "http://localhost");
                const apiPath = urlObj.pathname;
                
                await validateResponse(apiPath, method, res.status, body);
             } catch (jsonErr) {
                if (jsonErr.message.includes("Contract Violation")) throw jsonErr;
             }
          }
       }
       
       return res;
     } catch (err) {
       if (err.message.includes("Contract Violation")) {
          console.error("\n❌ CONTRACT BROKEN:", err.message);
          throw err;
       }
       throw err;
     }
  }
  
  // MOCK MODE (CI or local without backend)
  if (globalThis.__MOCK_RESPONDER__) {
     const mockRes = await globalThis.__MOCK_RESPONDER__(url, options);
     if (mockRes) {
        return new Response(JSON.stringify(mockRes.json || {}), {
           status: mockRes.status || 200,
           headers: { 'Content-Type': 'application/json' }
        });
     }
  }

  // Generic fallback
  return new Response(JSON.stringify({ success: true, id: "mock-id", token: "mock-token", user: { id: "u1" } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};