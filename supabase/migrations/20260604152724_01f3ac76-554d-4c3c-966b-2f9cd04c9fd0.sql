
-- Drop duplicate notification triggers
DROP TRIGGER IF EXISTS trg_notify_booking ON public.attendance;
DROP TRIGGER IF EXISTS trg_notify_new_class ON public.classes;

-- Monthly top function: hours+classes by student for a given month
CREATE OR REPLACE FUNCTION public.monthly_top_students(_month date, _branch_id uuid DEFAULT NULL, _limit int DEFAULT 5)
RETURNS TABLE(student_id uuid, full_name text, avatar_url text, branch_id uuid, branch_name text, hours numeric, classes_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id AS student_id,
    p.full_name,
    p.avatar_url,
    s.branch_id,
    b.name AS branch_name,
    COALESCE(SUM(c.duration_hours), 0)::numeric AS hours,
    COUNT(a.id)::bigint AS classes_count
  FROM public.attendance a
  JOIN public.classes c ON c.id = a.class_id
  JOIN public.students s ON s.id = a.student_id
  JOIN public.profiles p ON p.id = s.id
  LEFT JOIN public.branches b ON b.id = s.branch_id
  WHERE a.check_in_status = 'present'
    AND c.date >= date_trunc('month', _month)::date
    AND c.date <  (date_trunc('month', _month) + interval '1 month')::date
    AND (_branch_id IS NULL OR s.branch_id = _branch_id)
  GROUP BY s.id, p.full_name, p.avatar_url, s.branch_id, b.name
  ORDER BY hours DESC, classes_count DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.monthly_top_students(date, uuid, int) TO authenticated;
