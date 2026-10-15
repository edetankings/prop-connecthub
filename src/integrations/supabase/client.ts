import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { validateSupabaseConfig } from './config';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const config = validateSupabaseConfig(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
export const supabase = createClient<Database>(config.url, config.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
