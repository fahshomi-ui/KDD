import { createClient } from "@supabase/supabase-js";

// The Supabase project credentials are supplied through environment variables
// (a local .env file, or the hosting provider's settings such as Vercel).
// See .env.example for the required keys.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Missing Supabase configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY " +
      "in .env or in your hosting provider's environment variables.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
