
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"

declare const Deno: any;

const ADMIN_EMAILS = Deno.env.get("ADMIN_EMAILS")?.split(",") || [];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || !ADMIN_EMAILS.includes(user.email!)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 403,
        headers: corsHeaders
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    if (req.method === "POST") {
      const body = await req.json();
      // body sada može sadržati allowed_categories, allowed_packages, max_uses_per_user
      const { data, error } = await supabase.from("promo_codes").upsert(body).select();
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400,
      headers: corsHeaders
    });
  }
})
