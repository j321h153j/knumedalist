import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://texlipqnzkoylzeowvyg.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_S63yxUuVD_ld3bV0-aACUw_sck9ipiF"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
