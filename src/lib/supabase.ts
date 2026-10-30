import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  '';

const supabaseKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl !== 'https://YOUR_PROJECT_REF.supabase.co' &&
  !supabaseUrl.includes('YOUR_PROJECT')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Initiates Google OAuth Sign-In via Supabase
 */
export async function signInWithGoogle(): Promise<{ url: string | null }> {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const redirectUrl = `${window.location.origin}/app`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });

  if (error) {
    throw error;
  }

  return { url: data.url };
}

/**
 * Sign out of active Supabase Auth session
 */
export async function signOutFromSupabase(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
}
