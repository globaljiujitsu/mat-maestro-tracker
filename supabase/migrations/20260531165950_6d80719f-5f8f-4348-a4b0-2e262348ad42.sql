
-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE public.belt_rank AS ENUM ('white', 'blue', 'purple', 'brown', 'black');
CREATE TYPE public.class_status AS ENUM ('scheduled', 'cancelled', 'completed');
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled', 'none');
CREATE TYPE public.check_in_status AS ENUM ('present', 'absent', 'pending');
CREATE TYPE public.technique_status AS ENUM ('not_evaluated', 'in_progress', 'mastered');
CREATE TYPE public.championship_result AS ENUM ('oro', 'plata', 'bronce', 'participacion');
CREATE TYPE public.certificate_type AS ENUM ('student_of_month', 'belt_promotion');
CREATE TYPE public.ranking_type AS ENUM ('global', 'branch');

-- =====================================================
-- BRANCHES
-- =====================================================
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.branches TO anon, authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES (extends auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER ROLES (separate table — anti-privilege-escalation)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- =====================================================
-- INSTRUCTORS
-- =====================================================
CREATE TABLE public.instructors (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  age INTEGER,
  belt_rank public.belt_rank NOT NULL DEFAULT 'black',
  biography TEXT,
  years_of_experience INTEGER DEFAULT 0,
  championships_won TEXT[] DEFAULT '{}',
  total_classes_taught INTEGER NOT NULL DEFAULT 0,
  branch_id UUID REFERENCES public.branches(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.instructors TO authenticated;
GRANT ALL ON public.instructors TO service_role;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STUDENTS
-- =====================================================
CREATE TABLE public.students (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  age INTEGER,
  belt_rank public.belt_rank NOT NULL DEFAULT 'white',
  branch_id UUID REFERENCES public.branches(id),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attendance_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  total_classes_attended INTEGER NOT NULL DEFAULT 0,
  total_training_hours NUMERIC(8,2) NOT NULL DEFAULT 0.0,
  ranking_position_global INTEGER,
  ranking_position_branch INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CLASSES
-- =====================================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  instructor_id UUID NOT NULL REFERENCES public.instructors(id),
  max_capacity INTEGER NOT NULL DEFAULT 20,
  status public.class_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ATTENDANCE
-- =====================================================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  booking_status public.booking_status NOT NULL DEFAULT 'none',
  check_in_status public.check_in_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TECHNIQUES (curriculum)
-- =====================================================
CREATE TABLE public.techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  belt_level public.belt_rank NOT NULL,
  category TEXT NOT NULL,
  lottie_url TEXT,
  description TEXT,
  learning_objectives TEXT[] DEFAULT '{}',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.techniques TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.techniques TO authenticated;
GRANT ALL ON public.techniques TO service_role;
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TECHNIQUE PROGRESS
-- =====================================================
CREATE TABLE public.technique_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  status public.technique_status NOT NULL DEFAULT 'not_evaluated',
  evaluated_by UUID REFERENCES public.instructors(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, technique_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technique_progress TO authenticated;
GRANT ALL ON public.technique_progress TO service_role;
ALTER TABLE public.technique_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CHAMPIONSHIPS
-- =====================================================
CREATE TABLE public.championships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  result public.championship_result NOT NULL,
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.championships TO authenticated;
GRANT ALL ON public.championships TO service_role;
ALTER TABLE public.championships ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RANKINGS
-- =====================================================
CREATE TABLE public.rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  type public.ranking_type NOT NULL,
  weekly_attendance_count INTEGER NOT NULL DEFAULT 0,
  weekly_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  rank_position INTEGER,
  week_start DATE NOT NULL DEFAULT date_trunc('week', now())::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rankings TO authenticated;
GRANT ALL ON public.rankings TO service_role;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CERTIFICATES
-- =====================================================
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type public.certificate_type NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pdf_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INSTRUCTOR VIDEOS
-- =====================================================
CREATE TABLE public.instructor_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  publication_date TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_videos TO authenticated;
GRANT ALL ON public.instructor_videos TO service_role;
ALTER TABLE public.instructor_videos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TRIGGER: auto-create profile on user signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  -- default role: student (unless metadata says otherwise)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student')
  );
  -- create student record by default
  INSERT INTO public.students (id, branch_id)
  VALUES (NEW.id, NULL)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- branches: everyone reads, admin writes
CREATE POLICY "branches_select_all" ON public.branches FOR SELECT USING (true);
CREATE POLICY "branches_admin_all" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- instructors
CREATE POLICY "instructors_select_all_auth" ON public.instructors FOR SELECT TO authenticated USING (true);
CREATE POLICY "instructors_update_own" ON public.instructors FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "instructors_admin_all" ON public.instructors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- students
CREATE POLICY "students_select_all_auth" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "students_update_own" ON public.students FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "students_admin_instructor_all" ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'));

-- classes
CREATE POLICY "classes_select_all_auth" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "classes_instructor_own" ON public.classes FOR ALL TO authenticated
  USING (instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- attendance
CREATE POLICY "attendance_select_own" ON public.attendance FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "attendance_student_book" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "attendance_student_update" ON public.attendance FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "attendance_admin_all" ON public.attendance FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- techniques: read filtered by belt in app layer; admin/instructor write
CREATE POLICY "techniques_select_all_auth" ON public.techniques FOR SELECT TO authenticated USING (true);
CREATE POLICY "techniques_admin_instructor_write" ON public.techniques FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'));

-- technique_progress
CREATE POLICY "tp_select_own" ON public.technique_progress FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'));
CREATE POLICY "tp_admin_instructor_write" ON public.technique_progress FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'));

-- championships
CREATE POLICY "champ_select_all_auth" ON public.championships FOR SELECT TO authenticated USING (true);
CREATE POLICY "champ_student_own" ON public.championships FOR ALL TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- rankings
CREATE POLICY "rankings_select_all_auth" ON public.rankings FOR SELECT TO authenticated USING (true);

-- certificates
CREATE POLICY "cert_select_own" ON public.certificates FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'instructor'));

-- instructor_videos
CREATE POLICY "iv_select_all_auth" ON public.instructor_videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "iv_instructor_own" ON public.instructor_videos FOR ALL TO authenticated
  USING (instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (instructor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- notifications
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('championships', 'championships', true),
  ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_user_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "champ_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'championships');
CREATE POLICY "champ_user_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'championships' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "champ_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'championships' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "cert_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'certificates');

-- =====================================================
-- SEED DATA: Branches
-- =====================================================
INSERT INTO public.branches (name, slug) VALUES
  ('Ñuñoa', 'nunoa'),
  ('Providencia', 'providencia'),
  ('Las Condes', 'las-condes')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SEED DATA: Techniques
-- =====================================================
INSERT INTO public.techniques (title, belt_level, category, description, learning_objectives, display_order) VALUES
  -- WHITE
  ('Posición de Guardia Cerrada', 'white', 'Posiciones básicas', 'Fundamento de la guardia cerrada en BJJ.', ARRAY['Mantener postura', 'Romper postura del oponente'], 1),
  ('Escape de Montada', 'white', 'Escapes básicos', 'Escape básico desde la posición de montada.', ARRAY['Upa correcto', 'Cadera fuerte'], 2),
  ('Americana desde Montada', 'white', 'Sumisiones básicas', 'Sumisión fundamental de hombro.', ARRAY['Bloqueo correcto', 'Presión continua'], 3),
  ('Movimientos básicos: Shrimping', 'white', 'Movimientos fundamentales', 'Camarón hacia atrás.', ARRAY['Postura de cadera', 'Crear espacio'], 4),
  -- BLUE
  ('Paso de guardia con presión', 'blue', 'Paso de guardia', 'Técnica de pase con control de cadera.', ARRAY['Presión constante', 'Control postural'], 1),
  ('Barrida de Tijera', 'blue', 'Barridas', 'Barrida clásica desde guardia cerrada.', ARRAY['Ángulo correcto', 'Timing'], 2),
  ('Control de Espalda', 'blue', 'Control posicional', 'Mantener control con ganchos.', ARRAY['Ganchos firmes', 'Control de muñeca'], 3),
  -- PURPLE
  ('Berimbolo', 'purple', 'Transiciones avanzadas', 'Inversión avanzada desde De La Riva.', ARRAY['Rotación de cadera', 'Toma de espalda'], 1),
  ('Lapel Guard System', 'purple', 'Combinaciones', 'Sistema de guardia con solapa.', ARRAY['Control de lapela', 'Setup de barrida'], 2),
  -- BROWN
  ('Estrategia competitiva avanzada', 'brown', 'Estrategia avanzada', 'Game plan para competencia.', ARRAY['Lectura de oponente', 'Gestión de tiempo'], 1),
  ('Preparación física específica', 'brown', 'Preparación para competencia', 'Conditioning para BJJ.', ARRAY['Resistencia', 'Fuerza relativa'], 2),
  -- BLACK
  ('Sistemas de alto nivel', 'black', 'Conceptos expertos', 'Sistemas integrados ofensivos y defensivos.', ARRAY['Conexión técnica', 'Adaptabilidad'], 1),
  ('Metodologías de enseñanza', 'black', 'Metodologías', 'Cómo enseñar BJJ efectivamente.', ARRAY['Pedagogía', 'Análisis técnico'], 2)
ON CONFLICT DO NOTHING;
