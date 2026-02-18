
-- ... (Prethodni SQL ostaje nepromijenjen)

-- 1. PROŠIRENJE MODELA
ALTER TABLE referral_partners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE referral_partners ADD COLUMN IF NOT EXISTS domain TEXT NULL;

ALTER TABLE referral_attributions ADD COLUMN IF NOT EXISTS is_self_referral BOOLEAN DEFAULT FALSE;
ALTER TABLE referral_attributions ADD COLUMN IF NOT EXISTS self_referral_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_attributions_self_ref ON referral_attributions(partner_code, is_self_referral);

-- 2. AŽURIRANJE PAYOUT OBRAČUNA (get_partner_payouts)
CREATE OR REPLACE FUNCTION get_partner_payouts(p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ)
RETURNS TABLE (
    partner_code TEXT,
    partner_name TEXT,
    payout_percent NUMERIC,
    conversions_count BIGINT,
    gross_amount_total NUMERIC,
    payout_amount_total NUMERIC,
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.code as partner_code,
        rp.name as partner_name,
        rp.payout_percent,
        COUNT(ra.id) as conversions_count,
        SUM(spm.amount_total / 100.0)::NUMERIC as gross_amount_total,
        SUM((spm.amount_total / 100.0) * (rp.payout_percent / 100.0))::NUMERIC as payout_amount_total,
        spm.currency
    FROM referral_partners rp
    JOIN referral_attributions ra ON rp.code = ra.partner_code
    JOIN stripe_payments_map spm ON ra.payment_intent_id = spm.payment_intent_id
    WHERE ra.created_at BETWEEN p_date_from AND p_date_to
      AND ra.is_self_referral = FALSE -- ISKLJUČIVANJE SELF-REFERRAL-A
      AND NOT EXISTS (
          SELECT 1 FROM promotion_audit_log pal 
          WHERE pal.payment_intent_id = spm.payment_intent_id 
          AND pal.event_type IN ('refund', 'canceled')
      )
    GROUP BY rp.code, rp.name, rp.payout_percent, spm.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. AŽURIRANJE METRIKA (get_partner_metrics_list)
CREATE OR REPLACE FUNCTION get_partner_metrics_list(
    p_partner_code TEXT, 
    p_date_from TIMESTAMPTZ, 
    p_date_to TIMESTAMPTZ,
    p_limit INT,
    p_offset INT
)
RETURNS TABLE (
    created_at TIMESTAMPTZ,
    listing_id UUID,
    payment_intent_id TEXT,
    amount_total NUMERIC,
    currency TEXT,
    utm_source TEXT,
    utm_campaign TEXT,
    is_self_referral BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.created_at,
        a.listing_id,
        a.payment_intent_id,
        (s.amount_total / 100.0)::NUMERIC as amount_total,
        s.currency,
        a.utm_source,
        a.utm_campaign,
        a.is_self_referral
    FROM referral_attributions a
    JOIN stripe_payments_map s ON a.payment_intent_id = s.payment_intent_id
    WHERE a.partner_code = p_partner_code
      AND a.created_at BETWEEN p_date_from AND p_date_to
      AND a.is_self_referral = FALSE -- Partner vidi samo validne konverzije u metrics API-ju
      AND NOT EXISTS (
          SELECT 1 FROM promotion_audit_log l
          WHERE l.payment_intent_id = s.payment_intent_id
            AND l.event_type IN ('refund', 'canceled', 'charge.refunded', 'error')
      )
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
