-- 1.2 Votos seguros (expandir): un voto por usuario y objetivo, solo por RPC.
-- Las políticas viejas de UPDATE ("Public vote ...") siguen vivas hasta la 1.3c.
-- Idempotente: se puede correr dos veces sin error ni duplicados.

-- ── Base legacy ───────────────────────────────────────────────────────────────
-- Los conteos anteriores no son verificables: se congelan una sola vez y los
-- contadores pasan a ser legacy + COUNT(votes). Solo se rellenan al crear la columna.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'legacy_votes_up'
  ) THEN
    ALTER TABLE public.reports
      ADD COLUMN legacy_votes_up   integer NOT NULL DEFAULT 0,
      ADD COLUMN legacy_votes_down integer NOT NULL DEFAULT 0;
    UPDATE public.reports
      SET legacy_votes_up = COALESCE(votes_up, 0), legacy_votes_down = COALESCE(votes_down, 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fuel_prices' AND column_name = 'legacy_votes_up'
  ) THEN
    ALTER TABLE public.fuel_prices
      ADD COLUMN legacy_votes_up   integer NOT NULL DEFAULT 0,
      ADD COLUMN legacy_votes_down integer NOT NULL DEFAULT 0;
    UPDATE public.fuel_prices
      SET legacy_votes_up = COALESCE(votes_up, 0), legacy_votes_down = COALESCE(votes_down, 0);
  END IF;
END
$$;

-- ── Tabla de votos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.votes (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  target_type text        NOT NULL,
  target_id   uuid        NOT NULL,
  voter_id    uuid        NOT NULL DEFAULT auth.uid(),
  value       smallint    NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT votes_pkey              PRIMARY KEY (id),
  CONSTRAINT votes_voter_id_fkey     FOREIGN KEY (voter_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT votes_target_type_check CHECK (target_type IN ('report', 'price')),
  CONSTRAINT votes_value_check       CHECK (value IN (-1, 1)),
  CONSTRAINT votes_one_per_voter     UNIQUE (target_type, target_id, voter_id)
);

-- El UNIQUE ya indexa (target_type, target_id, ...) para el COUNT; esto sirve a get_my_votes
CREATE INDEX IF NOT EXISTS idx_votes_voter ON public.votes (voter_id, target_id);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read votes" ON public.votes;
CREATE POLICY "Public read votes" ON public.votes
  FOR SELECT USING (true);

-- Tabla nueva: el cliente solo lee (las escrituras pasan por cast_vote)
REVOKE ALL ON public.votes FROM anon, authenticated;
GRANT SELECT ON public.votes TO anon, authenticated;

-- ── Helpers internos (no expuestos) ───────────────────────────────────────────

-- Bloquea el objetivo para serializar los votos concurrentes; falla si no existe o no está activo.
-- TARGET_NOT_FOUND usa PT404: PostgREST responde HTTP 404 (con P0002 respondería 500).
CREATE OR REPLACE FUNCTION public._lock_vote_target(p_target_type text, p_target_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF p_target_type = 'report' THEN
    PERFORM 1 FROM reports WHERE id = p_target_id AND is_visible IS TRUE FOR UPDATE;
  ELSIF p_target_type = 'price' THEN
    PERFORM 1 FROM fuel_prices WHERE id = p_target_id AND is_active IS TRUE FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'INVALID_TARGET' USING ERRCODE = '22023';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND' USING ERRCODE = 'PT404';
  END IF;
END
$$;

-- Recalcula los contadores del objetivo desde `votes` (más la base legacy). Nunca suma +1.
CREATE OR REPLACE FUNCTION public._refresh_vote_counts(p_target_type text, p_target_id uuid)
RETURNS TABLE (up integer, down integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_up   integer;
  v_down integer;
BEGIN
  SELECT count(*) FILTER (WHERE v.value = 1), count(*) FILTER (WHERE v.value = -1)
    INTO v_up, v_down
    FROM votes v
   WHERE v.target_type = p_target_type AND v.target_id = p_target_id;

  IF p_target_type = 'report' THEN
    UPDATE reports r
       SET votes_up = r.legacy_votes_up + v_up, votes_down = r.legacy_votes_down + v_down
     WHERE r.id = p_target_id
    RETURNING r.votes_up, r.votes_down INTO up, down;
  ELSE
    UPDATE fuel_prices p
       SET votes_up = p.legacy_votes_up + v_up, votes_down = p.legacy_votes_down + v_down
     WHERE p.id = p_target_id
    RETURNING p.votes_up, p.votes_down INTO up, down;
  END IF;

  RETURN NEXT;
END
$$;

REVOKE ALL ON FUNCTION public._lock_vote_target(text, uuid)     FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._refresh_vote_counts(text, uuid)  FROM public, anon, authenticated;

-- ── RPC: votar ────────────────────────────────────────────────────────────────
-- Mismo valor que el voto actual = lo quita (toggle); otro valor = lo cambia.
CREATE OR REPLACE FUNCTION public.cast_vote(p_target_type text, p_target_id uuid, p_value integer)
RETURNS TABLE (votes_up integer, votes_down integer, my_vote smallint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_current smallint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF p_value IS NULL OR p_value NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'INVALID_VOTE' USING ERRCODE = '22023';
  END IF;

  PERFORM _lock_vote_target(p_target_type, p_target_id);

  SELECT v.value INTO v_current
    FROM votes v
   WHERE v.target_type = p_target_type AND v.target_id = p_target_id AND v.voter_id = v_uid;

  IF v_current = p_value THEN
    DELETE FROM votes v
     WHERE v.target_type = p_target_type AND v.target_id = p_target_id AND v.voter_id = v_uid;
    my_vote := NULL;
  ELSE
    INSERT INTO votes AS v (target_type, target_id, voter_id, value)
    VALUES (p_target_type, p_target_id, v_uid, p_value)
    ON CONFLICT ON CONSTRAINT votes_one_per_voter
      DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    my_vote := p_value;
  END IF;

  SELECT c.up, c.down INTO votes_up, votes_down FROM _refresh_vote_counts(p_target_type, p_target_id) c;
  RETURN NEXT;
END
$$;

-- ── RPC: mis votos ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_votes(p_target_ids uuid[])
RETURNS TABLE (target_type text, target_id uuid, value smallint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  c_max_targets constant integer := 500;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;
  IF cardinality(p_target_ids) > c_max_targets THEN
    RAISE EXCEPTION 'TOO_MANY_TARGETS' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
    SELECT v.target_type, v.target_id, v.value
      FROM votes v
     WHERE v.voter_id = v_uid AND v.target_id = ANY (p_target_ids);
END
$$;

REVOKE ALL ON FUNCTION public.cast_vote(text, uuid, integer) FROM public;
REVOKE ALL ON FUNCTION public.get_my_votes(uuid[])           FROM public;
GRANT EXECUTE ON FUNCTION public.cast_vote(text, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_votes(uuid[])           TO anon, authenticated;
