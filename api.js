// api.js
// Centralized API utility for frontend-backend integration

const API_BASE = "http://localhost:3000/api"; // Update if backend runs elsewhere

// Get JWT from storage (customize as needed)
function getToken() {
  return localStorage.getItem("jwt");
}

async function apiFetch(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  };
  if (auth) {
    const token = getToken();
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  }
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const error = new Error(data?.message || res.statusText);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export default apiFetch;
export { getToken, API_BASE };
