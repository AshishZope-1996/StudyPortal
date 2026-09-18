import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Replace these two public values with the Supabase project settings.
export const SUPABASE_URL = 'https://zvvjcijymxceaisegqtj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GlJdYLu_JWRIcH_gcc3D8w_tnT8uB6l';
export const supabaseConfigured = !SUPABASE_URL.includes('YOUR_PROJECT') && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user || null;
  return user || null;
}

export function getAuthRedirect() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

export function getPostAuthRedirect() {
  const requested = new URLSearchParams(window.location.search).get('redirect');
  if (requested && requested.startsWith(window.location.origin)) return requested;
  return `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}profile.html`;
}
