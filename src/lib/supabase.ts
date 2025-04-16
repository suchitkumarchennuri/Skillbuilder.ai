import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Ensure URL is valid before creating client
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('Invalid Supabase URL format. Please check your .env file.');
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      storageKey: 'skillbridge_auth_token',
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'x-client-info': 'skillbridge-ai/1.0.0',
      },
    },
  }
);

// Add error handling utilities
export const handleSupabaseError = (error: any): string => {
  if (error?.message?.includes('Invalid API key')) {
    return 'Authentication error. Please check your Supabase configuration.';
  }
  return error?.message || 'An unexpected error occurred';
};

// Add helper for checking if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};