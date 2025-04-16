import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase, handleSupabaseError, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const location = useLocation();

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not properly configured');
      setLoading(false);
      return;
    }

    let mounted = true;

    async function initializeAuth() {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // Handle session error gracefully
          console.debug('No active session found');
          setUser(null);
          setLoading(false);
          return;
        }
        
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
                }, {
                  onConflict: 'id'
                })
                .select()
                .single();

              if (upsertError) {
                // Log error but don't throw - this shouldn't block the auth flow
                console.debug('Error updating user data:', handleSupabaseError(upsertError));
              }

              // Only navigate to dashboard if coming from login or signup
              if (location.pathname === '/login') {
                navigate('/dashboard');
              }
            } catch (error) {
              // Log error but don't throw - this shouldn't block the auth flow
              console.debug('Error updating user data:', handleSupabaseError(error));
            }
          } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            // Handle sign out and token refresh events
            if (event === 'SIGNED_OUT') {
              navigate('/');
            }
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.debug('Error initializing auth:', handleSupabaseError(error));
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
  }, [navigate, location]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Authentication service is not properly configured');
    }

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
      throw new Error(handleSupabaseError(authError));
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Authentication service is not properly configured'
      };
    }

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
          message: handleSupabaseError(error)
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
        console.debug('Error creating user profile:', handleSupabaseError(profileError));
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
      console.debug('Sign up error:', handleSupabaseError(error));
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create account'
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      // Clear any stored tokens
      localStorage.removeItem('sb-' + new URL(supabase.supabaseUrl).hostname + '-auth-token');
      navigate('/');
    } catch (error) {
      console.debug('Sign out error:', handleSupabaseError(error));
      // Force sign out on error
      setUser(null);
      localStorage.removeItem('sb-' + new URL(supabase.supabaseUrl).hostname + '-auth-token');
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