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
  ? createClient(supabaseUrl, supabaseKey)
  : null;
