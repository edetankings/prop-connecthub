import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  profile_type: "buyer" | "agent" | "builder";
  phone: string | null;
  phone_verified?: boolean;
  phone_verified_at?: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  trust_score: number;
  kyc_verified: boolean;
  properties_listed: number;
  completed_transactions: number;
  welcome_seen: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, profileType: string, phone: string, referralCode?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const activeUserId = useRef<string | null>(null);
  const authRevision = useRef(0);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (activeUserId.current === userId) setProfile(data as Profile | null);
  };

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (activeUserId.current === userId) setIsAdmin(data === true);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await checkAdmin(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        authRevision.current += 1;
        const changed = activeUserId.current !== (session?.user.id ?? null);
        activeUserId.current = session?.user.id ?? null;
        if (changed) { setProfile(null); setIsAdmin(false); setLoading(!!session?.user); }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid deadlock with Supabase auth
          setTimeout(async () => {
            if (activeUserId.current !== session.user.id) return;
            await fetchProfile(session.user.id);
            await checkAdmin(session.user.id);
            if (activeUserId.current === session.user.id) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    const initialRevision = authRevision.current;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (authRevision.current !== initialRevision) return;
      activeUserId.current = session?.user.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() =>
          checkAdmin(session.user.id).then(() => { if (activeUserId.current === session.user.id) setLoading(false); })
        );
      } else {
        setLoading(false);
      }
    }).catch(() => { if (authRevision.current === initialRevision) { setProfile(null); setIsAdmin(false); setLoading(false); } });

    return () => { authRevision.current += 1; activeUserId.current = null; subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, profileType: string, phone: string, referralCode?: string) => {
    if (!["buyer", "agent", "builder"].includes(profileType)) throw new Error("Select a valid account type.");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, profile_type: profileType, phone, referral_code: referralCode },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    // referral_code is included in user metadata above and is processed by the
    // handle_new_user + auto_place_referral DB triggers (matrix placement).
    // Do NOT update referred_by from the client — that would overwrite the matrix slot.

    toast.success("Check your email to verify your account!");
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    supabase.rpc("touch_last_login" as any).then(() => {});
    toast.success("Welcome back!");
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setIsAdmin(false);
    toast.info("Signed out successfully");
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
