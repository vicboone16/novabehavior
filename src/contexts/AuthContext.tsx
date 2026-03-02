import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';

export type AppRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_approved: boolean | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: AppRole | null;
  roleLoading: boolean; // True while role is being fetched
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>; // Force refresh role from database
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const resolveHighestRole = (roles: string[]): AppRole => {
    if (roles.includes('super_admin')) return 'super_admin';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('staff')) return 'staff';
    return 'viewer';
  };

  const fetchUserDetails = async (userId: string) => {
    setRoleLoading(true);
    try {
      // Fetch profile - explicitly exclude pin_hash for security
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, email, phone, is_approved, approved_at, approved_by, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch roles - user can have multiple rows (e.g. admin + super_admin)
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error fetching role:', roleError);
        setUserRole('staff');
      } else {
        const roles = (roleRows || []).map((r: any) => r.role as string);
        setUserRole(roles.length > 0 ? resolveHighestRole(roles) : 'staff');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setRoleLoading(false);
    }
  };

  // Explicit function to refresh role from database
  const refreshRole = async () => {
    if (!user) return;
    setRoleLoading(true);
    try {
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (!roleError) {
        const roles = (roleRows || []).map((r: any) => r.role as string);
        setUserRole(roles.length > 0 ? resolveHighestRole(roles) : 'staff');
      }
    } catch (error) {
      console.error('Error refreshing role:', error);
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential race conditions with Supabase
          setTimeout(() => {
            fetchUserDetails(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserDetails(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Clear any active session state before signing out so the timer
    // doesn't persist or auto-resume on the next login.
    try {
      useDataStore.getState().forceEndAllSessions();
    } catch (e) {
      console.warn('[Auth] Could not clear session state on sign out:', e);
    }
    setProfile(null);
    setUserRole(null);
    setRoleLoading(true);
    await supabase.auth.signOut();
  };

  // Clear session timer state whenever the authenticated user changes (login/logout/switch)
  useEffect(() => {
    if (user) {
      // A new user just logged in - always start with a clean timer slate
      // so one user's active session never bleeds into another's view
      try {
        const store = useDataStore.getState();
        if (store.sessionStartTime) {
          console.log('[Auth] New user login - clearing lingering session timer state');
          store.forceEndAllSessions();
        }
      } catch (e) {
        console.warn('[Auth] Could not clear session state on login:', e);
      }
    }
  }, [user?.id]); // only fires when the actual user ID changes

  return (
    <AuthContext.Provider value={{ user, session, profile, userRole, roleLoading, loading, signUp, signIn, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
