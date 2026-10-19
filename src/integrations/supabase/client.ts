import { createClient } from "@supabase/supabase-js";

// Supabase project used by the live KDD site (kddproducts.lovable.app).
// The publishable key is browser-safe by design (access is enforced by Row Level Security).
// Both values can be overridden with VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example).
const DEFAULT_SUPABASE_URL = "https://njbluklbztxjcaulgmmc.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_U4mPFi3DUu3Hpw3rMaZMhQ_7EOZkpST";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
