import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: 'admin' | 'staff';
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, retries = 2): Promise<Profile | null> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
        );

        const request = new Promise<{ data: Profile | null }>((resolve, reject) => {
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single()
            .then(({ data, error }) => {
              if (error) reject(error);
              else resolve({ data });
            })
        });

        const { data } = await Promise.race([timeout, request]);
        return data;
      } catch (error) {
        console.error(`Fetch profile attempt ${attempt + 1} failed:`, error);
        if (attempt === retries) return null;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    return null;
  };

  const createProfile = async (userId: string, fullName: string, phone?: string): Promise<Profile | null> => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          role: 'staff',
          phone: phone || '',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating profile:', error);
      return null;
    }
  };

  const loadProfile = async (userId: string): Promise<boolean> => {
    try {
      let userProfile = await fetchProfile(userId);
      if (!userProfile) {
        userProfile = await createProfile(userId, 'User', '');
      }
      setProfile(userProfile);
      return true;
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile({
        id: 'temp',
        user_id: userId,
        full_name: 'User',
        role: 'staff',
        phone: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const handleAuthChange = async (event: string, session: Session | null) => {
    console.log('🔥 Auth state changed:', event, session);
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      try {
        await loadProfile(session.user.id);
      } catch (error) {
        console.error('Failed to load profile during auth change:', error);
      }
    } else {
      setProfile(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          await handleAuthChange('INITIAL_SESSION', session);
        }
      } catch (err) {
        console.error('Error during getSession:', err);
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) handleAuthChange(event, session);
    });

    // Fallback: if loading stuck
    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 15000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Tidak ada pengguna yang login') };

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: now })
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => (prev ? { ...prev, ...updates, updated_at: now } : null));
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
