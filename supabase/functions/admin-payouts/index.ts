
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
  
  // Koristimo anon klijent + JWT korisnika (bez service_role)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    // 1. AUTH PROVJERA
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !ADMIN_EMAILS.includes(user.email!)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    // 2. PARAMETRI
    const url = new URL(req.url);
    const dateFrom = url.searchParams.get("date_from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = url.searchParams.get("date_to") || new Date().toISOString();

    // 3. POZIV RPC-a
    const { data, error: rpcError } = await supabase.rpc('get_partner_payouts', {
      p_date_from: dateFrom,
      p_date_to: dateTo
    });

    if (rpcError) throw rpcError;

    // 4. AUDIT
    await supabase.from("promotion_audit_log").insert({
      event_type: 'admin_payouts_viewed',
      user_id: user.id,
      metadata: { date_from: dateFrom, date_to: dateTo, admin_email: user.email }
    });

    return new Response(JSON.stringify({
      period: { from: dateFrom, to: dateTo },
      payouts: data || []
    }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
