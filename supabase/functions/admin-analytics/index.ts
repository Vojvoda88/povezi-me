
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
  });

  try {
    // 1. AUTH PROVJERA
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !ADMIN_EMAILS.includes(user.email!)) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 2. PARALELNO IZVRŠAVANJE UPITA
    const [
      totalCount,
      activeNow,
      queuedNow,
      recentCount,
      topCats,
      popPkg,
      revenue
    ] = await Promise.all([
      supabase.from("listing_promotions").select("*", { count: 'exact', head: true }),
      supabase.from("listing_promotions").select("*", { count: 'exact', head: true })
        .eq("status", "active").lte("starts_at", now).gt("ends_at", now),
      supabase.from("listing_promotions").select("*", { count: 'exact', head: true })
        .eq("status", "queued"),
      supabase.from("listing_promotions").select("*", { count: 'exact', head: true })
        .gt("created_at", thirtyDaysAgo),
      supabase.from("listing_promotions").select("ads(kategorija)")
        .not("ads", "is", null),
      supabase.from("listing_promotions").select("product_packages(name)")
        .not("product_packages", "is", null),
      supabase.from("stripe_payments_map").select("amount_total")
    ]);

    // 3. POST-PROCESIRANJE (Manualna agregacija zbog RLS/Anon ograničenja ako nema RPC-a)
    // Agregacija kategorija
    const catMap: Record<string, number> = {};
    topCats.data?.forEach((p: any) => {
      const cat = p.ads?.kategorija || 'Ostalo';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Najpopularniji paket
    const pkgMap: Record<string, number> = {};
    popPkg.data?.forEach((p: any) => {
      const name = p.product_packages?.name || 'Nepoznato';
      pkgMap[name] = (pkgMap[name] || 0) + 1;
    });
    const mostPopular = Object.entries(pkgMap)
      .sort((a, b) => b[1] - a[1])[0] || ["N/A", 0];

    // Prihod
    const totalRevenue = (revenue.data?.reduce((sum, curr) => sum + (curr.amount_total || 0), 0) || 0) / 100;

    // 4. AUDIT LOG (Fail-safe)
    try {
      await supabase.from("promotion_audit_log").insert({
        event_type: 'admin_analytics_viewed',
        user_id: user.id,
        metadata: { admin_email: user.email }
      });
    } catch (e) { console.error("Audit log failed", e); }

    // 5. FINALNI ODGOVOR
    return new Response(JSON.stringify({
      total_promotions_count: totalCount.count || 0,
      active_promotions_now: activeNow.count || 0,
      queued_promotions_now: queuedNow.count || 0,
      last_30_days_count: recentCount.count || 0,
      top_categories_by_promotions: topCategories,
      most_popular_package: {
        name: mostPopular[0],
        count: mostPopular[1]
      },
      revenue_estimate: {
        amount: totalRevenue,
        currency: 'EUR'
      },
      generated_at: now
    }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
})
