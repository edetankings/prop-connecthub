
-- Property ID system: PROP-{STATE_CODE}-{AGENT_REF}-{NNNN}

-- 1. Add property_code column
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS property_code TEXT UNIQUE;

-- 2. State code mapping helper (Nigerian states + fallback)
CREATE OR REPLACE FUNCTION public.state_code_for(_state TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s TEXT := upper(trim(coalesce(_state, '')));
BEGIN
  RETURN CASE s
    WHEN 'LAGOS' THEN 'LAG'
    WHEN 'ABUJA' THEN 'ABJ'
    WHEN 'FCT' THEN 'ABJ'
    WHEN 'FEDERAL CAPITAL TERRITORY' THEN 'ABJ'
    WHEN 'RIVERS' THEN 'RIV'
    WHEN 'OYO' THEN 'OYO'
    WHEN 'KANO' THEN 'KAN'
    WHEN 'KADUNA' THEN 'KAD'
    WHEN 'OGUN' THEN 'OGN'
    WHEN 'DELTA' THEN 'DEL'
    WHEN 'ANAMBRA' THEN 'ANA'
    WHEN 'ENUGU' THEN 'ENU'
    WHEN 'EDO' THEN 'EDO'
    WHEN 'IMO' THEN 'IMO'
    WHEN 'ABIA' THEN 'ABI'
    WHEN 'AKWA IBOM' THEN 'AKW'
    WHEN 'CROSS RIVER' THEN 'CRS'
    WHEN 'BAYELSA' THEN 'BAY'
    WHEN 'PLATEAU' THEN 'PLA'
    WHEN 'BENUE' THEN 'BEN'
    WHEN 'NIGER' THEN 'NIG'
    WHEN 'KWARA' THEN 'KWA'
    WHEN 'KOGI' THEN 'KOG'
    WHEN 'NASARAWA' THEN 'NAS'
    WHEN 'OSUN' THEN 'OSU'
    WHEN 'ONDO' THEN 'OND'
    WHEN 'EKITI' THEN 'EKI'
    WHEN 'BORNO' THEN 'BOR'
    WHEN 'BAUCHI' THEN 'BAU'
    WHEN 'GOMBE' THEN 'GOM'
    WHEN 'ADAMAWA' THEN 'ADA'
    WHEN 'TARABA' THEN 'TAR'
    WHEN 'YOBE' THEN 'YOB'
    WHEN 'JIGAWA' THEN 'JIG'
    WHEN 'KATSINA' THEN 'KAT'
    WHEN 'KEBBI' THEN 'KEB'
    WHEN 'SOKOTO' THEN 'SOK'
    WHEN 'ZAMFARA' THEN 'ZAM'
    WHEN 'EBONYI' THEN 'EBO'
    ELSE COALESCE(NULLIF(regexp_replace(s, '[^A-Z]', '', 'g'), ''), 'NGA')
  END;
END;
$$;

-- 3. Generation function: PROP-{STATE}-{AGENT_REF}-{NNNN}
CREATE OR REPLACE FUNCTION public.generate_property_code(_agent_id UUID, _state TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  state_code TEXT;
  agent_ref TEXT;
  next_seq INTEGER;
  candidate TEXT;
  exists_already BOOLEAN;
BEGIN
  state_code := substr(public.state_code_for(_state), 1, 3);

  SELECT COALESCE(referral_code, 'AGT' || substr(replace(id::text, '-', ''), 1, 4))
  INTO agent_ref
  FROM public.profiles WHERE id = _agent_id;
  agent_ref := upper(replace(COALESCE(agent_ref, 'AGT0000'), 'PC-', ''));

  -- Per-agent sequence
  SELECT COUNT(*) + 1 INTO next_seq
  FROM public.properties WHERE agent_id = _agent_id;

  LOOP
    candidate := 'PROP-' || state_code || '-' || agent_ref || '-' || lpad(next_seq::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.properties WHERE property_code = candidate) INTO exists_already;
    EXIT WHEN NOT exists_already;
    next_seq := next_seq + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

-- 4. Trigger to auto-assign on insert
CREATE OR REPLACE FUNCTION public.auto_assign_property_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.property_code IS NULL OR NEW.property_code = '' THEN
    NEW.property_code := public.generate_property_code(NEW.agent_id, NEW.state);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_property_code ON public.properties;
CREATE TRIGGER trg_auto_assign_property_code
BEFORE INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_property_code();

-- 5. Backfill existing rows
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, agent_id, state FROM public.properties WHERE property_code IS NULL ORDER BY created_at
  LOOP
    UPDATE public.properties SET property_code = public.generate_property_code(r.agent_id, r.state) WHERE id = r.id;
  END LOOP;
END $$;

-- 6. Index for lookups
CREATE INDEX IF NOT EXISTS idx_properties_property_code ON public.properties(property_code);
