
ALTER TABLE public.attendance         DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
ALTER TABLE public.attendance         DROP CONSTRAINT IF EXISTS attendance_class_id_fkey;
ALTER TABLE public.certificates       DROP CONSTRAINT IF EXISTS certificates_student_id_fkey;
ALTER TABLE public.championships      DROP CONSTRAINT IF EXISTS championships_student_id_fkey;
ALTER TABLE public.classes            DROP CONSTRAINT IF EXISTS classes_branch_id_fkey;
ALTER TABLE public.classes            DROP CONSTRAINT IF EXISTS classes_instructor_id_fkey;
ALTER TABLE public.instructor_videos  DROP CONSTRAINT IF EXISTS instructor_videos_instructor_id_fkey;
ALTER TABLE public.instructors        DROP CONSTRAINT IF EXISTS instructors_branch_id_fkey;
ALTER TABLE public.notifications      DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.students           DROP CONSTRAINT IF EXISTS students_branch_id_fkey;
ALTER TABLE public.technique_progress DROP CONSTRAINT IF EXISTS technique_progress_evaluated_by_fkey;
ALTER TABLE public.technique_progress DROP CONSTRAINT IF EXISTS technique_progress_student_id_fkey;
ALTER TABLE public.technique_progress DROP CONSTRAINT IF EXISTS technique_progress_technique_id_fkey;
ALTER TABLE public.user_roles         DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
