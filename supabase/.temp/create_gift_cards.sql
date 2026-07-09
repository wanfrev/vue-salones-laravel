CREATE TABLE IF NOT EXISTS public.gift_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    recipient_name text NOT NULL,
    recipient_phone text,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'cancelled')),
    notes text,
    redeemed_at timestamptz,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_business_id ON public.gift_cards(business_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON public.gift_cards(business_id, status);

DROP TRIGGER IF EXISTS gift_cards_set_updated_at ON public.gift_cards;
CREATE TRIGGER gift_cards_set_updated_at
    BEFORE UPDATE ON public.gift_cards
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
