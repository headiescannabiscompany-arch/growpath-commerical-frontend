import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken as saveToken, clearToken } from "./tokenStore";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getToken().then((t) => {
      setTokenState(t);
      setReady(true);
    });
  }, []);

  const login = async (jwt: string) => {
    await saveToken(jwt);
    setTokenState(jwt);
  };

  const logout = async () => {
    await clearToken();
    setTokenState(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
