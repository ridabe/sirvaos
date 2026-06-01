-- ============================================================
-- Corrige recursão infinita nas policies RLS da Escola Bíblica
-- Causa: bs_enroll_sel junta bible_school_students (com RLS)
--        bs_students_sel junta bible_school_enrollments (com RLS)
-- Solução: funções SECURITY DEFINER que consultam sem RLS,
--          quebrando o ciclo de referência.
-- ============================================================

-- ── 1. Função: matrícula pertence ao membro atual ────────────────────────────
-- Usada por bs_enroll_sel para verificar se o aluno é o membro logado,
-- sem passar pela RLS de bible_school_students.

CREATE OR REPLACE FUNCTION app_private.enrollment_belongs_to_current_member(
  p_student_id uuid,
  p_tenant_id  uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bible_school_students
    WHERE id        = p_student_id
      AND tenant_id = p_tenant_id
      AND member_id = app_private.current_member_id()
  );
$$;

-- ── 2. Função: aluno tem matrícula na turma de um professor ──────────────────
-- Usada por bs_students_sel para verificar se o membro logado é professor
-- de uma turma em que o aluno está matriculado, sem passar pela RLS de
-- bible_school_enrollments.

CREATE OR REPLACE FUNCTION app_private.student_enrolled_in_teacher_class(
  p_student_id uuid,
  p_tenant_id  uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bible_school_enrollments bse
    JOIN public.bible_school_class_teachers bct
      ON  bct.tenant_id = bse.tenant_id
      AND bct.class_id  = bse.class_id
    JOIN public.bible_school_teachers bst
      ON  bst.id        = bct.teacher_id
      AND bst.tenant_id = bct.tenant_id
    WHERE bse.tenant_id  = p_tenant_id
      AND bse.student_id = p_student_id
      AND bst.member_id  = app_private.current_member_id()
  );
$$;

-- ── 3. Recriar bs_enroll_sel sem join em bible_school_students ───────────────

DROP POLICY IF EXISTS bs_enroll_sel ON public.bible_school_enrollments;

CREATE POLICY bs_enroll_sel
ON public.bible_school_enrollments
FOR SELECT
TO authenticated
USING (
  app_private.is_global_admin()
  OR (
    tenant_id = app_private.current_tenant_id()
    AND app_private.is_module_enabled('bible-school')
    AND (
      app_private.can_manage_module('bible-school')
      -- aluno vê suas próprias matrículas (sem join com RLS)
      OR app_private.enrollment_belongs_to_current_member(student_id, tenant_id)
      -- professor vê matrículas das suas turmas
      OR EXISTS (
        SELECT 1
        FROM public.bible_school_class_teachers bct
        JOIN public.bible_school_teachers bst
          ON  bst.id        = bct.teacher_id
          AND bst.tenant_id = bct.tenant_id
        WHERE bct.tenant_id = bible_school_enrollments.tenant_id
          AND bct.class_id  = bible_school_enrollments.class_id
          AND bst.member_id = app_private.current_member_id()
      )
    )
  )
);

-- ── 4. Recriar bs_students_sel sem join em bible_school_enrollments ──────────

DROP POLICY IF EXISTS bs_students_sel ON public.bible_school_students;

CREATE POLICY bs_students_sel
ON public.bible_school_students
FOR SELECT
TO authenticated
USING (
  app_private.is_global_admin()
  OR (
    tenant_id = app_private.current_tenant_id()
    AND app_private.is_module_enabled('bible-school')
    AND (
      app_private.can_manage_module('bible-school')
      -- o próprio aluno (membro) vê seu cadastro
      OR member_id = app_private.current_member_id()
      -- professor vê alunos matriculados nas suas turmas (sem join com RLS)
      OR app_private.student_enrolled_in_teacher_class(id, tenant_id)
    )
  )
);
