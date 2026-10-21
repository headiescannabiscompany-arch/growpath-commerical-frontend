export async function getToken(): Promise<never> {
  throw new Error("Real app credential access forbidden in browser fixture");
}
