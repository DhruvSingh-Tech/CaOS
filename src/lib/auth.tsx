import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile, UserRole } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { dataService } from '../services/dataService';

interface AuthContextType {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
  isConfigured: boolean;
  allStudents: UserProfile[];
  signInWithOtp: (email: string) => Promise<{ error: any }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithPassword: (
    email: string,
    password: string,
    name: string,
    rollNo: string,
    labGroup?: 'Group B2-A' | 'Group B2-B' | 'all'
  ) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<{ error?: any }>;
  updateUserLabGroup: (labGroup: 'Group B2-A' | 'Group B2-B' | 'all') => Promise<{ error?: any }>;
  refreshRoster: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);

  const supabase = getSupabaseClient();
  const isConfigured = isSupabaseConfigured();

  // Load user profile from Supabase
  const fetchProfile = async (
    userId: string,
    userEmail?: string,
    userMetadata?: any
  ): Promise<UserProfile | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile not found, create new real profile in Supabase
        const isSuperAdminEmail =
          userEmail?.toLowerCase() === 'dhruvsingh.true@gmail.com' ||
          userEmail?.toLowerCase() === 'admin.usar.ggsipu@gmail.com' ||
          userEmail?.toLowerCase().startsWith('admin@');
        const initialRole: UserRole = isSuperAdminEmail ? 'admin' : 'student';

        const savedGroup = (typeof window !== 'undefined' ? localStorage.getItem('caos_user_lab_group') : null) as any;
        const displayName =
          userMetadata?.full_name ||
          userMetadata?.name ||
          (userEmail ? userEmail.split('@')[0] : 'Student');
        const avatarUrl =
          userMetadata?.avatar_url ||
          userMetadata?.picture ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

        const newProfile: UserProfile = {
          id: userId,
          email: userEmail || '',
          name: displayName,
          role: initialRole,
          rollNo: `26AR${Math.floor(10 + Math.random() * 89)}`,
          classBatch: 'USAR AR-1 B2',
          avatarUrl,
          labGroup: savedGroup || 'Group B2-A',
        };

        await supabase.from('user_profiles').insert({
          id: userId,
          email: newProfile.email,
          name: newProfile.name,
          role: newProfile.role,
          roll_no: newProfile.rollNo,
          class_id: '32a7c369-f80a-4a14-8afd-de3c6bd5cee0',
          avatar_url: newProfile.avatarUrl,
          lab_group: newProfile.labGroup,
        });

        return newProfile;
      }

      if (data) {
        const savedGroup = (typeof window !== 'undefined' ? localStorage.getItem('caos_user_lab_group') : null) as any;
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role as UserRole,
          rollNo: data.roll_no,
          classBatch: data.role === 'admin' ? 'Super Admin / Academic Dean' : 'USAR AR-1 B2',
          classId: data.class_id,
          avatarUrl: data.avatar_url,
          labGroup: data.lab_group || savedGroup || 'Group B2-A',
          createdAt: data.created_at,
        };
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
    return null;
  };

  // Fetch full class roster for CR and Admin
  const refreshRoster = async () => {
    if (!supabase) {
      setAllStudents([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('name', { ascending: true });

      if (data && data.length > 0) {
        setAllStudents(
          data.map((d: any) => ({
            id: d.id,
            name: d.name,
            email: d.email,
            role: d.role as UserRole,
            rollNo: d.roll_no,
            classBatch: d.role === 'admin' ? 'Dean / Super Admin' : 'USAR AR-1 B2',
            classId: d.class_id,
            avatarUrl: d.avatar_url,
            createdAt: d.created_at,
          }))
        );
      } else {
        setAllStudents([]);
      }
    } catch (e) {
      console.error('Error fetching roster:', e);
      setAllStudents([]);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      const profile = await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
      if (profile) setUser(profile);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      dataService.setCurrentUserId(null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        dataService.setCurrentUserId(session.user.id);
        const profile = await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
        setUser(
          profile || {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
            email: session.user.email,
            role: 'student',
            classBatch: 'USAR AR-1 B2',
          }
        );
        await refreshRoster();
      } else {
        setUser(null);
        dataService.setCurrentUserId(null);
        setAllStudents([]);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          dataService.setCurrentUserId(newSession.user.id);
          const profile = await fetchProfile(newSession.user.id, newSession.user.email, newSession.user.user_metadata);
          setUser(profile);
          await refreshRoster();
        } else {
          setUser(null);
          dataService.setCurrentUserId(null);
          setAllStudents([]);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  // Magic link login
  const signInWithOtp = async (email: string) => {
    if (!supabase) return { error: new Error('Supabase is not configured') };
    const redirectUrl =
      typeof window !== 'undefined' && window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://caos-edu.vercel.app';

    const res = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return res;
  };

  // Password login
  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase is not configured') };
    const res = await supabase.auth.signInWithPassword({ email, password });
    return res;
  };

  // Sign up with password + create profile
  const signUpWithPassword = async (
    email: string,
    password: string,
    name: string,
    rollNo: string,
    labGroup: 'Group B2-A' | 'Group B2-B' | 'all' = 'Group B2-A'
  ) => {
    if (!supabase) return { error: new Error('Supabase is not configured') };
    const redirectUrl =
      typeof window !== 'undefined' && window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://caos-edu.vercel.app';

    const res = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name, roll_no: rollNo, lab_group: labGroup },
      },
    });

    if (res.data?.user && !res.error) {
      try {
        const isSuperAdminEmail =
          email.toLowerCase() === 'dhruvsingh.true@gmail.com' ||
          email.toLowerCase() === 'admin.usar.ggsipu@gmail.com' ||
          email.toLowerCase().startsWith('admin@');
        const role: UserRole = isSuperAdminEmail ? 'admin' : 'student';

        if (typeof window !== 'undefined') {
          localStorage.setItem('caos_user_lab_group', labGroup);
        }

        await supabase.from('user_profiles').insert({
          id: res.data.user.id,
          name,
          email,
          role,
          roll_no: rollNo,
          class_id: '32a7c369-f80a-4a14-8afd-de3c6bd5cee0',
          lab_group: labGroup,
        });
      } catch (err) {
        console.warn('Profile creation error during signup:', err);
      }
    }

    return res;
  };

  // Google OAuth
  const signInWithGoogle = async () => {
    if (!supabase) return { error: new Error('Supabase is not configured') };
    const redirectUrl =
      typeof window !== 'undefined' && window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://caos-edu.vercel.app';

    const res = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    return res;
  };

  // Sign out
  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
  };

  // Admin/CR action: Promote or change user role in Supabase
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!supabase) {
      return { error: new Error('Database connection required') };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      await refreshRoster();
      if (user?.id === userId) {
        await refreshProfile();
      }
      return {};
    } catch (err: any) {
      return { error: err };
    }
  };

  // Student / CR / Admin: Update preferred Lab Group
  const updateUserLabGroup = async (labGroup: 'Group B2-A' | 'Group B2-B' | 'all') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('caos_user_lab_group', labGroup);
    }

    if (user) {
      setUser({ ...user, labGroup });
    }

    if (supabase && user?.id) {
      try {
        await supabase
          .from('user_profiles')
          .update({ lab_group: labGroup, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (err) {
        console.warn('Could not sync lab_group to Supabase:', err);
      }
    }

    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured,
        allStudents,
        signInWithOtp,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        signOut,
        updateUserRole,
        updateUserLabGroup,
        refreshRoster,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
