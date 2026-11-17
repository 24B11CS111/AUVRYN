# AUVRYN — Complete Environment Variable Configuration Guide

**Target System:** AUVRYN — The Intelligent Education Ecosystem  
**Target Environments:** Local Development · Vercel Production · Expo EAS · Supabase Edge Functions  
**Security Classification:** Strict (No actual production secrets contained herein)  

---

## 1. Web Application Environment (`apps/web/.env.local`)

| Variable | Required | Exposure | Description / Allowed Values |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Client & Server | Supabase project endpoint (e.g. `https://dhgdjpjgsvbknquetecl.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Client & Server | Supabase public anonymous API key (JWT). Subject to Row-Level Security. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **Server Only** | Supabase service-role administrative secret. **Never expose to browser.** |
| `CRON_SECRET` | **Yes** | **Server Only** | 32+ character high-entropy token securing `/api/cron/notifications`. |
| `EXPO_ACCESS_TOKEN` | Optional | **Server Only** | Expo Push API bearer token for sending push deliveries. |
| `GEMINI_API_KEY` | Optional | **Server Only** | Google Gemini API key for server-side AI companion tasks. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Client & Server | Canonical public web URL (e.g. `https://auvryn.com` or `http://localhost:3000`). |

---

## 2. Mobile Application Environment (`apps/mobile`)

Configured via `app.json` (under `expo.extra`) and EAS Secret Manager:

| Variable | Required | Scope | Description |
| :--- | :---: | :---: | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | **Yes** | Client Runtime | Supabase project URL (`https://dhgdjpjgsvbknquetecl.supabase.co`). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Client Runtime | Supabase public anonymous key. Safe for client embedding. |
| `EAS_PROJECT_ID` | **Yes** | Build Config | `bbf92a69-9c4f-4395-9d10-69c0893ecb69` |
| `ANDROID_PACKAGE_NAME` | **Yes** | Build Config | `com.school0730.eduplatformmobile` |
| `FIREBASE_PROJECT_ID` | **Yes** | Push Config | `auvryn-63772` (Configured via `google-services.json`). |

---

## 3. Supabase Edge Functions Environment (`supabase/functions`)

Configured via Supabase CLI (`supabase secrets set`) or Supabase Dashboard:

| Secret | Target Function | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `ai-gateway` | API key powering Gemini 1.5 Flash inference. |
| `SUPABASE_SERVICE_ROLE_KEY` | `ai-gateway`, `dispatch-notifications` | Service role key for logging AI audit entries. |

---

## 4. Environment Verification Protocols

1. **Verify Web Secrets Are Not Leaked to Client:**
   Inspect client HTML/JS bundle for `SUPABASE_SERVICE_ROLE_KEY` or `CRON_SECRET`. They must be absent.
2. **Verify Cron Route Security:**
   Execute `curl -I https://<APP_URL>/api/cron/notifications`. Must return `401 Unauthorized`.
   Execute `curl -I -H "Authorization: Bearer <CRON_SECRET>" https://<APP_URL>/api/cron/notifications`. Must return `200 OK`.
