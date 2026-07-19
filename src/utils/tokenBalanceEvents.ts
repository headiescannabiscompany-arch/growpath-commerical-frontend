type TokenBalanceListener = (aiTokens: number) => void;

const listeners = new Set<TokenBalanceListener>();

export function publishTokenBalanceChange(value: unknown) {
  if (value === null || value === undefined) return;
  const aiTokens = Number(value);
  if (!Number.isFinite(aiTokens) || aiTokens < 0) return;

  for (const listener of listeners) {
    try {
      listener(aiTokens);
    } catch {
      // A display observer must never affect a completed API request.
    }
  }
}

export function subscribeToTokenBalanceChange(listener: TokenBalanceListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
