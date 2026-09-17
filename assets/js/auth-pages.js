import { authError, requestPasswordReset, signInUser, signUpUser, updatePassword } from './auth.js';
import { getCurrentUser } from './supabase.js';

const form = document.querySelector('form');
const message = document.querySelector('#auth-message');
const show = (text, type = 'info') => { message.hidden = false; message.className = `auth-message ${type}`; message.textContent = text; };
const setBusy = busy => { const button = form?.querySelector('button[type="submit"]'); if (button) { button.disabled = busy; button.dataset.label ||= button.textContent; button.textContent = busy ? 'Working...' : button.dataset.label; } };
const redirect = () => new URLSearchParams(location.search).get('redirect') || './profile.html';

if (location.pathname.endsWith('/signin.html')) {
  form.addEventListener('submit', async event => { event.preventDefault(); setBusy(true); const data = new FormData(form); try { await signInUser(data.get('email').trim(), data.get('password')); location.href = redirect(); } catch (error) { show(authError(error), 'error'); setBusy(false); } });
}
if (location.pathname.endsWith('/signup.html')) {
  form.addEventListener('submit', async event => { event.preventDefault(); const data = new FormData(form); if (data.get('password') !== data.get('confirmPassword')) return show('Passwords do not match.', 'error'); setBusy(true); try { const result = await signUpUser(data.get('fullName').trim(), data.get('email').trim(), data.get('password')); show(result.session ? 'Account created. Redirecting...' : 'Account created. Check your email to verify it, then sign in.', 'success'); if (result.session) window.setTimeout(() => { location.href = './profile.html'; }, 700); } catch (error) { show(authError(error), 'error'); } finally { setBusy(false); } });
}
if (location.pathname.endsWith('/forgot-password.html')) {
  form.addEventListener('submit', async event => { event.preventDefault(); setBusy(true); try { await requestPasswordReset(new FormData(form).get('email').trim()); show('If an account exists for that email, a reset link is on its way.', 'success'); } catch (error) { show(authError(error), 'error'); } finally { setBusy(false); } });
}
if (location.pathname.endsWith('/reset-password.html')) {
  getCurrentUser().catch(() => null);
  form.addEventListener('submit', async event => { event.preventDefault(); const data = new FormData(form); if (data.get('password') !== data.get('confirmPassword')) return show('Passwords do not match.', 'error'); setBusy(true); try { await updatePassword(data.get('password')); show('Password updated. You can now sign in.', 'success'); window.setTimeout(() => { location.href = './signin.html'; }, 900); } catch (error) { show(authError(error), 'error'); } finally { setBusy(false); } });
}
