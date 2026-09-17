import { getAuthRedirect, getCurrentUser, supabase, supabaseConfigured } from './supabase.js';

const friendlyError = error => {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('rate limit') || message.includes('too many requests') || error?.status === 429) return 'Too many signup attempts were made recently. Wait a few minutes before trying again, then use a new email address.';
  if (message.includes('invalid login credentials')) return 'The email or password is incorrect.';
  if (message.includes('user already registered')) return 'An account with this email already exists.';
  if (message.includes('email not confirmed')) return 'Please verify your email before signing in.';
  if (message.includes('password')) return 'Use a stronger password and try again.';
  return 'Something went wrong. Please try again.';
};

export const authError = friendlyError;

export async function signUpUser(fullName, email, password) {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}signin.html` } });
  if (error) throw error;
  return data;
}

export async function signInUser(email, password) {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  window.location.href = './index.html';
}

export async function requestPasswordReset(email) {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}reset-password.html` });
  if (error) throw error;
}

export async function updatePassword(password) {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = `./signin.html?redirect=${encodeURIComponent(getAuthRedirect())}`;
    return null;
  }
  return user;
}

function renderAuthState(user) {
  const slot = document.querySelector('[data-auth-slot]');
  if (!slot) return;
  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account';
    slot.innerHTML = `<a class="auth-account" href="./profile.html" aria-label="Open your profile"><span class="auth-avatar">${name.charAt(0).toUpperCase()}</span><span>${name}</span></a><button type="button" class="auth-signout" data-auth-signout>Sign out</button>`;
    slot.querySelector('[data-auth-signout]').addEventListener('click', () => signOutUser().catch(() => {}));
  } else {
    slot.innerHTML = '<a class="auth-link" href="./signin.html">Sign in</a><a class="button button-primary auth-cta" href="./signup.html">Create account</a>';
  }
}

export async function initAuthShell() {
  renderAuthState(null);
  if (!supabaseConfigured || !supabase) return;
  const user = await getCurrentUser().catch(() => null);
  renderAuthState(user);
  supabase.auth.onAuthStateChange((_event, session) => renderAuthState(session?.user || null));
}
