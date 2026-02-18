
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"

declare const Deno: any;

const ADMIN_EMAILS = Deno.env.get("ADMIN_EMAILS")?.split(",") || [];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization")!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    }).auth.getUser();

    if (authError || !user || !ADMIN_EMAILS.includes(user.email!)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (action === "create" && req.method === "POST") {
      const { partner_code } = await req.json();
      if (!partner_code) throw new Error("Missing partner_code");

      const rawKey = `pk_${crypto.randomUUID().replace(/-/g, '')}`;
      const hashed = await hashKey(rawKey);

      const { data, error } = await supabase
        .from("partner_api_keys")
        .insert({ partner_code, key_hash: hashed })
        .select("id, created_at")
        .single();

      if (error) throw error;

      await supabase.from("promotion_audit_log").insert({
        event_type: 'admin_partner_key_created',
        user_id: user.id,
        metadata: { partner_code, key_id: data.id }
      });

      return new Response(JSON.stringify({ 
        partner_code, 
        raw_key: rawKey, 
        id: data.id, 
        created_at: data.created_at,
        warning: "Copy this key now, it will not be shown again." 
      }), { headers: corsHeaders });
    }

    if (action === "revoke" && req.method === "POST") {
      const { key_id } = await req.json();
      const { data, error } = await supabase
        .from("partner_api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", key_id)
        .select("partner_code")
        .single();

      if (error) throw error;

      await supabase.from("promotion_audit_log").insert({
        event_type: 'admin_partner_key_revoked',
        user_id: user.id,
        metadata: { key_id, partner_code: data.partner_code }
      });

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === "list" && req.method === "GET") {
      const { data, error } = await supabase
        .from("partner_api_keys")
        .select("id, partner_code, created_at, revoked_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
  }
});
