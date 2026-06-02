
-- ============ 1. FOREIGN KEYS (idempotent) ============
DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN SELECT * FROM (VALUES
    ('public.profiles',          'profiles_id_fkey',          'FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'),
    ('public.students',          'students_id_fkey',          'FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE'),
    ('public.students',          'students_branch_fkey',      'FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL'),
    ('public.instructors',       'instructors_id_fkey',       'FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE'),
    ('public.instructors',       'instructors_branch_fkey',   'FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL'),
    ('public.user_roles',        'user_roles_user_fkey',      'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
    ('public.attendance',        'attendance_student_fkey',   'FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE'),
    ('public.attendance',        'attendance_class_fkey',     'FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE'),
    ('public.classes',           'classes_instructor_fkey',   'FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE'),
    ('public.classes',           'classes_branch_fkey',       'FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE'),
    ('public.championships',     'championships_student_fkey','FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE'),
    ('public.technique_progress','tp_student_fkey',           'FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE'),
    ('public.technique_progress','tp_technique_fkey',         'FOREIGN KEY (technique_id) REFERENCES public.techniques(id) ON DELETE CASCADE'),
    ('public.technique_progress','tp_evaluator_fkey',         'FOREIGN KEY (evaluated_by) REFERENCES public.profiles(id) ON DELETE SET NULL'),
    ('public.notifications',     'notif_user_fkey',           'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
    ('public.certificates',      'cert_student_fkey',         'FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE'),
    ('public.instructor_videos', 'iv_instructor_fkey',        'FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE')
  ) AS t(tbl, name, def)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.name) THEN
      EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', fk.tbl, fk.name, fk.def);
    END IF;
  END LOOP;
END $$;

-- ============ 2. NEW COLUMNS ============
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS duration_hours numeric NOT NULL DEFAULT 1.5;
ALTER TABLE public.techniques ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.instructors ADD COLUMN IF NOT EXISTS total_hours_taught numeric NOT NULL DEFAULT 0;

-- ============ 3. NOTIFICATIONS - allow system + admin inserts ============
DROP POLICY IF EXISTS notif_insert_system ON public.notifications;
CREATE POLICY notif_insert_system ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS notif_admin_all ON public.notifications;
CREATE POLICY notif_admin_all ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ 4. TRIGGER: notify students of same branch on new class ============
CREATE OR REPLACE FUNCTION public.notify_new_class()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_instructor_name text;
BEGIN
  SELECT full_name INTO v_instructor_name FROM public.profiles WHERE id = NEW.instructor_id;
  INSERT INTO public.notifications (user_id, title, body)
  SELECT s.id,
         'Nueva clase disponible',
         COALESCE(v_instructor_name, 'Un profesor') || ' creó: ' || NEW.title || ' · ' || to_char(NEW.date, 'DD/MM') || ' ' || to_char(NEW.time, 'HH24:MI')
  FROM public.students s
  WHERE s.is_active = true AND s.branch_id = NEW.branch_id;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_notify_new_class ON public.classes;
CREATE TRIGGER trg_notify_new_class AFTER INSERT ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.notify_new_class();

-- ============ 5. TRIGGER: notify instructor on booking change ============
CREATE OR REPLACE FUNCTION public.notify_booking_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_instructor uuid;
  v_class_title text;
  v_student_name text;
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.booking_status <> 'confirmed' THEN RETURN NEW; END IF;
    v_action := 'confirmó presencia';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.booking_status = OLD.booking_status THEN RETURN NEW; END IF;
    IF NEW.booking_status = 'confirmed' THEN v_action := 'confirmó presencia';
    ELSIF NEW.booking_status = 'cancelled' THEN v_action := 'canceló su reserva';
    ELSE RETURN NEW; END IF;
  END IF;
  SELECT instructor_id, title INTO v_instructor, v_class_title FROM public.classes WHERE id = NEW.class_id;
  SELECT full_name INTO v_student_name FROM public.profiles WHERE id = NEW.student_id;
  IF v_instructor IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, title, body)
  VALUES (v_instructor, 'Reserva actualizada', COALESCE(v_student_name, 'Un alumno') || ' ' || v_action || ' en: ' || v_class_title);
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_notify_booking ON public.attendance;
CREATE TRIGGER trg_notify_booking AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_change();

-- ============ 6. TRIGGER: track hours/classes when check_in_status = 'present' ============
CREATE OR REPLACE FUNCTION public.track_attendance_hours()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hours numeric;
  v_instructor uuid;
  v_old_present boolean;
  v_new_present boolean;
BEGIN
  v_old_present := (TG_OP = 'UPDATE' AND OLD.check_in_status = 'present');
  v_new_present := (NEW.check_in_status = 'present');
  IF v_old_present = v_new_present THEN RETURN NEW; END IF;
  SELECT duration_hours, instructor_id INTO v_hours, v_instructor FROM public.classes WHERE id = NEW.class_id;
  IF v_hours IS NULL THEN v_hours := 1.5; END IF;
  IF v_new_present AND NOT v_old_present THEN
    UPDATE public.students SET total_training_hours = total_training_hours + v_hours, total_classes_attended = total_classes_attended + 1 WHERE id = NEW.student_id;
    UPDATE public.instructors SET total_hours_taught = total_hours_taught + v_hours, total_classes_taught = total_classes_taught + 1 WHERE id = v_instructor;
  ELSIF v_old_present AND NOT v_new_present THEN
    UPDATE public.students SET total_training_hours = GREATEST(0, total_training_hours - v_hours), total_classes_attended = GREATEST(0, total_classes_attended - 1) WHERE id = NEW.student_id;
    UPDATE public.instructors SET total_hours_taught = GREATEST(0, total_hours_taught - v_hours), total_classes_taught = GREATEST(0, total_classes_taught - 1) WHERE id = v_instructor;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_track_hours ON public.attendance;
CREATE TRIGGER trg_track_hours AFTER UPDATE OF check_in_status ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.track_attendance_hours();

-- ============ 7. Sample video URLs ============
UPDATE public.techniques SET video_url = 'https://www.youtube.com/embed/8zZ9rRwlj9o' WHERE belt_level = 'white' AND video_url IS NULL;
UPDATE public.techniques SET video_url = 'https://www.youtube.com/embed/8I1qS2Nxsu0' WHERE belt_level = 'blue' AND video_url IS NULL;
UPDATE public.techniques SET video_url = 'https://www.youtube.com/embed/Yz_kuZ6cmL4' WHERE belt_level = 'purple' AND video_url IS NULL;
UPDATE public.techniques SET video_url = 'https://www.youtube.com/embed/PoR1Ot_iEU0' WHERE belt_level = 'brown' AND video_url IS NULL;
UPDATE public.techniques SET video_url = 'https://www.youtube.com/embed/2GpgkW9rj_M' WHERE belt_level = 'black' AND video_url IS NULL;
