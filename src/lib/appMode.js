/**
 * Runtime mode detection.
 * - VITE_APP_MODE='catalyst' → REST API + Easy Auth
 * - default (unset or 'bolt') → Supabase direct (Bolt preview)
 *
 * In Catalyst, the browser never talks to SQL directly.
 * Easy Auth handles login at the platform level; the frontend
 * just calls /api/* and the platform injects the auth identity.
 */
export const isCatalystMode = import.meta.env.VITE_APP_MODE === 'catalyst';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
