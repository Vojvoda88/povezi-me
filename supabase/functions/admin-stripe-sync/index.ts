
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

declare const Deno: any;

const ADMIN_EMAILS = Deno.env.get("ADMIN_EMAILS")?.split(",") || [];
const STRIPE_MODE = Deno.env.get("STRIPE_MODE"); // 'test' | 'live'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // 1. SAFETY CHECK
  if (!STRIPE_MODE || !['test', 'live'].includes(STRIPE_MODE)) {
    return new Response(JSON.stringify({ error: "STRIPE_MODE must be set to 'test' or 'live'" }), { status: 500, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  
  const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // 2. AUTH PROVJERA
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !ADMIN_EMAILS.includes(user.email!)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2022-11-15",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // A) LIST: Dohvati aktivne cijene sa Stripe-a
    if (action === "list") {
      const prices = await stripe.prices.list({ 
        active: true, 
        expand: ['data.product'],
        limit: 100 
      });
      
      const formatted = prices.data.map(p => ({
        price_id: p.id,
        product_name: (p.product as any).name,
        amount: p.unit_amount ? p.unit_amount / 100 : 0,
        currency: p.currency.toUpperCase(),
        metadata: p.metadata,
        lookup_key: p.lookup_key
      }));

      return new Response(JSON.stringify({ mode: STRIPE_MODE, prices: formatted }), { headers: corsHeaders });
    }

    // B) VALIDATE: Provjeri listu price_id-eva
    if (action === "validate") {
      const { price_ids } = await req.json();
      const results: Record<string, any> = {};

      for (const id of price_ids) {
        try {
          const p = await stripe.prices.retrieve(id);
          results[id] = { ok: p.active, reason: p.active ? "Active" : "Inactive in Stripe" };
        } catch (e) {
          results[id] = { ok: false, reason: "Not found in Stripe" };
        }
      }
      return new Response(JSON.stringify(results), { headers: corsHeaders });
    }

    // C) APPLY: Upsert u bazu
    if (action === "apply") {
      const { updates } = await req.json();
      const summary = [];

      for (const update of updates) {
        // Obavezna validacija prije upisa
        try {
          const p = await stripe.prices.retrieve(update.stripe_price_id);
          if (!p.active) throw new Error("Price is not active on Stripe");

          let dbResult;
          if (update.target === "product_packages") {
            dbResult = await adminSupabase.from("product_packages").update({ stripe_price_id: update.stripe_price_id }).eq("id", update.package_id);
          } else if (update.target === "product_package_prices") {
            dbResult = await adminSupabase.from("product_package_prices").upsert({ 
              package_id: update.package_id, 
              category: update.category, 
              stripe_price_id: update.stripe_price_id,
              active: true
            });
          } else if (update.target === "promo_codes") {
            dbResult = await adminSupabase.from("promo_codes").update({ override_stripe_price_id: update.stripe_price_id }).eq("code", update.code);
          }

          summary.push({ target: update.target, id: update.package_id || update.code, ok: !dbResult?.error, error: dbResult?.error });
        } catch (e) {
          summary.push({ target: update.target, id: update.package_id || update.code, ok: false, error: e.message });
        }
      }

      await adminSupabase.from("promotion_audit_log").insert({
        event_type: 'admin_stripe_sync_apply',
        user_id: user.id,
        metadata: { admin_email: user.email, stripe_mode: STRIPE_MODE, updates_count: updates.length, results: summary }
      });

      return new Response(JSON.stringify({ mode: STRIPE_MODE, summary }), { headers: corsHeaders });
    }

    return new Response("Action not found", { status: 404, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
  }
});
