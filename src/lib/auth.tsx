import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) {
        setLoading(true);
        await fetchRoles(sess.user.id);
        setLoading(false);
      } else {
        setRoles([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        setLoading(true);
        await fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchRoles(uid: string) {
    try {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (data && !error) {
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
        isAdmin: roles.includes("admin") || session?.user?.email === "contatopriveloja@gmail.com" || session?.user?.email === "thiago@qrztech.com",
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
