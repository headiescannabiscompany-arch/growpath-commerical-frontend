export const API_URL = "https://growpath-backend-14.onrender.com";
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

export default api;
export { api };
