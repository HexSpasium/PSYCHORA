import { createClient } from '@supabase/supabase-js'

// Publishable key is intended for browser use. Protect all data with RLS.
const supabaseUrl = 'https://ejkffnlbnqttuihazkgg.supabase.co'
const supabasePublishableKey = 'sb_publishable_Hha64K7vC6JSxhFcN33mVg_0YEZMUw'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
