-- Instant updates for the inventory tables (same function as 0002_realtime_triggers.sql).
-- inventory_events has no trigger: every event is written together with an
-- inventory_items update, which already sends the ping.
CREATE TRIGGER gharkaam_notify_categories AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH STATEMENT EXECUTE FUNCTION public.gharkaam_notify_change();
--> statement-breakpoint
CREATE TRIGGER gharkaam_notify_inventory_items AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH STATEMENT EXECUTE FUNCTION public.gharkaam_notify_change();
--> statement-breakpoint
-- Starter categories. Admins can rename, reorder or delete them in Settings.
INSERT INTO public.categories (name, sort_order) VALUES
  ('Groceries', 10),
  ('Vegetables & Fruits', 20),
  ('Dairy', 30),
  ('Cleaning', 40),
  ('Toiletries', 50),
  ('Kitchen', 60),
  ('Medicines', 70),
  ('Other', 80)
ON CONFLICT ((lower(name))) DO NOTHING;
