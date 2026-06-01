import {
  Baby,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock3,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Music,
  Plus,
  QrCode,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button, TextField } from "../design-system/components";
import { supabase } from "../lib/supabase";

type LoginStatus = "idle" | "loading" | "success" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";

type MemberAssignment = {
  id: string;
  event_id: string;
  member_id: string;
  role_id: string | null;
  role_name: string | null;
  arrival_at: string | null;
  status: "pending" | "confirmed" | "declined" | "standby";
  decline_reason: string | null;
  notes: string | null;
  worship_events: {
    id: string;
    title: string;
    event_type: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    notes: string | null;
  } | null;
  worship_roles: { name: string } | null;
};

type MemberProfile = {
  id: string;
  full_name: string | null;
  email: string;
  tenant_id: string | null;
  member_id: string | null;
  status: string;
};

type KidsGroupRecord = {
  id: string;
  name: string;
};

type KidsChildRecord = {
  id: string;
  tenant_id: string;
  name: string;
  date_of_birth: string | null;
  group_id: string | null;
  allergies: string | null;
  special_needs: string | null;
  notes: string | null;
  is_active: boolean;
  kids_groups: { name: string } | null;
};

type KidsGuardianRecord = {
  id: string;
  child_id: string;
  name: string;
  phone: string | null;
  relationship: "parent" | "grandparent" | "sibling" | "guardian" | "other";
  is_primary: boolean;
};

type KidsCheckinPassRecord = {
  id: string;
  child_id: string;
  pass_token: string;
  valid_from: string;
  valid_until: string;
  used_at: string | null;
  created_at: string;
};

type BibleSchoolClassRecord = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

type BibleSchoolMaterialRecord = {
  id: string;
  tenant_id: string;
  class_id: string;
  title: string;
  kind: "link" | "file" | "text";
  url: string | null;
  content: string | null;
  created_at: string;
};

type BibleSchoolTeacherSelfRecord = {
  id: string;
  tenant_id: string;
  member_id: string;
  role: "admin" | "teacher";
};

