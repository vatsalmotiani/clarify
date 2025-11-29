"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  checkAuthStatus,
  logout as apiLogout,
  createGuestSession,
  type AuthUser,
  type AuthCheckResponse,
} from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isGuest: boolean;
  guestId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  startGuestMode: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const status = await checkAuthStatus();
      if (status.authenticated && status.user) {
        setUser(status.user);
        setIsGuest(false);
        setGuestId(null);
      } else if (status.is_guest && status.guest_id) {
        setUser(null);
        setIsGuest(true);
        setGuestId(status.guest_id);
      } else {
        setUser(null);
        setIsGuest(false);
        setGuestId(null);
      }
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setUser(null);
      setIsGuest(false);
      setGuestId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback((user: AuthUser) => {
    setUser(user);
    setIsGuest(false);
    setGuestId(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsGuest(false);
      setGuestId(null);
    }
  }, []);

  const startGuestMode = useCallback(async () => {
    try {
      const response = await createGuestSession();
      setUser(null);
      setIsGuest(true);
      setGuestId(response.guest_id);
    } catch (error) {
      console.error("Failed to create guest session:", error);
      throw error;
    }
  }, []);

  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        guestId,
        isLoading,
        isAuthenticated,
        login,
        logout,
        startGuestMode,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
