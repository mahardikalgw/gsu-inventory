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

  // Simple profile fetch function with timeout and retry
  const fetchProfile = async (userId: string, retries = 2): Promise<Profile | null> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 15000); // 15 second timeout
        });

        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        if (error) {
          console.error(`Error fetching profile (attempt ${attempt + 1}):`, error);
          if (attempt === retries) return null;
          continue;
        }

        return data;
      } catch (error) {
        console.error(`Exception fetching profile (attempt ${attempt + 1}):`, error);
        if (attempt === retries) return null;
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    return null;
  };

  // Create profile if it doesn't exist
  const createProfile = async (userId: string, fullName: string, phone?: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          role: 'staff',
          phone: phone || '',
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

  // Load profile for user
  const loadProfile = async (userId: string): Promise<boolean> => {
    try {
      let userProfile = await fetchProfile(userId);
      
      if (!userProfile) {
        // Try to create a default profile
        userProfile = await createProfile(userId, 'User', '');
      }
      
      setProfile(userProfile);
      return true;
    } catch (error) {
      console.error('Error loading profile:', error);
      
      // Create a temporary profile as fallback
      const tempProfile: Profile = {
        id: 'temp',
        user_id: userId,
        full_name: 'User',
        role: 'staff',
        phone: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setProfile(tempProfile);
      return false;
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  // Initialize auth state
  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        
        // Load profile with timeout protection
        try {
          await loadProfile(session.user.id);
        } catch (error) {
          console.error('Failed to load profile during initialization:', error);
          // Continue without profile - user can still use the app
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      // Reset state on error
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Auth state change handler
  const handleAuthChange = async (event: string, session: Session | null) => {
    console.log('Auth state changed:', event);
    
    // Don't process if we're still in initial loading
    if (loading && event === 'INITIAL_SESSION') {
      return;
    }
    
    setSession(session);
    setUser(session?.user ?? null);
    
    if (session?.user) {
      try {
        await loadProfile(session.user.id);
      } catch (error) {
        console.error('Failed to load profile during auth change:', error);
        // Continue without profile - user can still use the app
      }
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    // Initialize auth state first
    initializeAuth();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // Sign out
  const signOut = async () => {
    // Clear local state immediately
    setUser(null);
    setSession(null);
    setProfile(null);
    
    // Sign out from Supabase
    await supabase.auth.signOut();
  };

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Tidak ada pengguna yang login') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
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