type BibleSchoolStudentRecord = {
  id: string;
  tenant_id: string;
  member_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

type BibleSchoolEnrollmentRecord = {
  id: string;
  tenant_id: string;
  class_id: string;
  student_id: string;
  status: "active" | "inactive";
  enrolled_at: string;
  bible_school_students: BibleSchoolStudentRecord | null;
};

type BibleSchoolSessionRecord = {
  id: string;
  tenant_id: string;
  class_id: string;
  session_date: string;
  topic: string | null;
  notes: string | null;
  created_at: string;
};

type BibleSchoolAttendanceRecord = {
  id: string;
  tenant_id: string;
  session_id: string;
  enrollment_id: string;
  status: "present" | "absent" | "excused";
  notes: string | null;
  created_at: string;
};

type BibleSchoolGradeRecord = {
  id: string;
  tenant_id: string;
  enrollment_id: string;
  title: string;
  score: number | null;
  max_score: number | null;
  notes: string | null;
  created_at: string;
};

type BibleSchoolClassFormState = {
  id: string | null;
  name: string;
  description: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

type BibleSchoolSessionFormState = {
  session_date: string;
  topic: string;
  notes: string;
};

type BibleSchoolMaterialFormState = {
  title: string;
  kind: "link" | "text" | "file";
  url: string;
  content: string;
  file: File | null;
};

type BibleSchoolGradeFormState = {
  enrollment_id: string;
  title: string;
  score: string;
  max_score: string;
  notes: string;
};

type KidsChildFormState = {
  id: string | null;
  name: string;
  date_of_birth: string;
  group_id: string;
  allergies: string;
  special_needs: string;
  notes: string;
};

const emptyKidsChildForm: KidsChildFormState = {
  id: null,
  name: "",
  date_of_birth: "",
  group_id: "",
  allergies: "",
  special_needs: "",
  notes: "",
};

const emptyBibleSchoolSessionForm: BibleSchoolSessionFormState = {
  session_date: new Date().toISOString().slice(0, 10),
  topic: "",
  notes: "",
};

const emptyBibleSchoolMaterialForm: BibleSchoolMaterialFormState = {
  title: "",
  kind: "link",
  url: "",
  content: "",
  file: null,
};

const emptyBibleSchoolGradeForm: BibleSchoolGradeFormState = {
  enrollment_id: "",
  title: "",
  score: "",
  max_score: "",
  notes: "",
};

const emptyBibleSchoolClassForm: BibleSchoolClassFormState = {
  id: null,
  name: "",
  description: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

export function MemberPortal() {
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [assignments, setAssignments] = useState<MemberAssignment[]>([]);
  const [kidsGroups, setKidsGroups] = useState<KidsGroupRecord[]>([]);
  const [kidsChildren, setKidsChildren] = useState<KidsChildRecord[]>([]);
  const [kidsGuardiansByChildId, setKidsGuardiansByChildId] = useState<Record<string, KidsGuardianRecord[]>>({});
  const [kidsPassesByChildId, setKidsPassesByChildId] = useState<Record<string, KidsCheckinPassRecord[]>>({});
  const [kidsForm, setKidsForm] = useState<KidsChildFormState>(emptyKidsChildForm);
  const [isKidsFormOpen, setIsKidsFormOpen] = useState(false);
  const [kidsMessage, setKidsMessage] = useState("");
  const [kidsStatus, setKidsStatus] = useState<LoginStatus>("idle");
  const [bibleSchoolEnabled, setBibleSchoolEnabled] = useState(false);
  const [bibleSchoolIsModuleAdmin, setBibleSchoolIsModuleAdmin] = useState(false);
  const [bibleSchoolCanManage, setBibleSchoolCanManage] = useState(false);
  const [bibleSchoolIsTeacher, setBibleSchoolIsTeacher] = useState(false);
  const [bibleSchoolTeacherId, setBibleSchoolTeacherId] = useState<string | null>(null);
  const [bibleSchoolIsTeacherForSelectedClass, setBibleSchoolIsTeacherForSelectedClass] = useState(false);
  const [bibleSchoolClasses, setBibleSchoolClasses] = useState<BibleSchoolClassRecord[]>([]);
  const [selectedBibleSchoolClassId, setSelectedBibleSchoolClassId] = useState<string | null>(null);
  const [bibleSchoolSessions, setBibleSchoolSessions] = useState<BibleSchoolSessionRecord[]>([]);
  const [selectedBibleSchoolSessionId, setSelectedBibleSchoolSessionId] = useState<string | null>(null);
  const [bibleSchoolEnrollments, setBibleSchoolEnrollments] = useState<BibleSchoolEnrollmentRecord[]>([]);
  const [bibleSchoolAttendance, setBibleSchoolAttendance] = useState<BibleSchoolAttendanceRecord[]>([]);
  const [bibleSchoolMaterials, setBibleSchoolMaterials] = useState<BibleSchoolMaterialRecord[]>([]);
  const [bibleSchoolGrades, setBibleSchoolGrades] = useState<BibleSchoolGradeRecord[]>([]);
  const [bibleSchoolActionStatus, setBibleSchoolActionStatus] = useState<LoginStatus>("idle");
  const [bibleSchoolActionMessage, setBibleSchoolActionMessage] = useState("");
  const [isBibleSchoolClassFormOpen, setIsBibleSchoolClassFormOpen] = useState(false);
  const [bibleSchoolClassForm, setBibleSchoolClassForm] = useState<BibleSchoolClassFormState>(emptyBibleSchoolClassForm);
  const [isBibleSchoolSessionFormOpen, setIsBibleSchoolSessionFormOpen] = useState(false);
  const [bibleSchoolSessionForm, setBibleSchoolSessionForm] = useState<BibleSchoolSessionFormState>(emptyBibleSchoolSessionForm);
  const [isBibleSchoolMaterialFormOpen, setIsBibleSchoolMaterialFormOpen] = useState(false);
  const [bibleSchoolMaterialForm, setBibleSchoolMaterialForm] = useState<BibleSchoolMaterialFormState>(emptyBibleSchoolMaterialForm);
  const [isBibleSchoolGradeFormOpen, setIsBibleSchoolGradeFormOpen] = useState(false);
  const [bibleSchoolGradeForm, setBibleSchoolGradeForm] = useState<BibleSchoolGradeFormState>(emptyBibleSchoolGradeForm);
  const [selectedPassChildId, setSelectedPassChildId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [actionStatus, setActionStatus] = useState<Record<string, "loading" | "done">>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void loadPortalData(data.session.user.id);
      }
    });
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginStatus("loading");
    setLoginMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setLoginStatus("error");
      setLoginMessage("Informe e-mail e senha.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoginStatus("error");
      setLoginMessage("E-mail ou senha inválidos.");
      return;
    }

    setLoginStatus("success");
    await loadPortalData(data.user.id);
  }

  async function loadPortalData(userId: string) {
    setLoadStatus("loading");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, tenant_id, member_id, status")
      .eq("id", userId)
      .single<MemberProfile>();

    if (profileError || !profileData) {
      setLoadStatus("error");
      return;
    }

    setProfile(profileData);

    if (!profileData.member_id || !profileData.tenant_id) {
      setAssignments([]);
      setKidsGroups([]);
      setKidsChildren([]);
      setKidsGuardiansByChildId({});
      setKidsPassesByChildId({});
      setBibleSchoolEnabled(false);
      setBibleSchoolIsModuleAdmin(false);
      setBibleSchoolCanManage(false);
      setBibleSchoolIsTeacher(false);
      setBibleSchoolTeacherId(null);
      setBibleSchoolIsTeacherForSelectedClass(false);
      setBibleSchoolClasses([]);
      setSelectedBibleSchoolClassId(null);
      setBibleSchoolSessions([]);
      setSelectedBibleSchoolSessionId(null);
      setBibleSchoolEnrollments([]);
      setBibleSchoolAttendance([]);
      setBibleSchoolMaterials([]);
      setBibleSchoolGrades([]);
      setBibleSchoolActionStatus("idle");
      setBibleSchoolActionMessage("");
      setIsBibleSchoolClassFormOpen(false);
      setBibleSchoolClassForm(emptyBibleSchoolClassForm);
      setIsBibleSchoolSessionFormOpen(false);
      setBibleSchoolSessionForm(emptyBibleSchoolSessionForm);
      setIsBibleSchoolMaterialFormOpen(false);
      setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
      setIsBibleSchoolGradeFormOpen(false);
      setBibleSchoolGradeForm(emptyBibleSchoolGradeForm);
      setLoadStatus("ready");
      return;
    }

    const { data: assignmentsData } = await supabase
      .from("worship_assignments")
      .select(
        "id, event_id, member_id, role_id, role_name, arrival_at, status, decline_reason, notes, worship_events (id, title, event_type, starts_at, ends_at, location, notes), worship_roles (name)",
      )
      .eq("member_id", profileData.member_id)
      .eq("tenant_id", profileData.tenant_id)
      .order("event_id", { ascending: true })
      .returns<MemberAssignment[]>();

    const sorted = (assignmentsData ?? []).sort((a, b) => {
      const dateA = a.worship_events?.starts_at ?? "";
      const dateB = b.worship_events?.starts_at ?? "";
      return dateA.localeCompare(dateB);
    });

    setAssignments(sorted);

    const [groupsResult, guardiansResult] = await Promise.all([
      supabase
        .from("kids_groups")
        .select("id, name")
        .eq("tenant_id", profileData.tenant_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .returns<KidsGroupRecord[]>(),
      supabase
        .from("kids_guardians")
        .select(
          "id, child_id, name, phone, relationship, is_primary, kids_children (id, tenant_id, name, date_of_birth, group_id, allergies, special_needs, notes, is_active, kids_groups (name))",
        )
        .eq("tenant_id", profileData.tenant_id)
        .eq("member_id", profileData.member_id)
        .returns<
          Array<
            KidsGuardianRecord & {
              kids_children: KidsChildRecord | null;
            }
          >
        >(),
    ]);

    if (!groupsResult.error) {
      setKidsGroups(groupsResult.data ?? []);
    } else {
      setKidsGroups([]);
    }

    const guardianRows = guardiansResult.data ?? [];
    const childById = new Map<string, KidsChildRecord>();
    const guardiansByChild: Record<string, KidsGuardianRecord[]> = {};

    for (const row of guardianRows) {
      if (!row.kids_children) continue;
      childById.set(row.kids_children.id, row.kids_children);
      if (!guardiansByChild[row.child_id]) guardiansByChild[row.child_id] = [];
      guardiansByChild[row.child_id].push({
        id: row.id,
        child_id: row.child_id,
        name: row.name,
        phone: row.phone,
        relationship: row.relationship,
        is_primary: row.is_primary,
      });
    }

    const children = Array.from(childById.values()).sort((a, b) => a.name.localeCompare(b.name));
    setKidsChildren(children);
    setKidsGuardiansByChildId(guardiansByChild);

    if (children.length > 0) {
      const childIds = children.map((c) => c.id);
      const passesResult = await supabase
        .from("kids_checkin_passes")
        .select("id, child_id, pass_token, valid_from, valid_until, used_at, created_at")
        .in("child_id", childIds)
        .order("created_at", { ascending: false })
        .returns<KidsCheckinPassRecord[]>();

      if (!passesResult.error) {
        const grouped = (passesResult.data ?? []).reduce<Record<string, KidsCheckinPassRecord[]>>((acc, pass) => {
          if (!acc[pass.child_id]) acc[pass.child_id] = [];
          acc[pass.child_id].push(pass);
          return acc;
        }, {});
        setKidsPassesByChildId(grouped);
      } else {
        setKidsPassesByChildId({});
      }
    } else {
      setKidsPassesByChildId({});
    }

    const bibleSchoolEnabledResult = await supabase.rpc("is_module_enabled", {
      module_code: "bible-school",
    });
    const enabled = Boolean(bibleSchoolEnabledResult.data);
    setBibleSchoolEnabled(enabled);

    if (!enabled) {
      setBibleSchoolCanManage(false);
      setBibleSchoolIsTeacher(false);
      setBibleSchoolTeacherId(null);
      setBibleSchoolIsModuleAdmin(false);
      setBibleSchoolIsTeacherForSelectedClass(false);
      setBibleSchoolClasses([]);
      setSelectedBibleSchoolClassId(null);
      setBibleSchoolSessions([]);
      setSelectedBibleSchoolSessionId(null);
      setBibleSchoolEnrollments([]);
      setBibleSchoolAttendance([]);
      setBibleSchoolMaterials([]);
      setBibleSchoolGrades([]);
      setBibleSchoolActionStatus("idle");
      setBibleSchoolActionMessage("");
      setIsBibleSchoolClassFormOpen(false);
      setBibleSchoolClassForm(emptyBibleSchoolClassForm);
      setIsBibleSchoolSessionFormOpen(false);
      setBibleSchoolSessionForm(emptyBibleSchoolSessionForm);
      setIsBibleSchoolMaterialFormOpen(false);
      setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
      setIsBibleSchoolGradeFormOpen(false);
      setBibleSchoolGradeForm(emptyBibleSchoolGradeForm);
      setLoadStatus("ready");
      return;
    }

    const teacherResult = await supabase
      .from("bible_school_teachers")
      .select("id, tenant_id, member_id, role")
      .eq("tenant_id", profileData.tenant_id)
      .eq("member_id", profileData.member_id)
      .maybeSingle<BibleSchoolTeacherSelfRecord>();

    const isTeacher = Boolean(teacherResult.data?.id);
    setBibleSchoolIsTeacher(isTeacher);
    setBibleSchoolTeacherId(teacherResult.data?.id ?? null);

    const bibleSchoolCanManageResult = await supabase.rpc("can_manage_module", {
      module_code: "bible-school",
    });
    const canManageModule = Boolean(bibleSchoolCanManageResult.data);
    setBibleSchoolIsModuleAdmin(canManageModule);
    setBibleSchoolCanManage(canManageModule || isTeacher);

    const bibleClassesResult = await supabase
      .from("bible_school_classes")
      .select("id, tenant_id, name, description, starts_at, ends_at, is_active")
      .eq("tenant_id", profileData.tenant_id)
      .order("created_at", { ascending: false })
      .returns<BibleSchoolClassRecord[]>();

    const bibleClasses = bibleClassesResult.data ?? [];
    setBibleSchoolClasses(bibleClasses);

    if (bibleClasses.length === 0) {
      setSelectedBibleSchoolClassId(null);
      setBibleSchoolSessions([]);
      setSelectedBibleSchoolSessionId(null);
      setBibleSchoolEnrollments([]);
      setBibleSchoolAttendance([]);
      setBibleSchoolMaterials([]);
      setBibleSchoolGrades([]);
      setLoadStatus("ready");
      return;
    }

    setSelectedBibleSchoolClassId((current) => current ?? bibleClasses[0]!.id);

    setLoadStatus("ready");
  }

  async function loadBibleSchoolClassData(tenantId: string, classId: string) {
    setBibleSchoolActionMessage("");

    const [sessionsResult, enrollmentsResult, materialsResult] = await Promise.all([
      supabase
        .from("bible_school_sessions")
        .select("id, tenant_id, class_id, session_date, topic, notes, created_at")
        .eq("tenant_id", tenantId)
        .eq("class_id", classId)
        .order("session_date", { ascending: false })
        .returns<BibleSchoolSessionRecord[]>(),
      supabase
        .from("bible_school_enrollments")
        .select(
          "id, tenant_id, class_id, student_id, status, enrolled_at, bible_school_students (id, tenant_id, member_id, name, email, phone, notes, created_at)",
        )
        .eq("tenant_id", tenantId)
        .eq("class_id", classId)
        .order("enrolled_at", { ascending: false })
        .returns<BibleSchoolEnrollmentRecord[]>(),
      supabase
        .from("bible_school_materials")
        .select("id, tenant_id, class_id, title, kind, url, content, created_at")
        .eq("tenant_id", tenantId)
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .returns<BibleSchoolMaterialRecord[]>(),
    ]);

    if (sessionsResult.error || enrollmentsResult.error || materialsResult.error) {
      setBibleSchoolSessions([]);
      setBibleSchoolEnrollments([]);
      setBibleSchoolMaterials([]);
      setBibleSchoolGrades([]);
      setSelectedBibleSchoolSessionId(null);
      setBibleSchoolAttendance([]);
      setBibleSchoolActionMessage("Não foi possível carregar dados da turma da Escola Bíblica.");
      return;
    }

    setBibleSchoolSessions(sessionsResult.data ?? []);
    setBibleSchoolEnrollments(enrollmentsResult.data ?? []);
    setBibleSchoolMaterials(materialsResult.data ?? []);

    const enrollmentIds = (enrollmentsResult.data ?? []).map((row) => row.id);
    if (enrollmentIds.length === 0) {
      setBibleSchoolGrades([]);
    } else {
      const gradesResult = await supabase
        .from("bible_school_grades")
        .select("id, tenant_id, enrollment_id, title, score, max_score, notes, created_at")
        .eq("tenant_id", tenantId)
        .in("enrollment_id", enrollmentIds)
        .order("created_at", { ascending: false })
        .returns<BibleSchoolGradeRecord[]>();

      setBibleSchoolGrades(gradesResult.data ?? []);
    }

    const nextSessionId = (sessionsResult.data ?? [])[0]?.id ?? null;
    setSelectedBibleSchoolSessionId(nextSessionId);
  }

  async function loadBibleSchoolAttendance(tenantId: string, sessionId: string) {
    const attendanceResult = await supabase
      .from("bible_school_attendance")
      .select("id, tenant_id, session_id, enrollment_id, status, notes, created_at")
      .eq("tenant_id", tenantId)
      .eq("session_id", sessionId)
      .returns<BibleSchoolAttendanceRecord[]>();

    if (attendanceResult.error) {
      setBibleSchoolAttendance([]);
      return;
    }

    setBibleSchoolAttendance(attendanceResult.data ?? []);
  }

  async function reloadBibleSchoolClasses(tenantId: string) {
    const classesResult = await supabase
      .from("bible_school_classes")
      .select("id, tenant_id, name, description, starts_at, ends_at, is_active")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .returns<BibleSchoolClassRecord[]>();

    if (classesResult.error) {
      setBibleSchoolClasses([]);
      setSelectedBibleSchoolClassId(null);
      return;
    }

    const classes = classesResult.data ?? [];
    setBibleSchoolClasses(classes);
    setSelectedBibleSchoolClassId((current) => {
      if (current && classes.some((item) => item.id === current)) {
        return current;
      }
      return classes[0]?.id ?? null;
    });
  }

  function openBibleSchoolCreateClassForm() {
    if (!profile?.tenant_id || !bibleSchoolCanManage) {
      return;
    }
    setBibleSchoolClassForm(emptyBibleSchoolClassForm);
    setIsBibleSchoolClassFormOpen(true);
  }

  function openBibleSchoolEditClassForm() {
    if (!profile?.tenant_id || !bibleSchoolCanManage || !selectedBibleSchoolClassId) {
      return;
    }

    const current = bibleSchoolClasses.find((item) => item.id === selectedBibleSchoolClassId) ?? null;
    if (!current) {
      return;
    }

    setBibleSchoolClassForm({
      id: current.id,
      name: current.name,
      description: current.description ?? "",
      starts_at: current.starts_at ?? "",
      ends_at: current.ends_at ?? "",
      is_active: current.is_active,
    });
    setIsBibleSchoolClassFormOpen(true);
  }

  async function handleBibleSchoolClassSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.tenant_id || !bibleSchoolCanManage) {
      return;
    }

    const name = bibleSchoolClassForm.name.trim();
    if (!name) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Informe o nome da turma.");
      return;
    }

    setBibleSchoolActionStatus("loading");
    setBibleSchoolActionMessage("");

    const payload = {
      tenant_id: profile.tenant_id,
      name,
      description: bibleSchoolClassForm.description.trim() || null,
      starts_at: bibleSchoolClassForm.starts_at || null,
      ends_at: bibleSchoolClassForm.ends_at || null,
      is_active: bibleSchoolClassForm.is_active,
    };

    const result = bibleSchoolClassForm.id
      ? await supabase.from("bible_school_classes").update(payload).eq("id", bibleSchoolClassForm.id).select("id").single()
      : await supabase.from("bible_school_classes").insert(payload).select("id").single();

    const classId = (result.data as { id?: string } | null)?.id ?? null;
    if (result.error || !classId) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Não foi possível salvar a turma.");
      return;
    }

    if (!bibleSchoolClassForm.id && bibleSchoolTeacherId) {
      await supabase.from("bible_school_class_teachers").insert({
        tenant_id: profile.tenant_id,
        class_id: classId,
        teacher_id: bibleSchoolTeacherId,
      });
    }

    setBibleSchoolActionStatus("success");
    setIsBibleSchoolClassFormOpen(false);
    setBibleSchoolClassForm(emptyBibleSchoolClassForm);
    await reloadBibleSchoolClasses(profile.tenant_id);
    setSelectedBibleSchoolClassId(classId);
  }

  useEffect(() => {
    if (!bibleSchoolEnabled || !profile?.tenant_id || !selectedBibleSchoolClassId || !bibleSchoolTeacherId) {
      setBibleSchoolIsTeacherForSelectedClass(false);
      return;
    }

    supabase
      .from("bible_school_class_teachers")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("class_id", selectedBibleSchoolClassId)
      .eq("teacher_id", bibleSchoolTeacherId)
      .maybeSingle<{ id: string }>()
      .then(({ data }) => {
        setBibleSchoolIsTeacherForSelectedClass(Boolean(data?.id));
      });
  }, [bibleSchoolEnabled, profile?.tenant_id, selectedBibleSchoolClassId, bibleSchoolTeacherId]);

  useEffect(() => {
    if (!profile?.tenant_id || !selectedBibleSchoolClassId || !bibleSchoolEnabled) {
      return;
    }
    void loadBibleSchoolClassData(profile.tenant_id, selectedBibleSchoolClassId);
  }, [bibleSchoolEnabled, profile?.tenant_id, selectedBibleSchoolClassId]);

  useEffect(() => {
    if (!profile?.tenant_id || !selectedBibleSchoolSessionId || !bibleSchoolEnabled) {
      return;
    }
    void loadBibleSchoolAttendance(profile.tenant_id, selectedBibleSchoolSessionId);
  }, [bibleSchoolEnabled, profile?.tenant_id, selectedBibleSchoolSessionId]);

  async function handleBibleSchoolSessionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const canManageSelectedClass = bibleSchoolIsModuleAdmin || bibleSchoolIsTeacherForSelectedClass;
    if (!profile?.tenant_id || !selectedBibleSchoolClassId || !canManageSelectedClass) {
      return;
    }

    if (!bibleSchoolSessionForm.session_date) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Informe a data da aula.");
      return;
    }

    setBibleSchoolActionStatus("loading");
    setBibleSchoolActionMessage("");

    const result = await supabase.from("bible_school_sessions").insert({
      tenant_id: profile.tenant_id,
      class_id: selectedBibleSchoolClassId,
      session_date: bibleSchoolSessionForm.session_date,
      topic: bibleSchoolSessionForm.topic.trim() || null,
      notes: bibleSchoolSessionForm.notes.trim() || null,
    });

    if (result.error) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Não foi possível cadastrar a aula.");
      return;
    }

    setBibleSchoolActionStatus("success");
    setIsBibleSchoolSessionFormOpen(false);
    setBibleSchoolSessionForm(emptyBibleSchoolSessionForm);
    await loadBibleSchoolClassData(profile.tenant_id, selectedBibleSchoolClassId);
  }

  function openBibleSchoolGradeForm() {
    const canManageSelectedClass = bibleSchoolIsModuleAdmin || bibleSchoolIsTeacherForSelectedClass;
    if (!profile?.tenant_id || !selectedBibleSchoolClassId || !canManageSelectedClass) {
      return;
    }
    const firstEnrollment = bibleSchoolEnrollments[0]?.id ?? "";
    setBibleSchoolGradeForm({ ...emptyBibleSchoolGradeForm, enrollment_id: firstEnrollment });
    setIsBibleSchoolGradeFormOpen(true);
  }

  async function handleBibleSchoolGradeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const canManageSelectedClass = bibleSchoolIsModuleAdmin || bibleSchoolIsTeacherForSelectedClass;
    if (!profile?.tenant_id || !selectedBibleSchoolClassId || !canManageSelectedClass) {
      return;
    }

    const enrollmentId = bibleSchoolGradeForm.enrollment_id;
    const title = bibleSchoolGradeForm.title.trim();

    if (!enrollmentId) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Selecione uma matrícula.");
      return;
    }

    if (!title) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Informe um título para a nota.");
      return;
    }

    const scoreRaw = bibleSchoolGradeForm.score.trim();
    const maxScoreRaw = bibleSchoolGradeForm.max_score.trim();
    const score = scoreRaw ? Number(scoreRaw.replace(",", ".")) : null;
    const maxScore = maxScoreRaw ? Number(maxScoreRaw.replace(",", ".")) : null;

    if (scoreRaw && Number.isNaN(score as number)) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Informe um valor de nota válido.");
      return;
    }

    if (maxScoreRaw && Number.isNaN(maxScore as number)) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Informe um valor de nota máxima válido.");
      return;
    }

    setBibleSchoolActionStatus("loading");
    setBibleSchoolActionMessage("");

    const result = await supabase.from("bible_school_grades").insert({
      tenant_id: profile.tenant_id,
      enrollment_id: enrollmentId,
      title,
      score,
      max_score: maxScore,
      notes: bibleSchoolGradeForm.notes.trim() || null,
    });

    if (result.error) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Não foi possível salvar a nota.");
      return;
    }

    setBibleSchoolActionStatus("success");
    setIsBibleSchoolGradeFormOpen(false);
    setBibleSchoolGradeForm(emptyBibleSchoolGradeForm);
    await loadBibleSchoolClassData(profile.tenant_id, selectedBibleSchoolClassId);
  }

  async function openBibleSchoolMaterial(mat: BibleSchoolMaterialRecord) {
    if (mat.kind === "link" && mat.url) {
      window.open(mat.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (mat.kind === "file" && mat.url) {
      const signed = await supabase.storage.from("bible-school-materials").createSignedUrl(mat.url, 60);
      const signedUrl = signed.data?.signedUrl ?? null;
      if (signed.error || !signedUrl) {
        setBibleSchoolActionStatus("error");
        setBibleSchoolActionMessage("Não foi possível gerar link de download.");
        return;
      }
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleBibleSchoolMaterialSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const canManageSelectedClass = bibleSchoolIsModuleAdmin || bibleSchoolIsTeacherForSelectedClass;
    if (!profile?.tenant_id || !selectedBibleSchoolClassId || !canManageSelectedClass) {
      return;
    }

    const title = bibleSchoolMaterialForm.title.trim();
    const kind = bibleSchoolMaterialForm.kind;
    const rawUrl = bibleSchoolMaterialForm.url.trim();
    const rawContent = bibleSchoolMaterialForm.content.trim();

    if (!title) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Informe o título do material.");
      return;
    }

    if (kind === "link" && !rawUrl) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Informe a URL do material.");
      return;
    }

    setBibleSchoolActionStatus("loading");
    setBibleSchoolActionMessage("");

    if (kind === "file") {
      const file = bibleSchoolMaterialForm.file;
      if (!file) {
        setBibleSchoolActionStatus("error");
        setBibleSchoolActionMessage("Selecione um arquivo para upload.");
        return;
      }

      const materialId = crypto.randomUUID();
      const safeName = (file.name || "arquivo").replace(/[^\w.\-]+/g, "-");
      const objectKey = `${profile.tenant_id}/${selectedBibleSchoolClassId}/${materialId}/${Date.now()}-${safeName}`;

      const uploadResult = await supabase.storage.from("bible-school-materials").upload(objectKey, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

      if (uploadResult.error) {
        setBibleSchoolActionStatus("error");
        setBibleSchoolActionMessage("Não foi possível fazer upload do arquivo.");
        return;
      }

      const insertResult = await supabase.from("bible_school_materials").insert({
        id: materialId,
        tenant_id: profile.tenant_id,
        class_id: selectedBibleSchoolClassId,
        title,
        kind,
        url: objectKey,
        content: null,
      });

      if (insertResult.error) {
        setBibleSchoolActionStatus("error");
        setBibleSchoolActionMessage("Arquivo enviado, mas não foi possível salvar o material.");
        return;
      }

      setBibleSchoolActionStatus("success");
      setIsBibleSchoolMaterialFormOpen(false);
      setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
      await loadBibleSchoolClassData(profile.tenant_id, selectedBibleSchoolClassId);
      return;
    }

    const result = await supabase.from("bible_school_materials").insert({
      tenant_id: profile.tenant_id,
      class_id: selectedBibleSchoolClassId,
      title,
      kind,
      url: kind === "link" ? rawUrl : null,
      content: kind === "text" ? rawContent : null,
    });

    if (result.error) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Não foi possível cadastrar o material.");
      return;
    }

    setBibleSchoolActionStatus("success");
    setIsBibleSchoolMaterialFormOpen(false);
    setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
    await loadBibleSchoolClassData(profile.tenant_id, selectedBibleSchoolClassId);
  }

  async function upsertBibleSchoolAttendance(enrollmentId: string, status: BibleSchoolAttendanceRecord["status"]) {
    const canManageSelectedClass = bibleSchoolIsModuleAdmin || bibleSchoolIsTeacherForSelectedClass;
    if (!profile?.tenant_id || !selectedBibleSchoolSessionId || !canManageSelectedClass) {
      return;
    }

    setBibleSchoolActionStatus("loading");
    setBibleSchoolActionMessage("");

    const existing = bibleSchoolAttendance.find((row) => row.enrollment_id === enrollmentId) ?? null;
    const payload = {
      tenant_id: profile.tenant_id,
      session_id: selectedBibleSchoolSessionId,
      enrollment_id: enrollmentId,
      status,
      notes: null,
    };

    const result = existing
      ? await supabase.from("bible_school_attendance").update(payload).eq("id", existing.id)
      : await supabase.from("bible_school_attendance").insert(payload);

    if (result.error) {
      setBibleSchoolActionStatus("error");
      setBibleSchoolActionMessage("Não foi possível registrar a presença.");
      return;
    }

    setBibleSchoolActionStatus("success");
    await loadBibleSchoolAttendance(profile.tenant_id, selectedBibleSchoolSessionId);
  }

  async function handleKidsChildSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.tenant_id || !profile.member_id) return;

    if (!kidsForm.name.trim()) {
      setKidsStatus("error");
      setKidsMessage("Informe o nome da criança.");
      return;
    }

    setKidsStatus("loading");
    setKidsMessage("");

    const payload = {
      tenant_id: profile.tenant_id,
      name: kidsForm.name.trim(),
      date_of_birth: kidsForm.date_of_birth || null,
      group_id: kidsForm.group_id || null,
      allergies: kidsForm.allergies.trim() || null,
      special_needs: kidsForm.special_needs.trim() || null,
      notes: kidsForm.notes.trim() || null,
    };

    if (kidsForm.id) {
      const { error } = await supabase.from("kids_children").update(payload).eq("id", kidsForm.id);
      if (error) {
        setKidsStatus("error");
        setKidsMessage("Não foi possível atualizar a criança.");
        return;
      }
    } else {
      const inserted = await supabase
        .from("kids_children")
        .insert(payload)
        .select("id, name")
        .single<{ id: string; name: string }>();
      if (inserted.error || !inserted.data) {
        setKidsStatus("error");
        setKidsMessage("Não foi possível cadastrar a criança.");
        return;
      }

      const { error: guardianError } = await supabase.from("kids_guardians").insert({
        tenant_id: profile.tenant_id,
        child_id: inserted.data.id,
        member_id: profile.member_id,
        name: profile.full_name?.trim() || profile.email,
        relationship: "parent",
        is_primary: true,
      });
      if (guardianError) {
        setKidsStatus("error");
        setKidsMessage("Criança criada, mas não foi possível vincular o responsável.");
        return;
      }
    }

    setKidsStatus("success");
    setKidsMessage(kidsForm.id ? "Criança atualizada." : "Criança cadastrada.");
    setKidsForm(emptyKidsChildForm);
    setIsKidsFormOpen(false);
    await loadPortalData(profile.id);
  }

  async function generateKidsPass(child: KidsChildRecord) {
    if (!profile?.tenant_id || !profile.member_id) return;
    setKidsStatus("loading");
    setKidsMessage("");

    const { error } = await supabase.rpc("create_kids_checkin_pass", {
      in_child_id: child.id,
      in_valid_hours: 8,
    });

    if (error) {
      setKidsStatus("error");
      setKidsMessage("Não foi possível gerar o QR da criança.");
      return;
    }

    setKidsStatus("success");
    setKidsMessage("QR de check-in gerado.");
    setSelectedPassChildId(child.id);
    await loadPortalData(profile.id);
  }

  async function confirmAssignment(assignmentId: string) {
    setActionStatus((prev) => ({ ...prev, [assignmentId]: "loading" }));

    const { error } = await supabase
      .from("worship_assignments")
      .update({ status: "confirmed", responded_at: new Date().toISOString() })
      .eq("id", assignmentId);

    if (!error) {
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, status: "confirmed", decline_reason: null } : a)),
      );
    }
    setActionStatus((prev) => ({ ...prev, [assignmentId]: "done" }));
  }

  async function declineAssignment(assignmentId: string) {
    setActionStatus((prev) => ({ ...prev, [assignmentId]: "loading" }));

    const reason = declineReason.trim() || null;
    const { error } = await supabase
      .from("worship_assignments")
      .update({ status: "declined", decline_reason: reason, responded_at: new Date().toISOString() })
      .eq("id", assignmentId);

    if (!error) {
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, status: "declined", decline_reason: reason } : a)),
      );
    }
    setDecliningId(null);
    setDeclineReason("");
    setActionStatus((prev) => ({ ...prev, [assignmentId]: "done" }));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setAssignments([]);
    setLoadStatus("idle");
    setLoginStatus("idle");
  }

  function eventTypeLabel(type: string) {
    if (type === "service") return "Culto";
    if (type === "rehearsal") return "Ensaio";
    if (type === "meeting") return "Reunião";
    return "Evento";
  }

  function statusLabel(status: MemberAssignment["status"]) {
    if (status === "confirmed") return "Confirmado";
    if (status === "declined") return "Recusado";
    if (status === "standby") return "Apoio";
    return "Aguardando";
  }

  function formatRelationship(value: KidsGuardianRecord["relationship"]) {
    if (value === "parent") return "Pai/Mãe";
    if (value === "grandparent") return "Avô/Avó";
    if (value === "sibling") return "Irmão/Irmã";
    if (value === "guardian") return "Responsável";
    return "Outro";
  }

  function qrImageUrl(passToken: string) {
    const payload = `kids-pass:${passToken}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
  }

  const upcomingAssignments = assignments.filter((a) => {
    const starts = a.worship_events?.starts_at;
    if (!starts) return false;
    return new Date(starts) >= new Date(new Date().setHours(0, 0, 0, 0));
  });

  const pastAssignments = assignments.filter((a) => {
    const starts = a.worship_events?.starts_at;
    if (!starts) return true;
    return new Date(starts) < new Date(new Date().setHours(0, 0, 0, 0));
  });

  if (loadStatus === "idle" || loginStatus === "idle" || loginStatus === "loading") {
    if (!profile) {
      return (
        <div className="member-portal-shell">
          <div className="member-portal-login-card">
            <div className="member-portal-brand">
              <Music size={28} />
              <div>
                <strong>Portal do Membro</strong>
                <span>Confirme sua participação nas escalas</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="member-portal-form">
              <TextField
                label="E-mail"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                icon={<Mail size={18} />}
              />
              <div className="member-portal-password-wrap">
                <TextField
                  label="Senha"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  icon={<LockKeyhole size={18} />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      <ChevronDown size={16} />
                    </button>
                  }
                />
              </div>

              {loginMessage ? (
                <p className={`login-feedback ${loginStatus}`}>{loginMessage}</p>
              ) : null}

              <Button type="submit" disabled={loginStatus === "loading"}>
                {loginStatus === "loading" ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
        </div>
      );
    }
  }

  if (loadStatus === "loading") {
    return (
      <div className="member-portal-shell">
        <div className="member-portal-loading">Carregando suas escalas...</div>
      </div>
    );
  }

  if (loadStatus === "error") {
    return (
      <div className="member-portal-shell">
        <div className="member-portal-loading">Erro ao carregar dados. Tente novamente.</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="member-portal-shell">
        <div className="member-portal-login-card">
          <div className="member-portal-brand">
            <Music size={28} />
            <div>
              <strong>Portal do Membro</strong>
              <span>Confirme sua participação nas escalas</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="member-portal-form">
            <TextField
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              icon={<Mail size={18} />}
            />
            <div className="member-portal-password-wrap">
              <TextField
                label="Senha"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Sua senha"
                icon={<LockKeyhole size={18} />}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    <ChevronDown size={16} />
                  </button>
                }
              />
            </div>

            {loginMessage ? (
              <p className={`login-feedback ${loginStatus}`}>{loginMessage}</p>
            ) : null}

            <Button type="submit" disabled={loginStatus === "loading"}>
              {loginStatus === "loading" ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="member-portal-shell">
      <header className="member-portal-header">
        <div className="member-portal-brand">
          <Music size={22} />
          <div>
            <strong>Portal do Membro</strong>
            <span>{profile.full_name ?? profile.email}</span>
          </div>
        </div>
        <button type="button" className="member-portal-signout" onClick={() => void handleSignOut()}>
          <LogOut size={16} />
          Sair
        </button>
      </header>

      <main className="member-portal-main">
        <section className="member-portal-section">
          <div className="member-portal-section-head">
            <h2>Kids</h2>
            <Button
              type="button"
              icon={<Plus size={14} />}
              onClick={() => {
                setKidsForm(emptyKidsChildForm);
                setIsKidsFormOpen(true);
              }}
            >
              Cadastrar criança
            </Button>
          </div>

          {kidsMessage ? <p className={`login-feedback ${kidsStatus}`}>{kidsMessage}</p> : null}

          {kidsChildren.length === 0 ? (
            <div className="member-portal-empty-inline">
              <Baby size={18} />
              <span>Nenhuma criança cadastrada ainda.</span>
            </div>
          ) : (
            <div className="member-portal-cards">
              {kidsChildren.map((child) => {
                const guardians = kidsGuardiansByChildId[child.id] ?? [];
                const activePass = (kidsPassesByChildId[child.id] ?? []).find((pass) => !pass.used_at && new Date(pass.valid_until) >= new Date()) ?? null;
                const showQr = selectedPassChildId === child.id && activePass;
                return (
                  <article key={child.id} className="member-portal-card">
                    <div className="member-portal-card-head">
                      <div>
                        <span className="member-portal-event-type">Criança</span>
                        <strong>{child.name}</strong>
                      </div>
                      <em className="member-portal-status pending">{child.kids_groups?.name ?? "Sem turma"}</em>
                    </div>

                    <div className="member-portal-card-meta">
                      {child.date_of_birth ? (
                        <div>
                          <CalendarCheck size={14} />
                          <span>Nascimento: {new Date(`${child.date_of_birth}T12:00:00`).toLocaleDateString("pt-BR")}</span>
                        </div>
                      ) : null}
                      {child.allergies ? (
                        <div>
                          <X size={14} />
                          <span>Alergias: {child.allergies}</span>
                        </div>
                      ) : null}
                    </div>

                    {guardians.length > 0 ? (
                      <div className="member-portal-guardians">
                        {guardians.map((guardian) => (
                          <small key={guardian.id}>
                            {formatRelationship(guardian.relationship)}: {guardian.name}
                          </small>
                        ))}
                      </div>
                    ) : null}

                    <div className="member-portal-card-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        icon={<QrCode size={14} />}
                        onClick={() => void generateKidsPass(child)}
                        disabled={kidsStatus === "loading"}
                      >
                        Gerar QR
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setKidsForm({
                            id: child.id,
                            name: child.name,
                            date_of_birth: child.date_of_birth ?? "",
                            group_id: child.group_id ?? "",
                            allergies: child.allergies ?? "",
                            special_needs: child.special_needs ?? "",
                            notes: child.notes ?? "",
                          });
                          setIsKidsFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                    </div>

                    {showQr ? (
                      <div className="member-portal-kids-qr">
                        <img src={qrImageUrl(activePass.pass_token)} alt={`QR de check-in de ${child.name}`} />
                        <small>Válido até {new Date(activePass.valid_until).toLocaleString("pt-BR")}</small>
                        <small>Código fallback: {activePass.pass_token.slice(0, 12)}</small>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {bibleSchoolEnabled && (bibleSchoolCanManage || bibleSchoolClasses.length > 0) ? (
          <section className="member-portal-section">
            <div className="member-portal-section-head">
              <h2>Escola Bíblica</h2>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--color-neutral-500)", fontSize: "0.9rem" }}>
                <BookOpen size={16} />
                {bibleSchoolCanManage ? "Acesso de gestão" : bibleSchoolIsTeacher ? "Professor" : "Minhas turmas"}
              </span>
            </div>

            {bibleSchoolActionMessage ? (
              <p className={`login-feedback ${bibleSchoolActionStatus}`}>{bibleSchoolActionMessage}</p>
            ) : null}

            {bibleSchoolClasses.length === 0 ? (
              <div className="member-portal-empty-inline">
                <BookOpen size={18} />
                <span>Nenhuma turma liberada para você.</span>
                {bibleSchoolCanManage ? (
                  <Button type="button" variant="secondary" onClick={openBibleSchoolCreateClassForm}>
                    Nova turma
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
                <div className="member-portal-card-meta" style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <label style={{ display: "grid", gap: 6, minWidth: 260 }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--color-neutral-700)", fontWeight: 800 }}>
                        Turma
                      </span>
                      <select
                        className="catalog-input"
                        value={selectedBibleSchoolClassId ?? ""}
                        onChange={(e) => setSelectedBibleSchoolClassId(e.target.value || null)}
                      >
                        {bibleSchoolClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {bibleSchoolCanManage ? (
                      <>
                        <Button type="button" variant="secondary" onClick={openBibleSchoolCreateClassForm}>
                          Nova turma
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={openBibleSchoolEditClassForm}
                          disabled={!selectedBibleSchoolClassId}
                        >
                          Editar turma
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setBibleSchoolSessionForm(emptyBibleSchoolSessionForm);
                            setIsBibleSchoolSessionFormOpen(true);
                          }}
                          disabled={!selectedBibleSchoolClassId || !(bibleSchoolIsModuleAdmin || bibleSchoolIsTeacherForSelectedClass)}
                        >
                          Nova aula
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
                            setIsBibleSchoolMaterialFormOpen(true);
                          }}
                          disabled={!selectedBibleSchoolClassId || !(bibleSchoolIsModuleAdmin || bibleSchoolIsTeacherForSelectedClass)}
                        >
                          Novo material
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={openBibleSchoolGradeForm}
                          disabled={!selectedBibleSchoolClassId || !(bibleSchoolIsModuleAdmin || bibleSchoolIsTeacherForSelectedClass)}
                        >
                          Nova nota
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                {selectedBibleSchoolClassId ? (
                  <div className="member-portal-cards" style={{ marginTop: 12 }}>
                    <article className="member-portal-card">
                      <div className="member-portal-card-head">
                        <div>
                          <span className="member-portal-event-type">Aulas</span>
                          <strong>Presença</strong>
                        </div>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--color-neutral-500)" }}>Aula</span>
                          <select
                            className="catalog-input"
                            value={selectedBibleSchoolSessionId ?? ""}
                            onChange={(e) => setSelectedBibleSchoolSessionId(e.target.value || null)}
                          >
                            <option value="">Selecione</option>
                            {bibleSchoolSessions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {new Date(`${s.session_date}T12:00:00`).toLocaleDateString("pt-BR")}
                                {s.topic ? ` · ${s.topic}` : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {selectedBibleSchoolSessionId ? (
                        bibleSchoolEnrollments.length === 0 ? (
                          <div className="member-portal-empty-inline">
                            <BookOpen size={18} />
                            <span>Nenhum aluno matriculado.</span>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                            {bibleSchoolEnrollments.map((enrollment) => {
                              const studentName = enrollment.bible_school_students?.name ?? "Aluno";
                              const attendance = bibleSchoolAttendance.find((row) => row.enrollment_id === enrollment.id) ?? null;
                              const value = attendance?.status ?? "present";
                              return (
                                <div key={enrollment.id} className="catalog-row">
                                  <div style={{ display: "grid", gap: 4 }}>
                                    <strong style={{ fontSize: "0.95rem" }}>{studentName}</strong>
                                    <small style={{ color: "var(--color-neutral-500)" }}>
                                      {attendance ? "Registrado" : "Sem registro"}
                                    </small>
                                  </div>
                                  <select
                                    className="catalog-input"
                                    value={value}
                                    onChange={(e) => void upsertBibleSchoolAttendance(enrollment.id, e.target.value as BibleSchoolAttendanceRecord["status"])}
                                    disabled={!(bibleSchoolIsModuleAdmin || bibleSchoolIsTeacherForSelectedClass) || bibleSchoolActionStatus === "loading"}
                                    style={{ maxWidth: 180 }}
                                  >
                                    <option value="present">Presente</option>
                                    <option value="absent">Faltou</option>
                                    <option value="excused">Justificado</option>
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        <div className="member-portal-empty-inline" style={{ marginTop: 10 }}>
                          <BookOpen size={18} />
                          <span>Selecione uma aula para marcar presença.</span>
                        </div>
                      )}
                    </article>

                    <article className="member-portal-card">
                      <div className="member-portal-card-head">
                        <div>
                          <span className="member-portal-event-type">Materiais</span>
                          <strong>Links e conteúdos</strong>
                        </div>
                      </div>

                      {bibleSchoolMaterials.length === 0 ? (
                        <div className="member-portal-empty-inline" style={{ marginTop: 10 }}>
                          <BookOpen size={18} />
                          <span>Nenhum material disponível ainda.</span>
                        </div>
                      ) : (
                        <div className="member-portal-guardians" style={{ marginTop: 10 }}>
                          {bibleSchoolMaterials.slice(0, 12).map((mat) => (
                            <small key={mat.id}>
                              {mat.kind === "link" && mat.url ? (
                                <a href={mat.url} target="_blank" rel="noreferrer">
                                  {mat.title}
                                </a>
                              ) : mat.kind === "file" && mat.url ? (
                                <button type="button" className="preview-link" onClick={() => void openBibleSchoolMaterial(mat)}>
                                  {mat.title}
                                </button>
                              ) : (
                                mat.title
                              )}
                            </small>
                          ))}
                        </div>
                      )}
                    </article>

                    <article className="member-portal-card">
                      <div className="member-portal-card-head">
                        <div>
                          <span className="member-portal-event-type">Notas</span>
                          <strong>Avaliações</strong>
                        </div>
                      </div>

                      {bibleSchoolGrades.length === 0 ? (
                        <div className="member-portal-empty-inline" style={{ marginTop: 10 }}>
                          <BookOpen size={18} />
                          <span>Nenhuma nota lançada ainda.</span>
                        </div>
                      ) : (
                        <div className="member-portal-guardians" style={{ marginTop: 10 }}>
                          {bibleSchoolGrades.slice(0, 12).map((grade) => {
                            const enrollment = bibleSchoolEnrollments.find((row) => row.id === grade.enrollment_id) ?? null;
                            const studentName = enrollment?.bible_school_students?.name ?? "Aluno";
                            const scoreLabel =
                              grade.score === null && grade.max_score === null
                                ? "—"
                                : grade.max_score === null
                                  ? `${grade.score ?? "—"}`
                                  : `${grade.score ?? "—"} / ${grade.max_score ?? "—"}`;
                            return (
                              <small key={grade.id}>
                                {grade.title} · {studentName} · {scoreLabel}
                              </small>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        {upcomingAssignments.length === 0 && pastAssignments.length === 0 ? (
          <div className="member-portal-empty">
            <CalendarCheck size={40} />
            <strong>Nenhuma escala encontrada</strong>
            <span>Você ainda não foi escalado em nenhum evento de louvor.</span>
          </div>
        ) : null}

        {upcomingAssignments.length > 0 ? (
          <section className="member-portal-section">
            <h2>Próximas escalas</h2>
            <div className="member-portal-cards">
              {upcomingAssignments.map((assignment) => {
                const evt = assignment.worship_events;
                if (!evt) return null;
                const role = assignment.worship_roles?.name ?? assignment.role_name ?? "Função não definida";
                const isLoading = actionStatus[assignment.id] === "loading";
                const isDeclining = decliningId === assignment.id;
                return (
                  <article key={assignment.id} className={`member-portal-card ${assignment.status}`}>
                    <div className="member-portal-card-head">
                      <div>
                        <span className="member-portal-event-type">{eventTypeLabel(evt.event_type)}</span>
                        <strong>{evt.title}</strong>
                      </div>
                      <em className={`member-portal-status ${assignment.status}`}>
                        {statusLabel(assignment.status)}
                      </em>
                    </div>

                    <div className="member-portal-card-meta">
                      <div>
                        <CalendarCheck size={14} />
                        <span>
                          {new Date(evt.starts_at).toLocaleString("pt-BR", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {evt.location ? (
                        <div>
                          <MapPin size={14} />
                          <span>{evt.location}</span>
                        </div>
                      ) : null}
                      {assignment.arrival_at ? (
                        <div>
                          <Clock3 size={14} />
                          <span>
                            Chegar às{" "}
                            {new Date(assignment.arrival_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="member-portal-card-role">
                      <Music size={14} />
                      <strong>{role}</strong>
                    </div>

                    {assignment.notes ? (
                      <p className="member-portal-card-notes">{assignment.notes}</p>
                    ) : null}

                    {assignment.decline_reason ? (
                      <p className="member-portal-card-notes muted">Motivo: {assignment.decline_reason}</p>
                    ) : null}

                    {isDeclining ? (
                      <div className="member-portal-decline-form">
                        <textarea
                          className="catalog-input catalog-textarea"
                          placeholder="Motivo da recusa (opcional)"
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          rows={2}
                        />
                        <div className="member-portal-decline-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { setDecliningId(null); setDeclineReason(""); }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            onClick={() => void declineAssignment(assignment.id)}
                            disabled={isLoading}
                          >
                            Confirmar recusa
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="member-portal-card-actions">
                        {assignment.status !== "confirmed" ? (
                          <Button
                            type="button"
                            icon={<Check size={15} />}
                            onClick={() => void confirmAssignment(assignment.id)}
                            disabled={isLoading}
                          >
                            Confirmar presença
                          </Button>
                        ) : null}
                        {assignment.status !== "declined" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            icon={<X size={15} />}
                            onClick={() => setDecliningId(assignment.id)}
                            disabled={isLoading}
                          >
                            Recusar
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {pastAssignments.length > 0 ? (
          <section className="member-portal-section">
            <h2>Histórico</h2>
            <div className="member-portal-history">
              {pastAssignments.map((assignment) => {
                const evt = assignment.worship_events;
                if (!evt) return null;
                const role = assignment.worship_roles?.name ?? assignment.role_name ?? "Função";
                return (
                  <div key={assignment.id} className="member-portal-history-row">
                    <div>
                      <strong>{evt.title}</strong>
                      <small>
                        {new Date(evt.starts_at).toLocaleDateString("pt-BR")} · {role}
                      </small>
                    </div>
                    <em className={`member-portal-status ${assignment.status}`}>
                      {statusLabel(assignment.status)}
                    </em>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      {isBibleSchoolClassFormOpen ? (
        <div className="modal-backdrop">
          <section className="modal-sheet">
            <div className="modal-section-header">
              <BookOpen size={18} />
              <div>
                <strong>{bibleSchoolClassForm.id ? "Editar turma" : "Nova turma"}</strong>
                <small>Turmas definem aulas, presença e materiais.</small>
              </div>
            </div>
            <form className="modal-body" onSubmit={(event) => void handleBibleSchoolClassSubmit(event)}>
              <label>
                <span>Nome</span>
                <input
                  className="catalog-input"
                  value={bibleSchoolClassForm.name}
                  onChange={(event) => setBibleSchoolClassForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Descrição (opcional)</span>
                <textarea
                  className="catalog-input catalog-textarea"
                  rows={2}
                  value={bibleSchoolClassForm.description}
                  onChange={(event) =>
                    setBibleSchoolClassForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <div className="modal-grid">
                <label>
                  <span>Início</span>
                  <input
                    type="date"
                    className="catalog-input"
                    value={bibleSchoolClassForm.starts_at}
                    onChange={(event) =>
                      setBibleSchoolClassForm((current) => ({ ...current, starts_at: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>Fim</span>
                  <input
                    type="date"
                    className="catalog-input"
                    value={bibleSchoolClassForm.ends_at}
                    onChange={(event) => setBibleSchoolClassForm((current) => ({ ...current, ends_at: event.target.value }))}
                  />
                </label>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={bibleSchoolClassForm.is_active}
                  onChange={(event) =>
                    setBibleSchoolClassForm((current) => ({ ...current, is_active: event.target.checked }))
                  }
                />
                <span style={{ fontSize: "0.95rem", fontWeight: 800 }}>Turma ativa</span>
              </label>
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsBibleSchoolClassFormOpen(false);
                    setBibleSchoolClassForm(emptyBibleSchoolClassForm);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={bibleSchoolActionStatus === "loading"}>
                  {bibleSchoolActionStatus === "loading" ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isBibleSchoolSessionFormOpen ? (
        <div className="modal-backdrop">
          <section className="modal-sheet">
            <div className="modal-section-header">
              <BookOpen size={18} />
              <div>
                <strong>Nova aula</strong>
                <small>Registrar uma aula para a turma selecionada.</small>
              </div>
            </div>
            <form
              className="modal-body"
              onSubmit={(event) => void handleBibleSchoolSessionSubmit(event)}
            >
              <label>
                <span>Data</span>
                <input
                  type="date"
                  className="catalog-input"
                  value={bibleSchoolSessionForm.session_date}
                  onChange={(event) =>
                    setBibleSchoolSessionForm((current) => ({ ...current, session_date: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>Tema (opcional)</span>
                <input
                  className="catalog-input"
                  value={bibleSchoolSessionForm.topic}
                  onChange={(event) =>
                    setBibleSchoolSessionForm((current) => ({ ...current, topic: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Notas (opcional)</span>
                <textarea
                  className="catalog-input catalog-textarea"
                  rows={2}
                  value={bibleSchoolSessionForm.notes}
                  onChange={(event) =>
                    setBibleSchoolSessionForm((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </label>
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsBibleSchoolSessionFormOpen(false);
                    setBibleSchoolSessionForm(emptyBibleSchoolSessionForm);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={bibleSchoolActionStatus === "loading"}>
                  {bibleSchoolActionStatus === "loading" ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isBibleSchoolMaterialFormOpen ? (
        <div className="modal-backdrop">
          <section className="modal-sheet">
            <div className="modal-section-header">
              <BookOpen size={18} />
              <div>
                <strong>Novo material</strong>
                <small>Disponibilize conteúdo para a turma selecionada.</small>
              </div>
            </div>
            <form
              className="modal-body"
              onSubmit={(event) => void handleBibleSchoolMaterialSubmit(event)}
            >
              <label>
                <span>Título</span>
                <input
                  className="catalog-input"
                  value={bibleSchoolMaterialForm.title}
                  onChange={(event) =>
                    setBibleSchoolMaterialForm((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>Tipo</span>
                <select
                  className="catalog-input"
                  value={bibleSchoolMaterialForm.kind}
                  onChange={(event) =>
                    setBibleSchoolMaterialForm((current) => ({
                      ...current,
                      kind: event.target.value as BibleSchoolMaterialFormState["kind"],
                    }))
                  }
                >
                  <option value="link">Link</option>
                  <option value="text">Texto</option>
                  <option value="file">Arquivo</option>
                </select>
              </label>

              {bibleSchoolMaterialForm.kind === "link" ? (
                <label>
                  <span>URL</span>
                  <input
                    className="catalog-input"
                    value={bibleSchoolMaterialForm.url}
                    onChange={(event) =>
                      setBibleSchoolMaterialForm((current) => ({ ...current, url: event.target.value }))
                    }
                    placeholder="https://..."
                    required
                  />
                </label>
              ) : bibleSchoolMaterialForm.kind === "file" ? (
                <label>
                  <span>Arquivo</span>
                  <input
                    className="catalog-input"
                    type="file"
                    onChange={(event) =>
                      setBibleSchoolMaterialForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
                    }
                    required
                  />
                </label>
              ) : (
                <label>
                  <span>Conteúdo</span>
                  <textarea
                    className="catalog-input catalog-textarea"
                    rows={3}
                    value={bibleSchoolMaterialForm.content}
                    onChange={(event) =>
                      setBibleSchoolMaterialForm((current) => ({ ...current, content: event.target.value }))
                    }
                    required
                  />
                </label>
              )}

              <div className="modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsBibleSchoolMaterialFormOpen(false);
                    setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={bibleSchoolActionStatus === "loading"}>
                  {bibleSchoolActionStatus === "loading" ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isBibleSchoolGradeFormOpen ? (
        <div className="modal-backdrop">
          <section className="modal-sheet">
            <div className="modal-section-header">
              <BookOpen size={18} />
              <div>
                <strong>Nova nota</strong>
                <small>Lançar avaliação para uma matrícula.</small>
              </div>
            </div>
            <form className="modal-body" onSubmit={(event) => void handleBibleSchoolGradeSubmit(event)}>
              <label>
                <span>Aluno (matrícula)</span>
                <select
                  className="catalog-input"
                  value={bibleSchoolGradeForm.enrollment_id}
                  onChange={(event) => setBibleSchoolGradeForm((c) => ({ ...c, enrollment_id: event.target.value }))}
                  required
                >
                  <option value="">Selecione</option>
                  {bibleSchoolEnrollments.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.bible_school_students?.name ?? "Aluno"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Título</span>
                <input
                  className="catalog-input"
                  value={bibleSchoolGradeForm.title}
                  onChange={(event) => setBibleSchoolGradeForm((c) => ({ ...c, title: event.target.value }))}
                  placeholder="Ex.: Prova 1"
                  required
                />
              </label>
              <label>
                <span>Nota</span>
                <input
                  className="catalog-input"
                  value={bibleSchoolGradeForm.score}
                  onChange={(event) => setBibleSchoolGradeForm((c) => ({ ...c, score: event.target.value }))}
                  placeholder="Ex.: 8,5"
                />
              </label>
              <label>
                <span>Nota máxima</span>
                <input
                  className="catalog-input"
                  value={bibleSchoolGradeForm.max_score}
                  onChange={(event) => setBibleSchoolGradeForm((c) => ({ ...c, max_score: event.target.value }))}
                  placeholder="Ex.: 10"
                />
              </label>
              <label>
                <span>Observações</span>
                <input
                  className="catalog-input"
                  value={bibleSchoolGradeForm.notes}
                  onChange={(event) => setBibleSchoolGradeForm((c) => ({ ...c, notes: event.target.value }))}
                  placeholder="Opcional"
                />
              </label>
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsBibleSchoolGradeFormOpen(false);
                    setBibleSchoolGradeForm(emptyBibleSchoolGradeForm);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={bibleSchoolActionStatus === "loading"}>
                  {bibleSchoolActionStatus === "loading" ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isKidsFormOpen ? (
        <div className="modal-backdrop">
          <section className="modal-sheet">
            <div className="modal-section-header">
              <Baby size={18} />
              <div>
                <strong>{kidsForm.id ? "Editar criança" : "Cadastrar criança"}</strong>
                <small>Dados visíveis para check-in no módulo Kids.</small>
              </div>
            </div>
            <form className="modal-body" onSubmit={(event) => void handleKidsChildSubmit(event)}>
              <label>
                <span>Nome</span>
                <input
                  className="catalog-input"
                  value={kidsForm.name}
                  onChange={(event) => setKidsForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <div className="modal-grid">
                <label>
                  <span>Data de nascimento</span>
                  <input
                    type="date"
                    className="catalog-input"
                    value={kidsForm.date_of_birth}
                    onChange={(event) => setKidsForm((current) => ({ ...current, date_of_birth: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Turma</span>
                  <select
                    className="catalog-input"
                    value={kidsForm.group_id}
                    onChange={(event) => setKidsForm((current) => ({ ...current, group_id: event.target.value }))}
                  >
                    <option value="">Sem turma</option>
                    {kidsGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>Alergias</span>
                <input
                  className="catalog-input"
                  value={kidsForm.allergies}
                  onChange={(event) => setKidsForm((current) => ({ ...current, allergies: event.target.value }))}
                />
              </label>
              <label>
                <span>Necessidades especiais</span>
                <input
                  className="catalog-input"
                  value={kidsForm.special_needs}
                  onChange={(event) => setKidsForm((current) => ({ ...current, special_needs: event.target.value }))}
                />
              </label>
              <label>
                <span>Observações</span>
                <textarea
                  className="catalog-input catalog-textarea"
                  rows={2}
                  value={kidsForm.notes}
                  onChange={(event) => setKidsForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsKidsFormOpen(false);
                    setKidsForm(emptyKidsChildForm);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={kidsStatus === "loading"}>
                  {kidsStatus === "loading" ? "Salvando..." : kidsForm.id ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
