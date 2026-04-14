// src/utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pdiibxduivhvoadljbhn.supabase.co'
const supabaseKey = 'sb_publishable_9ZVv-Fi4drEcs18GpcltBQ_2_L2xC3S'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,   // 持久化登录状态
    autoRefreshToken: true, // 自动刷新 token
    detectSessionInUrl: true
  }
})