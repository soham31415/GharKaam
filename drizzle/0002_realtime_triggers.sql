-- Instant updates: after any write to these tables, broadcast a data-less
-- "changed" ping on the public Realtime channel "gharkaam-sync". Phones that
-- receive it simply re-fetch the page from our own server, so no data ever
-- flows through Supabase's public API.
--
-- Failures are swallowed on purpose: a Realtime hiccup must never make marking
-- a chore done fail. On a plain Postgres (no `realtime` schema) the ping is a no-op.

CREATE OR REPLACE FUNCTION public.gharkaam_notify_change() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM realtime.send(
      jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP),
      'changed',
      'gharkaam-sync',
      false
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.gharkaam_notify_change() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER gharkaam_notify_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH STATEMENT EXECUTE FUNCTION public.gharkaam_notify_change();
--> statement-breakpoint
CREATE TRIGGER gharkaam_notify_chores AFTER INSERT OR UPDATE OR DELETE ON public.chores
  FOR EACH STATEMENT EXECUTE FUNCTION public.gharkaam_notify_change();
--> statement-breakpoint
CREATE TRIGGER gharkaam_notify_chore_rotation_members AFTER INSERT OR UPDATE OR DELETE ON public.chore_rotation_members
  FOR EACH STATEMENT EXECUTE FUNCTION public.gharkaam_notify_change();
--> statement-breakpoint
CREATE TRIGGER gharkaam_notify_chore_occurrences AFTER INSERT OR UPDATE OR DELETE ON public.chore_occurrences
  FOR EACH STATEMENT EXECUTE FUNCTION public.gharkaam_notify_change();
