# StudyNotes authentication setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. In Authentication, enable Email provider and choose whether email confirmation is required.
4. Set the Site URL to the deployed StudyPortal URL.
5. Add the deployed URL and local Live Server URLs such as `http://127.0.0.1:5500/**` and `http://localhost:5500/**` to Redirect URLs.
6. Copy the project URL and public publishable/anon key into `assets/js/supabase.js`.
7. Never use a `service_role` key in this static site.

Until the two placeholders are replaced, the portal remains fully usable as a public static site and account controls stay in their signed-out state.
