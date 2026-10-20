// Fixture navigation only. This does not certify Expo Router/auth integration.
export function useRouter() {
  return {
    push(path: string) {
      const target = new URL(path, window.location.origin);
      if (target.origin !== window.location.origin)
        throw new Error("External navigation blocked");
      window.location.assign(target.href);
    }
  };
}
