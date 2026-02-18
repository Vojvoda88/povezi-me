import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-partner-key, content-type",
  "Content-Type": "application/json"
};

const hashKey = async (rawKey: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rawKey = req.headers.get("x-partner-key");
  if (!rawKey) return new Response(JSON.stringify({ error: "Missing API Key" }), { status: 401, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // 1. AUTH KLJUČA
    const hashed = await hashKey(rawKey);
    const { data: keyRecord, error: keyError } = await supabase
      .from("partner_api_keys")
      .select("partner_code")
      .eq("key_hash", hashed)
      .is("revoked_at", null)
      .single();

    if (keyError || !keyRecord) {
      return new Response(JSON.stringify({ error: "Invalid or revoked key" }), { status: 403, headers: corsHeaders });
    }

    // 2. RATE LIMITING (60 req / min)
    const windowStart = new Date();
    windowStart.setSeconds(0, 0);
    const windowISO = windowStart.toISOString();

    const { data: rlData } = await supabase
      .from("partner_api_requests")
      .select("count")
      .eq("key_hash", hashed)
      .eq("window_start", windowISO)
      .single();

    if (rlData && rlData.count >= 60) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded (60 req/min)" }), { status: 429, headers: corsHeaders });
    }
    
    await supabase.from("partner_api_requests").upsert({ 
      key_hash: hashed, 
      window_start: windowISO, 
      count: (rlData?.count || 0) + 1 
    }, { onConflict: 'key_hash,window_start' });

    // 3. DOHVAĆANJE PODATAKA
    const url = new URL(req.url);
    const dateFrom = url.searchParams.get("date_from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = url.searchParams.get("date_to") || new Date().toISOString();
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Summary (Agregacija isplata - get_partner_payouts već isključuje refundacije u SQL-u)
    const { data: summary } = await supabase.rpc('get_partner_payouts', {
      p_date_from: dateFrom,
      p_date_to: dateTo
    });
    const partnerSummary = (summary || []).find((s: any) => s.partner_code === keyRecord.partner_code);

    // List (Paginirane konverzije - get_partner_metrics_list isključuje refundacije)
    const { data: list, error: listError } = await supabase.rpc('get_partner_metrics_list', {
      p_partner_code: keyRecord.partner_code,
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_limit: limit,
      p_offset: offset
    });

    if (listError) throw listError;

    // 4. AUDIT I ODGOVOR
    await supabase.from("promotion_audit_log").insert({
      event_type: 'partner_metrics_viewed',
      metadata: { 
        partner_code: keyRecord.partner_code, 
        date_from: dateFrom, 
        date_to: dateTo 
      }
    });

    return new Response(JSON.stringify({
      partner_code: keyRecord.partner_code,
      period: { from: dateFrom, to: dateTo },
      summary: partnerSummary || { conversions_count: 0, gross_amount_total: 0, payout_amount_total: 0 },
      conversions: list || []
    }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});