import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Hatanın kaynağı burası. Sadece 'const' veya 'export default' OLMAMALI.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)