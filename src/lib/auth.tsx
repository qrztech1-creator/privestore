import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "bride" | "guest";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, roles: [], isAdmin: false, loading: true, signOut: async () => {},
});

const AUTH_TIMEOUT_MS = 8000; // Safety timeout: 8 seconds max loading

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: never stay loading forever
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[Auth] Safety timeout reached, forcing loading=false");
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    async function handleSession(sess: Session | null) {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        await fetchRoles(sess.user.id, mounted);
      } else {
        setRoles([]);
      }
      if (mounted) setLoading(false);
    }

    // Get initial session first
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      initializedRef.current = true;
      await handleSession(initialSession);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      // Skip if this fires before getSession completes (initial event)
      if (!initializedRef.current) return;
      setLoading(true);
      await handleSession(sess);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchRoles(uid: string, mounted: boolean) {
    try {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (data && !error && mounted) {
        setRoles(data.map((r) => r.role as Role));
      }
    } catch (e) {
      console.error("Erro ao carregar permissões:", e);
    }
  }

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        roles,
        isAdmin: roles.includes("admin"),
        loading,
        signOut: async () => {
          setRoles([]);
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
