export function firebaseConfigMissing(){return ["NEXT_PUBLIC_CBDEVS_SUPABASE_URL","NEXT_PUBLIC_CBDEVS_SUPABASE_ANON_KEY"].filter(k=>!process.env[k]);}
