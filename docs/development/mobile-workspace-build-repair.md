# Mobile Workspace Build Repair

## Root Cause

The shared packages publish `main` and `types` from `dist/index.js` and `dist/index.d.ts`, but generated `dist/` folders are excluded by the repository's root `.gitignore`. There is no `.easignore`. Local Metro bundling succeeded because those compiled outputs existed locally; EAS's inspected Android archive included the workspace root and package sources but omitted the ignored `dist` output. No package build was configured to run before Metro bundled the app.

## Files Changed

- `package.json`: adds `build:mobile-deps`, a deterministic workspace build sequence.
- `apps/mobile/package.json`: adds `eas-build-post-install` to invoke the root build sequence.
- `docs/development/mobile-workspace-build-repair.md`: this report.

The existing `apps/mobile/index.js` entry point remains unchanged.

## Packages and Build Order

All four mobile-declared shared packages require compiled outputs because their manifests point to `dist`:

1. `@edu-platform/types` (no workspace dependencies)
2. `@edu-platform/database` and `@edu-platform/validators` (both depend on types)
3. `@edu-platform/supabase-client` (depends on database and types)

The hook runs after EAS installs dependencies and before the JavaScript bundle is produced. It invokes the root script from the mobile project directory with `npm --prefix ../.. run build:mobile-deps`.

## Validation

- Clean-state test: temporarily moved only the four generated `dist` directories to a temporary backup, then ran `npm run eas-build-post-install` from `apps/mobile`. All four TypeScript package builds passed and produced their `dist/index.js` entries.
- Expo config: `npx expo config --type public --json` passed.
- Android production bundle: `npx expo export:embed --platform android --dev false --bundle-output <temp>/index.android.bundle --assets-dest <temp>/assets` passed; Metro bundled `apps/mobile/index.js` and 597 modules.
- Mobile typecheck: `npm run typecheck` from `apps/mobile` passed.
- EAS archive inspection: confirmed the root package, all four shared package sources, mobile entry, and lifecycle hook are present; confirmed `packages/validators/dist/index.js` remains excluded from the archive and will be built by the hook.
- `apps/mobile/index.js` remains present and was the entry used by the successful bundle.

No cloud build was started. The archive contents and lifecycle command were verified locally; actual execution in the EAS cloud environment remains unverified until the next requested cloud build.
