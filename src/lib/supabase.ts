import { createClient } from '@supabase/supabase-js'

// Publishable key is intended for browser use. Protect all data with RLS.
const supabaseUrl = 'https://ejkffnlbnqttuihazkgg.supabase.co'
// Legacy anon key from this same Supabase project; public browser key, protected by RLS.
const supabasePublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqa2ZmbmxibnF0dHVpaGF6a2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NTcxMDYsImV4cCI6MjExMDMzMzEwNn0.XJpwPE28cFPl7ekPizAphqGSqV0EjxFPP1eDp2ryALU'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
