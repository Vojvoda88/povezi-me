import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"

declare const Deno: any;

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "").split(",");

const toCSV = (data: any[], columns: string[]) => {
  const header = columns.join(",");
  const rows = data.map(row => 
    columns.map(col => {
      const val = row[col];
      const safeVal = val === null || val === undefined ? "" : val;
      const finalVal = typeof safeVal === 'object' ? JSON.stringify(safeVal) : safeVal;
      return typeof finalVal === 'string' ? `"${finalVal.replace(/"/g, '""')}"` : finalVal;
    }).join(",")
  );
  return [header, ...rows].join("\n");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || !ADMIN_EMAILS.includes(user.email!)) {
    return new Response("Unauthorized", { status: 403, headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "promotions";
    const dateFrom = url.searchParams.get("date_from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = url.searchParams.get("date_to") || new Date().toISOString();
    
    let csvContent = "";
    let fileName = `${type}_export_${Date.now()}.csv`;

    if (type === "referrals") {
      const { data } = await supabase.from("referral_attributions")
        .select(`created_at, partner_code, user_id, listing_id, payment_intent_id, utm_source, is_self_referral, self_referral_reason`)
        .gte("created_at", dateFrom).lte("created_at", dateTo);
      csvContent = toCSV(data || [], ["created_at", "partner_code", "user_id", "listing_id", "payment_intent_id", "utm_source", "is_self_referral", "self_referral_reason"]);
    } 
    else if (type === "campaigns") {
      // Export korišćenja promo kodova (Campaigns)
      const { data } = await supabase.from("promo_code_redemptions")
        .select(`created_at, code, user_id, listing_id`)
        .gte("created_at", dateFrom).lte("created_at", dateTo);
      csvContent = toCSV(data || [], ["created_at", "code", "user_id", "listing_id"]);
    }
    else if (type === "payouts") {
      const { data } = await supabase.rpc('get_partner_payouts', { p_date_from: dateFrom, p_date_to: dateTo });
      csvContent = toCSV(data || [], ["partner_code", "partner_name", "payout_percent", "conversions_count", "gross_amount_total", "payout_amount_total", "currency"]);
    }
    else if (type === "revenue") {
      const { data } = await supabase.from("stripe_payments_map")
        .select(`created_at, amount_total, currency, payment_intent_id, user_id`)
        .gte("created_at", dateFrom).lte("created_at", dateTo);
      csvContent = toCSV(data || [], ["created_at", "amount_total", "currency", "payment_intent_id", "user_id"]);
    }
    else if (type === "refunds") {
      const { data } = await supabase.from("promotion_audit_log")
        .select(`created_at, event_type, listing_id, user_id, payment_intent_id, metadata`)
        .in("event_type", ["refund", "dispute_created", "dispute_closed"])
        .gte("created_at", dateFrom).lte("created_at", dateTo);
      csvContent = toCSV(data || [], ["created_at", "event_type", "listing_id", "user_id", "payment_intent_id", "metadata"]);
    }
    else {
      // default: promotions
      const { data } = await supabase.from("listing_promotions")
        .select(`created_at, listing_id, package_id, status, starts_at, ends_at`)
        .gte("created_at", dateFrom).lte("created_at", dateTo);
      csvContent = toCSV(data || [], ["created_at", "listing_id", "package_id", "status", "starts_at", "ends_at"]);
    }

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
    });
  }
})