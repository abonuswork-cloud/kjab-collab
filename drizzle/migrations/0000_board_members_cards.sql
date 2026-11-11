CREATE TABLE public.board_members (
  user_id uuid PRIMARY KEY,
  email text,
  joined_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.board_members TO authenticated;
GRANT ALL ON public.board_members TO service_role;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_board_member(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.board_members WHERE user_id = _uid)
$$;

CREATE POLICY "Members see members" ON public.board_members FOR SELECT TO authenticated
  USING (public.is_board_member(auth.uid()));

-- First two accounts to sign in become the board's members; nobody else gets in.
CREATE OR REPLACE FUNCTION public.handle_new_board_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(424242);
  IF (SELECT count(*) FROM public.board_members) < 2 THEN
    INSERT INTO public.board_members (user_id, email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_board AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_board_user();

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  due timestamptz,
  size text NOT NULL DEFAULT 'M',
  assignee text NOT NULL DEFAULT 'Both',
  column_id text NOT NULL DEFAULT 'todo',
  subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage cards" ON public.cards FOR ALL TO authenticated
  USING (public.is_board_member(auth.uid())) WITH CHECK (public.is_board_member(auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;

CREATE POLICY "Members read attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments' AND public.is_board_member(auth.uid()));
CREATE POLICY "Members upload attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND public.is_board_member(auth.uid()));
CREATE POLICY "Members delete attachments" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments' AND public.is_board_member(auth.uid()));