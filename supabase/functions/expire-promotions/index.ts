
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"

declare const Deno: any;

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    const now = new Date().toISOString();

    // 1. ISTEK PROMOCIJA
    const { data: expiring } = await supabase
      .from("listing_promotions")
      .select("id, listing_id, package_id")
      .eq("status", "active")
      .lte("ends_at", now);

    if (expiring && expiring.length > 0) {
      const expiringIds = expiring.map(e => e.id);
      await supabase.from("listing_promotions").update({ status: 'expired' }).in("id", expiringIds);
      
      const auditEntries = expiring.map(e => ({
        event_type: 'expired',
        listing_id: e.listing_id,
        package_id: e.package_id
      }));
      await supabase.from("promotion_audit_log").insert(auditEntries);
    }

    // 2. PRIORITETNA AKTIVACIJA IZ QUEUE-A
    // Dohvatamo sve kategorije koje imaju bar jedan 'queued' oglas
    const { data: queuedItems } = await supabase
      .from("listing_promotions")
      .select(`
        id, 
        priority_weight, 
        created_at,
        ads!inner(kategorija),
        product_packages!inner(duration_days)
      `)
      .eq("status", "queued")
      .order("priority_weight", { ascending: false })
      .order("created_at", { ascending: true });

    if (queuedItems && queuedItems.length > 0) {
      // Grupišemo po kategoriji da proverimo slotove
      const categoriesToCheck = [...new Set(queuedItems.map(item => item.ads.kategorija))];

      for (const cat of categoriesToCheck) {
        // Dohvatamo limit za kategoriju (Faza 16 logika)
        const { data: limitRow } = await supabase
          .from("promotion_slot_limits")
          .select("max_slots")
          .eq("category", cat)
          .eq("active", true)
          .single();
        
        const limit = limitRow?.max_slots || 10;

        // Trenutni broj aktivnih
        const { count: activeCount } = await supabase
          .from("listing_promotions")
          .select("id", { count: 'exact', head: true })
          .eq("status", "active")
          .gt("ends_at", now)
          .filter("listing_id", "in", `(SELECT id FROM ads WHERE kategorija = '${cat}')`);

        let slotsAvailable = limit - (activeCount || 0);

        if (slotsAvailable > 0) {
          // Filtriramo kandidate za ovu kategoriju iz već dovučenih podataka (radi uštede query-ja)
          const candidates = queuedItems
            .filter(item => item.ads.kategorija === cat)
            .slice(0, slotsAvailable);

          for (const candidate of candidates) {
            const duration = candidate.product_packages.duration_days;
            const endsAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

            const { error: updateErr } = await supabase
              .from("listing_promotions")
              .update({
                status: 'active',
                starts_at: now,
                ends_at: endsAt
              })
              .eq("id", candidate.id);

            if (!updateErr) {
              await supabase.from("promotion_audit_log").insert({
                event_type: 'activated_from_queue',
                listing_id: (candidate as any).ads.id || null, // Ako je inner join vratio ads obj
                category: cat,
                metadata: {
                  chosen_priority_weight: candidate.priority_weight,
                  chosen_created_at: candidate.created_at,
                  duration_applied: duration
                }
              });
            } else {
              await supabase.from("promotion_audit_log").insert({
                event_type: 'error',
                metadata: { error: updateErr.message, context: 'queue_activation_fail', id: candidate.id }
              });
            }
          }
        }
      }
    }

    // 3. FRAUD GUARD: Resetovanje blokada
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: toUnblock } = await supabase
      .from("user_promotion_flags")
      .select("user_id")
      .eq("is_blocked", true)
      .lt("last_refund_at", thirtyDaysAgo)
      .eq("active_dispute", false);

    if (toUnblock && toUnblock.length > 0) {
       const userIds = toUnblock.map(u => u.user_id);
       await supabase.from("user_promotion_flags")
         .update({ refund_count_30d: 0, is_blocked: false, updated_at: now })
         .in("user_id", userIds);

       const unblockAudit = toUnblock.map(u => ({
         event_type: 'unblocked',
         user_id: u.user_id,
         metadata: { reason: 'expiry_of_30d_period' }
       }));
       await supabase.from("promotion_audit_log").insert(unblockAudit);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    await supabase.from("promotion_audit_log").insert({
      event_type: 'error',
      metadata: { error: err.message, context: 'expire-promotions' }
    });
    return new Response(err.message, { status: 500 });
  }
})
