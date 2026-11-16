import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://fpgoscyyvweamwqtdxzo.supabase.co";
const supabasePublishableKey = "sb_publishable_rYG02nG7kkryjMMJxiasQw_9kLi-L8Z";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);