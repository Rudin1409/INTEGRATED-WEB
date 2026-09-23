import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://luocftgfmcwlentsmtyo.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ARqo3X00_WQlUHXiC0BQMQ_V3Q69i3m';

export const supabase = createClient(supabaseUrl, supabaseKey);
