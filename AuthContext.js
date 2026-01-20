// AuthContext.js
// React context for authentication and user state
import React, { createContext, useContext, useState, useEffect } from "react";
import { getToken } from "./api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(null);

  useEffect(() => {
    setToken(getToken());
    // Optionally, decode JWT to get user info
    // setUser(decodedUser)
  }, []);

  const login = (jwt) => {
    localStorage.setItem("jwt", jwt);
    setToken(jwt);
    // Optionally decode and set user
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
