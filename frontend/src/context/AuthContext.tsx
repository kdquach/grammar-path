import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import api, { getStoredToken, setStoredToken } from "../api/client";
import { onUnauthorized } from "../api/authEvents";
import { useToast } from "./ToastContext";
import type { AuthUser } from "../types/api.types";

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const toast = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const notifiedExpiredRef = useRef<boolean>(false);

  // Listen for unauthorized/expired session events from API client
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setStoredToken(null);
      setUser(null);
      setTokenState(null);
      setIsLoading(false);

      if (!notifiedExpiredRef.current) {
        notifiedExpiredRef.current = true;
        toast.warning("Your session has expired. Please sign in again.");
      }
    });

    return unsubscribe;
  }, [toast]);

  // Restore authenticated session from localStorage token on mount
  useEffect(() => {
    let isMounted = true;
    const existingToken = getStoredToken();

    if (existingToken) {
      api
        .getCurrentUser()
        .then((currentUser) => {
          if (isMounted) {
            notifiedExpiredRef.current = false;
            setUser(currentUser);
            setTokenState(existingToken);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setStoredToken(null);
            setUser(null);
            setTokenState(null);
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (payload: { email: string; password: string }) => {
    const res = await api.loginUser(payload);
    notifiedExpiredRef.current = false;
    setUser(res.user);
    setTokenState(res.token);
  };

  const register = async (payload: {
    email: string;
    password: string;
    displayName: string;
  }) => {
    const res = await api.registerUser(payload);
    notifiedExpiredRef.current = false;
    setUser(res.user);
    setTokenState(res.token);
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setTokenState(null);
  };

  const refreshUser = async () => {
    if (!getStoredToken()) return;
    try {
      const currentUser = await api.getCurrentUser();
      setUser(currentUser);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const defaultGuestAuth: AuthContextType = {
  user: null,
  token: null,
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context || defaultGuestAuth;
}

export default AuthContext;
