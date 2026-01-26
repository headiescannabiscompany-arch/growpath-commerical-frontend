// Compatibility shim: legacy imports keep working, but everything uses the new AuthContext.
// This prevents provider mismatch across the entire codebase.

export { AuthProvider, getAuthErrorMessage } from "../auth/AuthContext";
import { useAuth as useAuthNew } from "../auth/AuthContext";

// Legacy adapter: keeps old screens working without rewriting them.
export function useAuth() {
  const a = useAuthNew();

  return {
    // legacy flags
    loading: a.isHydrating,
    authChecked: !a.isHydrating,

    // legacy fields
    token: a.token,
    user: a.user,

    // legacy actions
    logout: a.logout,

    // expose new actions too (harmless, helps migration)
    login: a.login,
    signup: a.signup,

    // expose new flags too
    isHydrating: a.isHydrating,
    isAuthed: a.isAuthed
  };
}
