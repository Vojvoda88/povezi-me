import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

declare const Deno: any;

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Konfiguracija iz okruženja
const GRACE_HOURS = parseInt(Deno.env.get("RENEWAL_GRACE_HOURS") || "24");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature")!
  const body = await req.text()
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // 1. Idempotency Check
    const { error: eventError } = await supabase.from("stripe_events").insert({ 
      id: event.id, 
      type: event.type 
    });

    if (eventError) {
      // Ako je ID već obrađen, Stripe dobija 200 i prestaje sa slanjem
      if (eventError.code === '23505') {
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
      }
      throw eventError;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const { 
          listing_id, package_id, user_id, 
          referral_code, utm_source, utm_medium, utm_campaign 
        } = session.metadata!
        
        // 2. Primarna promocija (RPC sa locking logikom)
        const { error: rpcError } = await supabase.rpc('process_promotion_with_lock', {
          p_listing_id: listing_id,
          p_package_id: package_id,
          p_payment_intent_id: session.payment_intent as string,
          p_user_id: user_id,
          p_amount_total: session.amount_total,
          p_currency: session.currency,
          p_grace_hours: GRACE_HOURS
        });

        if (rpcError) {
          await supabase.from("promotion_audit_log").insert({
            event_type: 'error',
            listing_id,
            user_id,
            payment_intent_id: session.payment_intent as string,
            metadata: { 
              stage: 'process_promotion_with_lock', 
              message: rpcError.message 
            }
          });
          // Vraćamo 500 da bi Stripe pokušao ponovo kasnije (Retry)
          return new Response(JSON.stringify({ error: rpcError.message }), { status: 500 });
        }

        // 3. Atribucija sa detekcijom self-referral zloupotrebe
        if (referral_code) {
          const { data: partner } = await supabase
            .from("referral_partners")
            .select("user_id, domain")
            .eq("code", referral_code)
            .single();

          let isSelfReferral = false;
          let reason = null;

          if (partner) {
            if (partner.user_id && partner.user_id === user_id) {
              isSelfReferral = true;
              reason = 'partner_user_match';
            } 
            else if (partner.domain) {
              const customerEmail = session.customer_details?.email?.toLowerCase();
              if (customerEmail && customerEmail.endsWith(`@${partner.domain.toLowerCase()}`)) {
                isSelfReferral = true;
                reason = 'email_domain_match';
              }
            }
          }

          await supabase.from("referral_attributions")
            .upsert({
              checkout_session_id: session.id,
              payment_intent_id: session.payment_intent as string,
              partner_code: referral_code,
              utm_source: utm_source || null,
              user_id: user_id,
              listing_id: listing_id,
              is_self_referral: isSelfReferral,
              self_referral_reason: reason
            }, { onConflict: 'checkout_session_id' });

          await supabase.from("promotion_audit_log").insert({
            event_type: isSelfReferral ? 'self_referral_detected' : 'referral_attributed',
            listing_id,
            user_id,
            payment_intent_id: session.payment_intent as string,
            metadata: { partner_code: referral_code, reason, utm_source }
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await supabase.from("promotion_audit_log").insert({
          event_type: 'refund',
          payment_intent_id: charge.payment_intent as string,
          metadata: { amount: charge.amount_refunded, currency: charge.currency }
        });
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await supabase.from("promotion_audit_log").insert({
          event_type: 'dispute_created',
          payment_intent_id: dispute.payment_intent as string,
          metadata: { dispute_id: dispute.id, amount: dispute.amount }
        });
        break;
      }

      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        await supabase.from("promotion_audit_log").insert({
          event_type: 'dispute_closed',
          payment_intent_id: dispute.payment_intent as string,
          metadata: { dispute_id: dispute.id, status: dispute.status }
        });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})