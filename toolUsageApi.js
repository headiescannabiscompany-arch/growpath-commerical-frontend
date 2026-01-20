// API for saving and retrieving tool usage
const API_URL = "http://localhost:3000/api/tool-usage"; // Update if backend runs elsewhere

export async function saveToolUsage({ userId, tool, input, output }) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, tool, input, output })
  });
  if (!res.ok) throw new Error("Failed to save tool usage");
  return res.json();
}

export async function getToolUsage({ userId, tool } = {}) {
  const params = new URLSearchParams();
  if (userId) params.append("userId", userId);
  if (tool) params.append("tool", tool);
  const res = await fetch(`${API_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch tool usage");
  return res.json();
}
