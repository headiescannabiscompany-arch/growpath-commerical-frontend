// Helper for multipart/form-data POST
async function postMultipart(path, formData, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Do NOT set Content-Type for FormData, let fetch/browser set it
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    // Always use a plain object for headers
    const plainHeaders = {};
    for (const k in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, k)) {
        plainHeaders[k] = headers[k];
      }
    }
    const fetchOptions = {
      method: "POST",
      body: formData,
      signal: controller.signal
    };
    if (Object.keys(plainHeaders).length > 0) {
      fetchOptions.headers = plainHeaders;
    }
    const res = await fetch(API_URL + path, fetchOptions);
    clearTimeout(timeout);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
    if (!res.ok) throw new Error(data.message || "API Error");
    return data;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("Request timeout - is the backend running?");
    }
    throw error;
  }
}

async function get(path, options = {}) {
  return api(path, { ...options, method: "GET" });
}

const client = Object.assign(api, { get, postMultipart });
export { client, postMultipart, api };
export default client;
export const API_URL = "http://localhost:5000";
// For local development, change to: http://localhost:5000
// For local network testing on device, use your computer's IP (e.g., http://192.168.1.42:5000)
// Get IP: Windows (ipconfig) or Mac (ifconfig | grep inet)

async function api(path, options = {}) {
  const token = global.authToken || null;

  const headers = options.headers || {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(API_URL + path, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeout);

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }

    if (!res.ok) {
      throw new Error(data.message || "API Error");
    }

    return data;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("Request timeout - is the backend running?");
    }
    throw error;
  }
}
