import { createClient } from '@supabase/supabase-js'

const { SUPABASE_API_URL, SUPABASE_SECRET_SERVICE_ROLE } = process.env

export const supabase = createClient(SUPABASE_API_URL!, SUPABASE_SECRET_SERVICE_ROLE!)
