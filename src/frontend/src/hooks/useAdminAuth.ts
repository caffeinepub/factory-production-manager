import { useCallback, useEffect, useState } from "react";

const AUTH_KEY = "fpm_admin_auth";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

export function useAdminAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const session = sessionStorage.getItem(AUTH_KEY);
    if (session === "1") setIsLoggedIn(true);
    setIsInitializing(false);
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      if (
        username.trim().toLowerCase() === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
      ) {
        sessionStorage.setItem(AUTH_KEY, "1");
        setIsLoggedIn(true);
        return true;
      }
      return false;
    },
    [],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_KEY);
    setIsLoggedIn(false);
  }, []);

  return { isLoggedIn, isInitializing, login, logout };
}
