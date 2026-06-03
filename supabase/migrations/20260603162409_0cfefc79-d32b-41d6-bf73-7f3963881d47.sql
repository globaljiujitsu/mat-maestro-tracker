
-- 1) Techniques: per-branch + uploaded by
ALTER TABLE public.techniques ADD COLUMN IF NOT EXISTS branch_id uuid;
ALTER TABLE public.techniques ADD COLUMN IF NOT EXISTS uploaded_by uuid;

-- 2) Realtime on notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;

-- 3) Auto-finalize classes whose end time has passed
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.auto_finalize_classes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.classes
  SET status = 'completed'
  WHERE status = 'scheduled'
    AND ((date::timestamp + time) + (duration_hours || ' hours')::interval) < now();
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-finalize-classes');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

SELECT cron.schedule('auto-finalize-classes', '*/10 * * * *', $$SELECT public.auto_finalize_classes()$$);

-- 4) Notify student when instructor evaluates a technique
CREATE OR REPLACE FUNCTION public.notify_technique_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.status = 'not_evaluated' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;
  SELECT title INTO v_title FROM public.techniques WHERE id = NEW.technique_id;
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (NEW.student_id, 'Técnica evaluada',
    COALESCE(v_title,'Una técnica') || ' · ' || NEW.status);
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS tp_notify ON public.technique_progress;
CREATE TRIGGER tp_notify
AFTER INSERT OR UPDATE ON public.technique_progress
FOR EACH ROW EXECUTE FUNCTION public.notify_technique_progress();

-- 5) Wire booking-change notifications trigger (function exists; ensure trigger)
DROP TRIGGER IF EXISTS attendance_notify_booking ON public.attendance;
CREATE TRIGGER attendance_notify_booking
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();

-- 6) Wire new-class notifications trigger
DROP TRIGGER IF EXISTS classes_notify_new ON public.classes;
CREATE TRIGGER classes_notify_new
AFTER INSERT ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.notify_new_class();

-- 7) Wire attendance hours trigger
DROP TRIGGER IF EXISTS attendance_track_hours ON public.attendance;
CREATE TRIGGER attendance_track_hours
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.track_attendance_hours();
