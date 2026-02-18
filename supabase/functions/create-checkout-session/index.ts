
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

declare const Deno: any;

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { 
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
    } })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  })
  const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new Response("Unauthorized", { status: 401 })

    const { 
      listing_id, package_id, promo_code,
      referral_code, utm_source, utm_medium, utm_campaign, utm_content, utm_term 
    } = await req.json()

    // 1. DOHVATI OGLAS I PODATKE
    const { data: listing } = await supabase
      .from("ads")
      .select("id, vlasnikId, kategorija")
      .eq("id", listing_id)
      .single()

    if (!listing || listing.vlasnikId !== user.id) return new Response("Forbidden", { status: 403 })

    // 2. VALIDACIJA REFERRAL KODA (Fail-open: ako ne postoji, samo ignoriši tracking)
    let validatedPartner: string | null = null;
    if (referral_code) {
      const { data: partner } = await adminSupabase
        .from("referral_partners")
        .select("code")
        .eq("code", referral_code)
        .eq("active", true)
        .single();
      if (partner) validatedPartner = partner.code;
    }

    // 3. PROVJERA PROMO KODA SA SEGMENTACIJOM (Postojeća logika)
    let overridePriceId: string | null = null;
    let appliedPromo: string | null = null;
    let promoRejectReason: string | null = null;

    if (promo_code) {
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promo_code.toUpperCase())
        .eq("active", true)
        .lte("starts_at", new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .single();

      if (promo) {
        let isValid = true;
        if (promo.max_uses !== null && promo.used_count >= promo.max_uses) { isValid = false; promoRejectReason = "global_limit_reached"; }
        if (isValid && promo.allowed_categories && !promo.allowed_categories.includes(listing.kategorija)) { isValid = false; promoRejectReason = "category_not_allowed"; }
        if (isValid && promo.allowed_packages && !promo.allowed_packages.includes(package_id)) { isValid = false; promoRejectReason = "package_not_allowed"; }
        if (isValid && promo.max_uses_per_user !== null) {
          const { count: userUses } = await adminSupabase.from("promo_code_redemptions").select("id", { count: 'exact', head: true }).eq("code", promo.code).eq("user_id", user.id);
          if ((userUses || 0) >= promo.max_uses_per_user) { isValid = false; promoRejectReason = "user_limit_reached"; }
        }
        if (isValid) {
          const { data: updateCheck } = await adminSupabase.from("promo_codes").update({ used_count: promo.used_count + 1 }).eq("code", promo.code).lt("used_count", promo.max_uses ?? 9999999).select();
          if (updateCheck && updateCheck.length > 0) {
            overridePriceId = promo.override_stripe_price_id;
            appliedPromo = promo.code;
            await adminSupabase.from("promo_code_redemptions").insert({ code: promo.code, user_id: user.id, listing_id: listing_id });
          } else { promoRejectReason = "race_condition_limit"; }
        }
      } else { promoRejectReason = "code_not_found_or_inactive"; }
    }

    // 4. FINALNA SELEKCIJA CIJENE
    let selectedPriceId: string;
    if (overridePriceId) {
      selectedPriceId = overridePriceId;
    } else {
      const { data: catPrice } = await supabase.from("product_package_prices").select("stripe_price_id").eq("package_id", package_id).eq("category", listing.kategorija).eq("active", true).single();
      if (catPrice) { selectedPriceId = catPrice.stripe_price_id; } else {
        const { data: pkg } = await supabase.from("product_packages").select("stripe_price_id").eq("id", package_id).single();
        if (!pkg) return new Response("Invalid package", { status: 400 });
        selectedPriceId = pkg.stripe_price_id;
      }
    }

    // 5. STRIPE SESSION SA TRACKING METAPODACIMA
    let { data: customerRecord } = await supabase.from("stripe_customers").select("stripe_customer_id").eq("user_id", user.id).single()
    let stripeCustomerId = customerRecord?.stripe_customer_id
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })
      stripeCustomerId = customer.id
      await supabase.from("stripe_customers").insert({ user_id: user.id, stripe_customer_id: stripeCustomerId })
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: selectedPriceId, quantity: 1 }],
      mode: "payment",
      success_url: `${Deno.env.get("APP_BASE_URL")}/payment-success?session_id={CHECKOUT_SESSION_ID}&ad_id=${listing_id}`,
      cancel_url: `${Deno.env.get("APP_BASE_URL")}/moji-oglasi`,
      metadata: { 
        listing_id, package_id, user_id: user.id, promo_code: appliedPromo,
        referral_code: validatedPartner,
        utm_source, utm_medium, utm_campaign 
      },
    })

    // 6. UPIS ATRIBUCIJE (Attempt)
    if (validatedPartner || utm_source) {
      await adminSupabase.from("referral_attributions").insert({
        user_id: user.id,
        listing_id,
        partner_code: validatedPartner,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        checkout_session_id: session.id
      });
    }

    await adminSupabase.from("promotion_audit_log").insert({
      event_type: validatedPartner ? 'referral_captured' : 'checkout_started',
      listing_id, user_id: user.id,
      metadata: { package_id, promo_code: appliedPromo, referral_code: validatedPartner, utm_source }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } })
  }
})
