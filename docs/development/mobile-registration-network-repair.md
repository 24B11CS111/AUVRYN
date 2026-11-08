# Mobile Registration Network Repair

## Root Cause

The mobile client fell back to `https://edu-platform-demo.supabase.co` and a dummy key whenever `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` was absent. Neither variable is set in the local process, and no local `.env` file exists; the checked-in `.env.example` contains placeholders. The fallback hostname failed DNS resolution, so signup failed before any request could reach Supabase Auth. This is a network/configuration failure, not an Auth rejection.

The EAS preview/production environment variable listing could not be read from this workspace because the CLI reported a project-link/configuration access issue. Therefore it is not possible to confirm whether the already-installed APK was built with those variables or the fallback. No real Supabase URL or public key was available for a live Auth request.

## Changes


No service-role key is referenced by mobile code. Expo public variables are read with direct `process.env.EXPO_PUBLIC_*` references for build-time inlining. The preview and production EAS profiles select their corresponding EAS environments; those environments still need to contain the real project URL and public anon/publishable key.
The EAS preview/production environment variable listing could not be read from this workspace because the CLI reports a project-link/access issue. The preview profile explicitly selects the `preview` EAS environment, but the remote values and whether they were present at the APK's build time cannot be verified here. Expo public variables are embedded during bundling; adding them in the dashboard does not update an already-built APK. No real Supabase URL or public key was available for a live Auth request.

## Validation
The preview and production EAS profiles select their corresponding EAS environments. The app logs only whether each variable is present and whether the URL/key pass format checks; it never logs either value. The dashboard variables still need to exist in the linked project's `preview` environment before producing a replacement APK.

 Android production JS bundle: passed with 613 modules. With the local variables absent, the bundle includes the diagnostic/configuration error and neither the demo URL nor dummy key.
- Generated Android manifest includes `android.permission.INTERNET`.
 Registration/config unit tests: 8 passed; all signup calls use mocked clients, not Supabase.
- Android production JS bundle: passed with 613 modules. With variables absent, the bundle contains the configuration error and neither the demo URL nor dummy key.
 No live signup was performed. A working account-creation APK requires the actual Supabase project URL and public anon/publishable key to be present in the linked EAS project's preview environment, followed by a new APK build and install. The EAS CLI access issue must be resolved to verify the remote environment here.
- Shared workspace build hook: passed for all four shared packages.
- Registration/config unit tests: 7 passed; all signup calls use mocked clients, not Supabase.
- No live signup was performed. A working account-creation APK requires the actual Supabase project URL and public anon/publishable key to be added to EAS preview (and production if used), followed by a new APK build and install.

No EAS cloud build was started.
