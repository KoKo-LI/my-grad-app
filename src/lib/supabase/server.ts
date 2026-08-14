import "server-only";
import { createClient } from "@supabase/supabase-js";

function getSupabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  try {
    new URL(url);
    return { publishableKey, url };
  } catch {
    return null;
  }
}

/**
 * Uses only Supabase's low-privilege publishable key. Access is constrained by
 * the Row Level Security policies defined in supabase/migrations.
 */
export function createSupabaseServerClient() {
  const configuration = getSupabaseConfiguration();

  if (!configuration) {
    return null;
  }

  return createClient(configuration.url, configuration.publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
