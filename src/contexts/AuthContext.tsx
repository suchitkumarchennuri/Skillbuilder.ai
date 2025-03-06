import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;

          const currentUser = session?.user ?? null;
          setUser(currentUser);

          if (currentUser) {
            try {
              // Update user data in database
              const { error: upsertError } = await supabase
                .from('users')
                .upsert({
                  id: currentUser.id,
                  email: currentUser.email,
                  full_name: currentUser.user_metadata.full_name || '',
                  updated_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (upsertError) throw upsertError;

              // Only navigate if we're not already on the dashboard
              if (!window.location.pathname.startsWith('/dashboard')) {
                navigate('/dashboard');
              }
            } catch (error) {
              console.error('Error updating user data:', error);
            }
          } else if (event === 'SIGNED_OUT') {
            // Only navigate if we're not already on the home page
            if (window.location.pathname !== '/') {
              navigate('/');
            }
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Explicitly set user state
      if (data.user) {
        setUser(data.user);
        navigate('/dashboard');
      }
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(authError.message);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return {
          success: false,
          message: error.message
        };
      }

      if (!data.user) {
        return {
          success: false,
          message: 'Failed to create user account'
        };
      }

      // Create user profile in the database
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return {
          success: false,
          message: 'Account created but failed to set up profile'
        };
      }

      return {
        success: true,
        message: 'Account created successfully! Please sign in.'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create account'
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      // Force sign out on error
      setUser(null);
      navigate('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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