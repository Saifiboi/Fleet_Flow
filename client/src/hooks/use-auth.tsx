import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionUser } from "@shared/schema";

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  setUser: (user: SessionUser | null) => void;
  refetch: () => Promise<SessionUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchCurrentUser(): Promise<SessionUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });

  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Failed to load user");
  }

  return (await res.json()) as SessionUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isPending, refetch } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
    retry: false,
  });

  const setUser = useCallback(
    (user: SessionUser | null) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
    [queryClient]
  );

  const value = useMemo<AuthContextValue>(() => ({
    user: data ?? null,
    isLoading: isPending,
    setUser,
    refetch: async () => {
      const result = await refetch();
      return result.data ?? null;
    },
  }), [data, isPending, refetch, setUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
