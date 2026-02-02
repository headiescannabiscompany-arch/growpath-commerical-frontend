async function ensureTestUser(request, apiBaseUrl, user) {
  const login = async () => request.post(`${apiBaseUrl}/api/auth/login`, { data: user });

  // Try login first
  let res = await login();
  if (res.ok()) return;

  // Try common signup endpoints (auto-detect)
  const signupCandidates = [
    "/api/auth/register",
    "/api/auth/signup",
    "/api/auth/sign-up",
    "/api/auth/create",
    "/api/register",
    "/api/signup"
  ];

  let regRes = null;
  for (const path of signupCandidates) {
    regRes = await request.post(`${apiBaseUrl}${path}`, { data: user });
    if (regRes.ok()) break;
    if ([409, 422].includes(regRes.status())) break;
  }

  // Try login again
  res = await login();

  if (!res.ok()) {
    const body = await res.text();
    const regBody = regRes ? await regRes.text().catch(() => "") : "";
    throw new Error(
      `E2E auth failed. login=${res.status()} body=${body}\nregister=${regRes?.status?.()} regBody=${regBody}`
    );
  }
}

module.exports = { ensureTestUser };
