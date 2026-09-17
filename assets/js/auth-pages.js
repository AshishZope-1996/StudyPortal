import { authError, requestPasswordReset, signInUser, signUpUser, updatePassword } from './auth.js';
import { getCurrentUser } from './supabase.js';

const form = document.querySelector('form');
const message = document.querySelector('#auth-message');
const show = (text, type = 'info') => { if (!message) return; message.hidden = false; message.className = `auth-message ${type}`; message.textContent = text; };
const setBusy = busy => { const button = form?.querySelector('button[type="submit"]'); if (button) { button.disabled = busy; button.dataset.label ||= button.textContent; button.textContent = busy ? 'Working...' : button.dataset.label; } };
const redirect = () => new URLSearchParams(location.search).get('redirect') || './profile.html';
const fieldError = (input, text) => {
  const value = input?.value?.trim() || '';
  if (!input) return;
  input.setAttribute('aria-invalid', 'true');
  if (text) {
    input.dataset.error = text;
    input.setCustomValidity(text);
    input.reportValidity();
  }
  if (!text && input.dataset.error) {
    delete input.dataset.error;
    input.setCustomValidity('');
  }
};

const setupPasswordToggle = () => {
  document.querySelectorAll('.password-toggle').forEach(wrapper => {
    const input = wrapper.querySelector('input');
    const button = wrapper.querySelector('button');
    if (!input || !button) return;
    button.addEventListener('click', () => {
      const showPassword = input.type === 'password';
      input.type = showPassword ? 'text' : 'password';
      button.textContent = showPassword ? 'Hide' : 'Show';
      button.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
      input.focus();
    });
  });
};

setupPasswordToggle();

if (location.pathname.endsWith('/signin.html')) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const emailInput = form.querySelector('[name="email"]');
    const passwordInput = form.querySelector('[name="password"]');
    if (!email || !/\S+@\S+\.\S+/.test(email)) { fieldError(emailInput, 'Enter a valid email address.'); show('Enter a valid email address.', 'error'); return; }
    if (!password || password.length < 8) { fieldError(passwordInput, 'Password must contain at least 8 characters.'); show('Password must contain at least 8 characters.', 'error'); return; }
    fieldError(emailInput, '');
    fieldError(passwordInput, '');
    setBusy(true);
    try { await signInUser(email, password); location.href = redirect(); } catch (error) { show(authError(error), 'error'); setBusy(false); }
  });
}
if (location.pathname.endsWith('/signup.html')) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const fullName = String(data.get('fullName') || '').trim();
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');
    const nameInput = form.querySelector('[name="fullName"]');
    const emailInput = form.querySelector('[name="email"]');
    const passwordInput = form.querySelector('[name="password"]');
    const confirmInput = form.querySelector('[name="confirmPassword"]');
    if (!fullName) { fieldError(nameInput, 'Please add your full name.'); show('Please add your full name.', 'error'); return; }
    if (!email || !/\S+@\S+\.\S+/.test(email)) { fieldError(emailInput, 'Enter a valid email address.'); show('Enter a valid email address.', 'error'); return; }
    if (password.length < 8) { fieldError(passwordInput, 'Password must contain at least 8 characters.'); show('Password must contain at least 8 characters.', 'error'); return; }
    if (password !== confirmPassword) { fieldError(confirmInput, 'Passwords do not match.'); show('Passwords do not match.', 'error'); return; }
    fieldError(nameInput, ''); fieldError(emailInput, ''); fieldError(passwordInput, ''); fieldError(confirmInput, '');
    setBusy(true);
    try { const result = await signUpUser(fullName, email, password); show(result.session ? 'Account created. Redirecting...' : 'Check your email to verify your account, then sign in.', 'success'); if (result.session) window.setTimeout(() => { location.href = './profile.html'; }, 700); } catch (error) { show(authError(error), 'error'); } finally { setBusy(false); }
  });
}
if (location.pathname.endsWith('/forgot-password.html')) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const email = String(new FormData(form).get('email') || '').trim();
    const emailInput = form.querySelector('[name="email"]');
    if (!email || !/\S+@\S+\.\S+/.test(email)) { fieldError(emailInput, 'Enter a valid email address.'); show('Enter a valid email address.', 'error'); return; }
    fieldError(emailInput, '');
    setBusy(true);
    try { await requestPasswordReset(email); show('If an account exists for that email, a reset link is on its way.', 'success'); } catch (error) { show(authError(error), 'error'); } finally { setBusy(false); }
  });
}
if (location.pathname.endsWith('/reset-password.html')) {
  getCurrentUser().catch(() => null);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const password = String(data.get('password') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');
    const passwordInput = form.querySelector('[name="password"]');
    const confirmInput = form.querySelector('[name="confirmPassword"]');
    if (password.length < 8) { fieldError(passwordInput, 'Password must contain at least 8 characters.'); show('Password must contain at least 8 characters.', 'error'); return; }
    if (password !== confirmPassword) { fieldError(confirmInput, 'Passwords do not match.'); show('Passwords do not match.', 'error'); return; }
    fieldError(passwordInput, ''); fieldError(confirmInput, '');
    setBusy(true);
    try { await updatePassword(password); show('Password updated successfully. You can now sign in.', 'success'); window.setTimeout(() => { location.href = './signin.html'; }, 900); } catch (error) { show(authError(error), 'error'); } finally { setBusy(false); }
  });
}
