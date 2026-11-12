import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client that uses the service-role key.
 *
 * It bypasses row-level security, so it must only be imported from server code
 * (route handlers, server components). Never import it from a "use client" file
 * and never expose SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
 *
 * It deliberately does NOT fall back to the public anon key: if the service key is
 * missing, the request fails instead of quietly running with the wrong permissions.
 */
let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error(
      "Server database credentials are not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}

/**
 * Lazy handle so route files can `import { supabaseAdmin as supabase }` without
 * touching the environment at import/build time. The real client is created on
 * first use.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
