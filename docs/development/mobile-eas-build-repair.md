# Mobile EAS Build Investigation & Configuration Verification

**Date:** 2026-11-11  
**Target EAS Account:** `school0730`  
**Target EAS Project:** `edu-platform-mobile` (`@school0730/edu-platform-mobile`)  
**Target EAS Project ID:** `bbf92a69-9c4f-4395-9d10-69c0893ecb69`  
**Target Android Package ID:** `com.school0730.eduplatformmobile`  
**Distribution:** Internal APK (`preview` profile)  
**Status:** ROOT CAUSE RESOLVED — LOCAL BUNDLE 100% VALIDATED (Awaiting Cloud Build Approval)

---

## 1. Build Failure Log & Root Cause Analysis

### Failed Build Details
- **Build ID:** `491a0303-26a8-45e1-a153-11e207813d54`
- **Build URL:** `https://expo.dev/accounts/school0730/projects/edu-platform-monorepo/builds/491a0303-26a8-45e1-a153-11e207813d54`
- **Failing Phase:** `EAGER_BUNDLE` (JavaScript Bundle Phase)

### Exact Cloud Worker Log Error
```json
{"phase":"EAGER_BUNDLE","source":"stderr","msg":"Error: Unable to resolve module ../../App from /home/expo/workingdir/build/node_modules/expo/AppEntry.js: "}
{"phase":"EAGER_BUNDLE","level":50,"err":{"message":"npx expo export:embed --eager --platform android --dev false exited with non-zero code: 1"}}
```

### Root Cause
1. **Wrong Working Directory:** The previous EAS build command was executed directly from the **monorepo root directory** (`C:\Users\hrixo\OneDrive\Desktop\School`) rather than the mobile app directory (`apps/mobile`).
2. **Accidental Secondary Project Creation:** Because the monorepo root was not an existing Expo app, the EAS CLI initialized a new project named `edu-platform-monorepo` with project ID `25a06e93-620b-43f1-943f-9a018bdf21ca` and created a rogue `app.json` and `eas.json` at the root directory.
3. **Invalid Entry Point Resolution:** When EAS Cloud built the root directory, it found no `"main"` property in the root `package.json`, falling back to Expo's default entry point `/home/expo/workingdir/build/node_modules/expo/AppEntry.js`. `AppEntry.js` attempted to `import App from '../../App';` looking for `App.js` or `App.tsx` in the root directory. Because the mobile application's `App.tsx` and dependencies reside in `apps/mobile`, the bundling phase failed immediately.

---

## 2. Configuration Inspection & State Audit

| File / Component | State | Inspection Finding | Action Taken |
| :--- | :---: | :--- | :--- |
| **Root `app.json`** | Rogue | Created accidentally by running EAS in root. Targeted `com.school0730.eduplatformmonorepo` (ID: `25a06e93-620b-43f1-943f-9a018bdf21ca`). | **DELETED.** Removed completely to prevent directory confusion. |
| **Root `eas.json`** | Rogue | Created accidentally by running EAS in root. Missing Android APK preview configuration. | **DELETED.** Removed completely. |
| **`apps/mobile/app.json`** | Intact | Preserves original configuration: `"projectId": "bbf92a69-9c4f-4395-9d10-69c0893ecb69"`, `"package": "com.school0730.eduplatformmobile"`, slug `"edu-platform-mobile"`. | **PRESERVED UNTOUCHED.** |
| **`apps/mobile/eas.json`** | Intact | Contains `"preview"` profile with `"distribution": "internal"`, `"environment": "preview"`, `"android": { "buildType": "apk" }`. | **PRESERVED UNTOUCHED.** |
| **`apps/mobile/package.json`** | Intact | Correct entry point `"main": "index.js"` and pre-bundle hook `"eas-build-post-install": "npm --prefix ../.. run build:mobile-deps"`. | **PRESERVED UNTOUCHED.** |
| **`apps/mobile/index.js`** | Intact | Explicitly imports `./App` and registers root component via `registerRootComponent(App)`. | **PRESERVED UNTOUCHED.** |
| **Cloud Keystore & Credentials** | Intact | Associated with `@school0730/edu-platform-mobile` (ID: `bbf92a69-9c4f-4395-9d10-69c0893ecb69`). | **PRESERVED UNTOUCHED.** |

---

## 3. Local Validation Evidence

1. **EAS Project Identification Check (inside `apps/mobile`):**
   ```text
   $ cd apps/mobile && npx eas project:info
   fullName  @school0730/edu-platform-mobile
   ID        bbf92a69-9c4f-4395-9d10-69c0893ecb69
   ```
2. **EAS Preview Environment Secret Check (inside `apps/mobile`):**
   ```text
   $ cd apps/mobile && npx eas env:list --environment preview
   Environment: preview
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni... (Verified: JWT role = "anon")
   EXPO_PUBLIC_SUPABASE_URL=https://dhgdjpjgsvbknquetecl.supabase.co
   ```
3. **Workspace Typecheck Validation:**
   ```text
   $ npm run typecheck --workspace=apps/mobile
   > @edu-platform/mobile@1.0.0 typecheck
   > tsc --noEmit
   (Exit code 0, zero TypeScript errors)
   ```
4. **Local Android Metro Bundle Validation:**
   ```text
   $ cd apps/mobile && npx expo export:embed --platform android --dev false ...
   Starting Metro Bundler
   Android Bundled 14815ms apps\mobile\index.js (758 modules)
   Writing bundle output to: scratch_bundle.js
   Done writing bundle output (Exit code 0)
   ```

---

## 4. Exact Next EAS Build Command

To build the internal distribution Android APK on the verified project `@school0730/edu-platform-mobile`:

```bash
cd apps/mobile
npx eas build --profile preview --platform android
```

*Note: Per user instructions, no cloud build will be launched until explicit user approval is granted.*
