
-- 1. PROŠIRENJE MODELA ZA PARTNERE
CREATE TABLE IF NOT EXISTS referral_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    payout_percent NUMERIC DEFAULT 10,
    active BOOLEAN DEFAULT TRUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    domain TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code TEXT REFERENCES referral_partners(code),
    user_id UUID REFERENCES auth.users(id),
    listing_id UUID,
    payment_intent_id TEXT,
    checkout_session_id TEXT UNIQUE,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    is_self_referral BOOLEAN DEFAULT FALSE,
    self_referral_reason TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_payments_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id TEXT UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    amount_total INTEGER,
    currency TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_self_ref ON referral_attributions(partner_code, is_self_referral);

-- 2. FUNKCIJA ZA OBRAČUN ISPLATA
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
      AND ra.is_self_referral = FALSE
    GROUP BY rp.code, rp.name, rp.payout_percent, spm.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
