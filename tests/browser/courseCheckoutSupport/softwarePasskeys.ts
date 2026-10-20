// NO navigator.credentials call: this is explicitly software-only fixture evidence.
export async function startAuthentication({ optionsJSON }: any) {
  const response = await fetch("/fixture/assertion", {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Fixture-Key": (globalThis as any).__supportFixture.controlKey
    },
    body: JSON.stringify({ challenge: optionsJSON.challenge })
  });
  if (!response.ok) throw new Error("Synthetic signer rejected request");
  return response.json();
}
export async function startRegistration() {
  throw new Error("Registration forbidden");
}
