import { getAuthRedirect, getCurrentUser, getPostAuthRedirect, supabase, supabaseConfigured } from './supabase.js';

let profileSyncPromise = null;

const friendlyError = error => {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('rate limit') || message.includes('too many requests') || error?.status === 429) return 'Too many signup attempts were made recently. Wait a few minutes before trying again, then use a new email address.';
  if (message.includes('invalid login credentials')) return 'The email or password is incorrect.';
  if (message.includes('user already registered')) return 'An account with this email already exists.';
  if (message.includes('email not confirmed')) return 'Please verify your email before signing in.';
  if (message.includes('provider is not enabled') || message.includes('unsupported provider')) return 'Google sign-in is not enabled for this project yet.';
  if (message.includes('access_denied') || message.includes('cancel')) return 'Google sign-in was cancelled. You can try again or use email and password.';
  if (message.includes('redirect') || message.includes('oauth')) return 'Unable to complete Google sign-in. Please try again.';
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

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getPostAuthRedirect(), queryParams: { access_type: 'offline', prompt: 'select_account' } }
  });
  if (error) throw error;
  return data;
}

export async function syncUserProfile(user) {
  if (!supabase || !user || profileSyncPromise) return profileSyncPromise;
  const metadata = user.user_metadata || {};
  const profile = {
    user_id: user.id,
    email: user.email || null,
    full_name: metadata.full_name || metadata.name || null,
    avatar_url: metadata.avatar_url || metadata.picture || null,
    updated_at: new Date().toISOString(),
    last_login_at: new Date().toISOString()
  };
  profileSyncPromise = supabase.from('profiles').upsert(profile, { onConflict: 'user_id' }).then(({ error }) => {
    if (error) { console.warn('Profile synchronization failed.', error); throw new Error('PROFILE_SYNC_FAILED'); }
    return profile;
  }).finally(() => { profileSyncPromise = null; });
  return profileSyncPromise;
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
  if (user) syncUserProfile(user).catch(() => {});
  renderAuthState(user);
  supabase.auth.onAuthStateChange((event, session) => {
    const nextUser = session?.user || null;
    renderAuthState(nextUser);
    if (nextUser && ['SIGNED_IN', 'INITIAL_SESSION'].includes(event)) syncUserProfile(nextUser).catch(() => {});
  });
}
