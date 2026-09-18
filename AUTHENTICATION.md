# StudyNotes authentication setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. In Authentication, enable Email provider and choose whether email confirmation is required.

## Google sign-in

The portal now supports Google sign-in through the existing Supabase client. No service-role key belongs in the repository.

### Dashboard configuration

1. In Google Cloud Console, create or select a project.
2. Configure the OAuth consent screen with the StudyNotes application details.
3. Create an OAuth client of type **Web application**.
4. Add these Authorized JavaScript origins:
	- `https://ashishzope-1996.github.io`
	- `http://localhost:5500`
	- `http://127.0.0.1:5500`
	Add the actual Live Server port too if it differs.
5. In Supabase, open **Authentication > Providers > Google**, enable Google, and paste the Google client ID and client secret.
6. Copy the Supabase callback URL shown on the Google provider screen into Google Cloud Console as an Authorized redirect URI. It is normally:
	`https://<project-ref>.supabase.co/auth/v1/callback`
7. In **Authentication > URL Configuration**, set the Site URL to:
	`https://ashishzope-1996.github.io/StudyPortal/`
8. Add these Redirect URLs:
	- `https://ashishzope-1996.github.io/StudyPortal/profile.html`
	- `https://ashishzope-1996.github.io/StudyPortal/**`
	- `http://localhost:5500/StudyPortal/profile.html`
	- `http://localhost:5500/StudyPortal/**`
	- `http://127.0.0.1:5500/StudyPortal/profile.html`
	- `http://127.0.0.1:5500/StudyPortal/**`
	If the folder or port differs locally, add that exact profile URL as well.

The sign-in button uses `supabase.auth.signInWithOAuth({ provider: 'google' })`. Existing email/password users are not duplicated by the profile trigger because `profiles.user_id` remains the unique identity. Supabase may require account linking or a provider-link flow when an email/password account and Google identity already exist separately; do not create a second user manually. Enable Supabase account linking according to the project’s Auth provider settings if that scenario is required.

The client reads the cached session with `getSession()` and synchronizes the profile only on initial session/sign-in, not on every token refresh. This avoids repeated auth/profile requests and reduces the chance of HTTP 429 responses.

### Verification checklist

- Email/password sign-in and sign-up still work.
- Google sign-in works for a first-time user and a returning user.
- A Google user receives one `profiles` row with `user_id = auth.users.id`.
- Name, email, avatar URL, and provider metadata are populated when supplied by Google.
- Logout, refresh, session expiry, profile, reading history, and quiz history still work.
- Test desktop, tablet, 375px mobile, GitHub Pages, localhost, and `127.0.0.1` URLs.
- Test cancellation, disabled provider, bad redirect, network failure, and rate limiting.
- Confirm RLS prevents one authenticated user from reading or writing another user’s profile.
