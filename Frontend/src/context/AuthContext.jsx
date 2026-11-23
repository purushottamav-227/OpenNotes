import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  guestUser,
  getRolePermissions,
  ROLES,
} from "../config/roles";

import {
  authApi,
  getAccessToken,
  setAccessToken,
  SESSION_EXPIRED_EVENT,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore the session from the stored access token.
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getAccessToken()) {
        if (active) setAuthLoading(false);
        return;
      }

      try {
        const result = await authApi.me();
        if (active) setUser(result?.data || null);
      } catch {
        setAccessToken(null);
        if (active) setUser(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  // The API client clears the token and fires this when the server
  // rejects it (expired access token or revoked sessions).
  useEffect(() => {
    const handleExpired = () => setUser(null);

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);

    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const result = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
      });

      const data = result?.data;

      if (!data?.accessToken || !data?.user) {
        throw new Error("Invalid login response from server.");
      }

      setAccessToken(data.accessToken);

      // /auth/me returns the complete profile (e.g. createdAt); fall back to
      // the login payload if that request fails.
      let fullUser = data.user;

      try {
        const profile = await authApi.me();
        fullUser = profile?.data || data.user;
      } catch {
        fullUser = data.user;
      }

      setUser(fullUser);

      return {
        success: true,
        message: result.message || "Signed in successfully.",
        user: fullUser,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Unable to sign in.",
      };
    }
  }, []);

  // Reload the signed-in user from the backend.
  const refreshUser = useCallback(async () => {
    const result = await authApi.me();
    setUser(result?.data || null);
    return result?.data || null;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) {
        await authApi.logoutAll();
      }
    } catch (error) {
      console.warn("Logout request failed:", error.message);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const role = user?.role || ROLES.GUEST;

  const permissions = useMemo(() => getRolePermissions(role), [role]);

  const can = useCallback(
    (permission) => Boolean(permissions[permission]),
    [permissions]
  );

  const hasRole = useCallback(
    (...roles) => roles.includes(role),
    [role]
  );

  const value = useMemo(
    () => ({
      user,
      currentUser: user || guestUser,
      isAuthenticated: Boolean(user),
      authLoading,
      role,
      permissions,
      can,
      hasRole,
      isGuest: role === ROLES.GUEST,
      isStudent: role === ROLES.STUDENT,
      isTeacher: role === ROLES.TEACHER,
      isAdmin: role === ROLES.ADMIN,
      login,
      logout,
      refreshUser,
    }),
    [
      user,
      authLoading,
      role,
      permissions,
      can,
      hasRole,
      login,
      logout,
      refreshUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export default AuthContext;