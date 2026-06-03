import {
  ArrowRight,
  Baby,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  DollarSign,
  Edit3,
  Eye,
  Heart,
  FileCheck2,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Music,
  Palette,
  Play,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  Receipt,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users2,
  UsersRound,
  X,
} from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PolicyFooter } from "../components/PolicyFooter";
import { Button, TextField } from "../design-system/components";
import { htmlToPlainText, renderEventCardHtml, sanitizeRichHtml } from "../lib/eventCardTemplate";
import { supabase, supabaseUrl } from "../lib/supabase";
import {
  createWorshipEmailCampaign,
  emailErrorMessage,
  emailCampaignStatusLabel,
  getWorshipEmailCampaigns,
  triggerWorshipEmailCampaign,
  type WorshipEmailCampaign,
} from "../lib/worshipEmailService";

type LoginStatus = "idle" | "loading" | "success" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";

type TenantRole = "owner" | "admin" | "member";

type TenantProfile = {
  id: string;
  email: string;
  full_name: string | null;
  tenant_id: string | null;
  tenant_role: TenantRole | null;
  member_id?: string | null;
  status: "active" | "invited" | "suspended";
  avatar_url: string | null;
};

type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  header_color: string;
  sidebar_color: string;
  footer_color: string;
};

type MemberRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  status_v2?: "active" | "inactive" | "visitor" | "in_process";
  date_of_birth?: string | null;
  document_number?: string | null;
  address_line1?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  ministry: string | null;
  notes: string | null;
  created_at: string;
};

type EventRecord = {
  id: string;
  title: string;
  description: string | null;
  description_html?: string | null;
  location: string | null;
  event_date: string;
  ends_at: string | null;
  event_type: "culto" | "conferencia" | "retiro" | "jovens" | "infantil" | "social" | "outro";
  color: string;
  status: "rascunho" | "publicado" | "cancelado";
  cover_image_url: string | null;
  created_at: string;
};

type AnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  message_html: string | null;
  published_at: string;
  expires_at: string | null;
  created_at: string;
};

type SocialMediaChannelRecord = {
  id: string;
  tenant_id: string;
  name: string;
  platform: string;
  channel_type: "channel" | "playlist";
  channel_id: string;
  channel_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type PrayerRequestRecord = {
  id: string;
  tenant_id: string;
  member_id: string | null;
  profile_id: string | null;
  is_anonymous: boolean;
  content: string;
  status: "new" | "assigned" | "interceding" | "done";
  source: "portal" | "app";
  created_at: string;
  members?: { name: string } | null;
};

type PrayerAssignmentRecord = {
  id: string;
  tenant_id: string;
  prayer_request_id: string;
  assigned_member_id: string;
  assigned_profile_id: string | null;
  assigned_by_profile_id: string | null;
  assigned_at: string;
  status: "pending" | "interceding" | "done" | "cancelled";
  started_at: string | null;
  completed_at: string | null;
  members?: { name: string } | null;
};

type IntercessorMember = {
  id: string;
  name: string;
  profile_id: string | null;
};

type WorshipRoleRecord = {
  id: string;
  tenant_id: string;
  name: string;
  role_type: "vocal" | "instrument" | "technical" | "leadership" | "other";
  sort_order: number;
  is_active: boolean;
};

type WorshipEventRecord = {
  id: string;
  tenant_id: string;
  title: string;
  event_type: "service" | "rehearsal" | "meeting" | "other";
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  status: "draft" | "published" | "completed" | "cancelled";
  created_at: string;
};

type WorshipAssignmentRecord = {
  id: string;
  tenant_id: string;
  event_id: string;
  member_id: string;
  role_id: string | null;
  role_name: string | null;
  arrival_at: string | null;
  status: "pending" | "confirmed" | "declined" | "standby";
  decline_reason: string | null;
  notes: string | null;
  members: { name: string; email: string | null; phone: string | null } | null;
  worship_roles: { name: string } | null;
};

type TenantModuleRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "beta" | "deprecated";
};

type ModuleAdminAccessRecord = {
  module_id: string;
  profile_id: string | null;
  member_id: string | null;
};

type CatalogItemRecord = {
  id: string;
  tenant_id: string | null;
  name: string;
};

type MemberRoleRecord = {
  tenant_id: string;
  member_id: string;
  role_id: string;
  catalog_roles: { name: string } | null;
};

type MemberMinistryRecord = {
  tenant_id: string;
  member_id: string;
  ministry_id: string;
  is_admin: boolean;
  catalog_ministries: { name: string } | null;
};

type TenantUserRecord = {
  id: string;
  full_name: string | null;
  email: string;
  tenant_role: TenantRole | null;
  status: "active" | "invited" | "suspended";
};

type FamilyRecord = {
  id: string;
  tenant_id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FamilyMemberRecord = {
  id: string;
  tenant_id: string;
  family_id: string;
  member_id: string | null;
  name: string;
  date_of_birth: string | null;
  relationship: string;
  is_primary: boolean;
  members: { name: string; email: string | null; date_of_birth: string | null } | null;
};

type MemberHistoryRecord = {
  id: string;
  tenant_id: string;
  member_id: string;
  event_type: string;
  notes: string | null;
  occurred_at: string;
};

type FinancialCategoryRecord = {
  id: string;
  tenant_id: string | null;
  name: string;
  type: "income" | "expense" | "both";
  color: string | null;
  is_system: boolean;
  sort_order: number;
};

type FinancialTransactionRecord = {
  id: string;
  tenant_id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  payment_method: "cash" | "pix" | "transfer" | "card" | "check" | "other";
  category_id: string | null;
  member_id: string | null;
  notes: string | null;
  created_at: string;
  financial_categories: { name: string; color: string | null } | null;
  members: { name: string } | null;
};

type KidsGroupRecord = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  age_min: number | null;
  age_max: number | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type KidsChildRecord = {
  id: string;
  tenant_id: string;
  name: string;
  date_of_birth: string | null;
  group_id: string | null;
  member_id: string | null;
  allergies: string | null;
  special_needs: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  kids_groups: { name: string } | null;
};

type KidsGuardianRecord = {
  id: string;
  tenant_id: string;
  child_id: string;
  name: string;
  phone: string | null;
  relationship: "parent" | "grandparent" | "sibling" | "guardian" | "other";
  member_id: string | null;
  is_primary: boolean;
  created_at: string;
  kids_children: { name: string } | null;
};

type KidsTeacherScheduleRecord = {
  id: string;
  tenant_id: string;
  schedule_date: string;
  group_id: string | null;
  member_id: string;
  role_label: string | null;
  notes: string | null;
  created_at: string;
  members: { name: string; phone: string | null } | null;
  kids_groups: { name: string } | null;
};

type KidsAttendanceRecord = {
  id: string;
  tenant_id: string;
  child_id: string;
  group_id: string | null;
  attendance_date: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  guardian_name: string | null;
  notes: string | null;
  created_at: string;
  kids_children: { name: string } | null;
  kids_groups: { name: string } | null;
};

type KidsActivityRecord = {
  id: string;
  tenant_id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  activity_date: string;
  created_at: string;
  kids_groups: { name: string } | null;
};

type KidsCommunicationRecord = {
  id: string;
  tenant_id: string;
  child_id: string | null;
  title: string;
  message: string;
  sent_via: "system" | "whatsapp" | "both";
  sent_at: string;
  created_at: string;
  kids_children: { name: string } | null;
};

type KidsQrConsumeResult = {
  attendance_id: string;
  child_id: string;
  child_name: string;
  attendance_date: string;
  checked_in_at: string;
};

type BibleSchoolClassRecord = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type BibleSchoolTeacherRecord = {
  id: string;
  tenant_id: string;
  member_id: string;
  role: "admin" | "teacher";
  members: { name: string; email: string | null; phone: string | null } | null;
};

type BibleSchoolClassTeacherRecord = {
  id: string;
  tenant_id: string;
  class_id: string;
  teacher_id: string;
  bible_school_teachers: BibleSchoolTeacherRecord | null;
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

type TenantAuditLogRecord = {
  id: number;
  tenant_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type BibleSchoolClassFormState = {
  id: string | null;
  name: string;
  description: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  teacherMemberIds: string[];
};

type BibleSchoolStudentFormState = {
  id: string | null;
  member_id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type BibleSchoolSessionFormState = {
  id: string | null;
  session_date: string;
  topic: string;
  notes: string;
};

type BibleSchoolMaterialFormState = {
  id: string | null;
  title: string;
  kind: "link" | "file" | "text";
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

type ClientDashboardData = {
  profile: TenantProfile;
  tenant: TenantRecord;
  members: MemberRecord[];
  memberRoleIdsByMemberId: Record<string, string[]>;
  memberMinistriesByMemberId: Record<string, Array<{ ministry_id: string; name: string; is_admin: boolean }>>;
  families: FamilyRecord[];
  familyMembersByFamilyId: Record<string, Array<{ id: string; member_id: string | null; name: string; date_of_birth: string | null; relationship: string; is_primary: boolean }>>;
  events: EventRecord[];
  announcements: AnnouncementRecord[];
  worshipRoles: WorshipRoleRecord[];
  worshipEvents: WorshipEventRecord[];
  worshipAssignmentsByEventId: Record<string, WorshipAssignmentRecord[]>;
  users: TenantUserRecord[];
  modules: TenantModuleRecord[];
  moduleAdminModuleIdsByProfileId: Record<string, string[]>;
  moduleAdminModuleIdsByMemberId: Record<string, string[]>;
  catalogRoles: CatalogItemRecord[];
  catalogMinistries: CatalogItemRecord[];
  financialCategories: FinancialCategoryRecord[];
  financialTransactions: FinancialTransactionRecord[];
  kidsGroups: KidsGroupRecord[];
  kidsChildren: KidsChildRecord[];
  kidsGuardiansByChildId: Record<string, KidsGuardianRecord[]>;
  kidsTeacherSchedule: KidsTeacherScheduleRecord[];
  kidsAttendance: KidsAttendanceRecord[];
  kidsActivities: KidsActivityRecord[];
  kidsCommunications: KidsCommunicationRecord[];
  allPlatformModules: TenantModuleRecord[];
  socialMediaChannels: SocialMediaChannelRecord[];
};

type MemberFormState = {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "visitor" | "in_process";
  date_of_birth: string;
  document_number: string;
  address_line1: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  notes: string;
  roleIds: string[];
  ministries: Array<{ ministry_id: string; is_admin: boolean }>;
  moduleAdminModuleIds: string[];
};

type FamilyFormState = {
  id: string;
  tenant_id: string;
  name: string;
  notes: string;
  members: Array<{
    id: string;
    member_id: string | null;
    name: string;
    date_of_birth: string;
    relationship: string;
    is_primary: boolean;
  }>;
};
type EventFormState = Omit<EventRecord, "created_at"> & { tenant_id: string };
type AnnouncementFormState = Omit<AnnouncementRecord, "created_at"> & { tenant_id: string };
type WorshipEventFormState = {
  title: string;
  event_type: WorshipEventRecord["event_type"];
  starts_at: string;
  ends_at: string;
  location: string;
  notes: string;
  status: WorshipEventRecord["status"];
};
type WorshipAssignmentFormState = {
  event_id: string;
  member_id: string;
  role_id: string;
  role_name: string;
  arrival_at: string;
  notes: string;
};
type ThemeFormState = {
  logo_url: string;
  primary_color: string;
  accent_color: string;
  header_color: string;
  sidebar_color: string;
  footer_color: string;
};

type UserEditState = {
  full_name: string | null;
  tenant_role: TenantRole;
  status: "active" | "invited" | "suspended";
  moduleAdminModuleIds: string[];
};

type FinancialTransactionFormState = {
  id: string;
  type: "income" | "expense";
  amount: string;
  description: string;
  date: string;
  payment_method: FinancialTransactionRecord["payment_method"];
  category_id: string;
  member_id: string;
  notes: string;
};

type FinancialCategoryFormState = {
  id: string;
  name: string;
  type: FinancialCategoryRecord["type"];
  color: string;
};

const emptyMemberForm: MemberFormState = {
  id: "",
  name: "",
  email: "",
  phone: "",
  status: "active",
  date_of_birth: "",
  document_number: "",
  address_line1: "",
  address_city: "",
  address_state: "",
  address_postal_code: "",
  notes: "",
  tenant_id: "",
  roleIds: [],
  ministries: [],
  moduleAdminModuleIds: [],
};

const emptyFamilyForm: FamilyFormState = {
  id: "",
  tenant_id: "",
  name: "",
  notes: "",
  members: [],
};

const emptyEventForm: EventFormState = {
  id: "",
  title: "",
  description: "",
  description_html: null,
  location: "",
  event_date: "",
  ends_at: null,
  event_type: "outro",
  color: "#6d28d9",
  status: "publicado",
  cover_image_url: null,
  tenant_id: "",
};

const emptyAnnouncementForm: AnnouncementFormState = {
  id: "",
  title: "",
  message: "",
  message_html: null,
  published_at: new Date().toISOString(),
  expires_at: null,
  tenant_id: "",
};

const emptyWorshipEventForm: WorshipEventFormState = {
  title: "",
  event_type: "service",
  starts_at: "",
  ends_at: "",
  location: "",
  notes: "",
  status: "published",
};

const emptyWorshipAssignmentForm: WorshipAssignmentFormState = {
  event_id: "",
  member_id: "",
  role_id: "",
  role_name: "",
  arrival_at: "",
  notes: "",
};

const emptyThemeForm: ThemeFormState = {
  logo_url: "",
  primary_color: "#087C7A",
  accent_color: "#00A7C4",
  header_color: "#087C7A",
  sidebar_color: "#087C7A",
  footer_color: "#087C7A",
};

const emptyBibleSchoolClassForm: BibleSchoolClassFormState = {
  id: null,
  name: "",
  description: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  teacherMemberIds: [],
};

const emptyBibleSchoolStudentForm: BibleSchoolStudentFormState = {
  id: null,
  member_id: "",
  name: "",
  email: "",
  phone: "",
  notes: "",
};

const emptyBibleSchoolSessionForm: BibleSchoolSessionFormState = {
  id: null,
  session_date: new Date().toISOString().slice(0, 10),
  topic: "",
  notes: "",
};

const emptyBibleSchoolMaterialForm: BibleSchoolMaterialFormState = {
  id: null,
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

const emptyFinancialTransactionForm: FinancialTransactionFormState = {
  id: "",
  type: "income",
  amount: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  payment_method: "pix",
  category_id: "",
  member_id: "",
  notes: "",
};

const emptyFinancialCategoryForm: FinancialCategoryFormState = {
  id: "",
  name: "",
  type: "income",
  color: "#087C7A",
};

type KidsGroupFormState = {
  id: string;
  name: string;
  description: string;
  age_min: string;
  age_max: string;
  color: string;
  is_active: boolean;
};

type KidsChildFormState = {
  id: string;
  name: string;
  date_of_birth: string;
  group_id: string;
  member_id: string;
  allergies: string;
  special_needs: string;
  notes: string;
};

type KidsGuardianFormState = {
  id: string;
  child_id: string;
  name: string;
  phone: string;
  relationship: KidsGuardianRecord["relationship"];
  member_id: string;
  is_primary: boolean;
};

type KidsTeacherScheduleFormState = {
  id: string;
  schedule_date: string;
  group_id: string;
  member_id: string;
  role_label: string;
  notes: string;
};

type KidsAttendanceFormState = {
  id: string;
  child_id: string;
  group_id: string;
  attendance_date: string;
  guardian_name: string;
  notes: string;
};

type KidsActivityFormState = {
  id: string;
  group_id: string;
  title: string;
  description: string;
  activity_date: string;
};

type KidsCommunicationFormState = {
  id: string;
  child_id: string;
  title: string;
  message: string;
  sent_via: KidsCommunicationRecord["sent_via"];
};

const emptyKidsGroupForm: KidsGroupFormState = {
  id: "",
  name: "",
  description: "",
  age_min: "",
  age_max: "",
  color: "#5a8a2f",
  is_active: true,
};

const emptyKidsChildForm: KidsChildFormState = {
  id: "",
  name: "",
  date_of_birth: "",
  group_id: "",
  member_id: "",
  allergies: "",
  special_needs: "",
  notes: "",
};

const emptyKidsGuardianForm: KidsGuardianFormState = {
  id: "",
  child_id: "",
  name: "",
  phone: "",
  relationship: "parent",
  member_id: "",
  is_primary: false,
};

const emptyKidsTeacherScheduleForm: KidsTeacherScheduleFormState = {
  id: "",
  schedule_date: new Date().toISOString().slice(0, 10),
  group_id: "",
  member_id: "",
  role_label: "",
  notes: "",
};

const emptyKidsAttendanceForm: KidsAttendanceFormState = {
  id: "",
  child_id: "",
  group_id: "",
  attendance_date: new Date().toISOString().slice(0, 10),
  guardian_name: "",
  notes: "",
};

const emptyKidsActivityForm: KidsActivityFormState = {
  id: "",
  group_id: "",
  title: "",
  description: "",
  activity_date: new Date().toISOString().slice(0, 10),
};

const emptyKidsCommunicationForm: KidsCommunicationFormState = {
  id: "",
  child_id: "",
  title: "",
  message: "",
  sent_via: "system",
};

const sampleClientDashboardData: ClientDashboardData = {
  profile: {
    id: "demo-profile",
    email: "demo@igreja.org",
    full_name: "Admin Demo",
    tenant_id: "demo-tenant",
    tenant_role: "owner",
    member_id: "member-1",
    status: "active",
    avatar_url: null,
  },
  tenant: {
    id: "demo-tenant",
    name: "Igreja Demo",
    slug: "igreja-demo",
    logo_url: "/img/icon-sirvaos.svg",
    primary_color: "#087C7A",
    accent_color: "#00A7C4",
    header_color: "#087C7A",
    sidebar_color: "#087C7A",
    footer_color: "#087C7A",
  },
  members: [
    {
      id: "member-1",
      name: "Mariana Souza",
      email: "mariana@igreja.org",
      phone: "(11) 99999-0001",
      status: "active",
      ministry: "Louvor",
      notes: "Líder de célula",
      created_at: new Date().toISOString(),
    },
    {
      id: "member-2",
      name: "Paulo Alves",
      email: "paulo@igreja.org",
      phone: "(11) 99999-0002",
      status: "active",
      ministry: "Recepção",
      notes: "Voluntário de plantão",
      created_at: new Date().toISOString(),
    },
  ],
  memberRoleIdsByMemberId: {
    "member-1": ["role-sys-2"],
  },
  memberMinistriesByMemberId: {
    "member-1": [{ ministry_id: "min-sys-1", name: "Ministério de Louvor", is_admin: true }],
  },
  families: [
    {
      id: "family-1",
      tenant_id: "demo-tenant",
      name: "Família Souza",
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  familyMembersByFamilyId: {
    "family-1": [
      { id: "fm-1", member_id: "member-1", name: "Mariana Souza", date_of_birth: null, relationship: "self", is_primary: true },
      { id: "fm-2", member_id: "member-2", name: "Paulo Alves", date_of_birth: null, relationship: "spouse", is_primary: false },
      { id: "fm-3", member_id: null, name: "Isabela Souza", date_of_birth: "2023-03-10", relationship: "child", is_primary: false },
    ],
  },
  events: [
    {
      id: "event-1",
      title: "Culto Dominical",
      description: "Adoração, palavra e comunhão.",
      location: "Templo principal",
      event_date: new Date(Date.now() + 86400000).toISOString(),
      ends_at: null,
      event_type: "culto" as const,
      color: "#6d28d9",
      status: "publicado" as const,
      cover_image_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: "event-2",
      title: "Conferência de Jovens",
      description: "Preparação para o culto.",
      location: "Sala Multiuso",
      event_date: new Date(Date.now() + 172800000).toISOString(),
      ends_at: null,
      event_type: "jovens" as const,
      color: "#059669",
      status: "publicado" as const,
      cover_image_url: null,
      created_at: new Date().toISOString(),
    },
  ],
  announcements: [
    {
      id: "announce-1",
      title: "Culto Especial",
      message: "Não perca o culto especial de domingo com convidados.",
      message_html: null,
      expires_at: null,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  worshipRoles: [
    { id: "worship-role-1", tenant_id: "demo-tenant", name: "Vocal", role_type: "vocal", sort_order: 20, is_active: true },
    { id: "worship-role-2", tenant_id: "demo-tenant", name: "Violao", role_type: "instrument", sort_order: 30, is_active: true },
  ],
  worshipEvents: [
    {
      id: "worship-event-1",
      tenant_id: "demo-tenant",
      title: "Louvor - Culto Dominical",
      event_type: "service",
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      ends_at: null,
      location: "Templo principal",
      notes: "Separar repertorio antes do ensaio.",
      status: "published",
      created_at: new Date().toISOString(),
    },
  ],
  worshipAssignmentsByEventId: {
    "worship-event-1": [
      {
        id: "worship-assignment-1",
        tenant_id: "demo-tenant",
        event_id: "worship-event-1",
        member_id: "member-1",
        role_id: "worship-role-1",
        role_name: null,
        arrival_at: new Date(Date.now() + 82800000).toISOString(),
        status: "confirmed",
        decline_reason: null,
        notes: null,
        members: { name: "Mariana Souza", email: "mariana@igreja.org", phone: null },
        worship_roles: { name: "Vocal" },
      },
    ],
  },
  users: [
    {
      id: "user-1",
      full_name: "Eduardo Lima",
      email: "eduardo@igreja.org",
      tenant_role: "admin",
      status: "active",
    },
    {
      id: "user-2",
      full_name: "Patrícia Melo",
      email: "patricia@igreja.org",
      tenant_role: "member",
      status: "active",
    },
  ],
  modules: [
    {
      id: "module-1",
      code: "members",
      name: "Membros",
      description: "Gestão de membros e ministérios.",
      status: "active",
    },
    {
      id: "module-2",
      code: "events",
      name: "Eventos",
      description: "Agenda institucional da igreja.",
      status: "active",
    },
    {
      id: "module-3",
      code: "announcements",
      name: "Comunicados",
      description: "Notícias e avisos para a comunidade.",
      status: "beta",
    },
    {
      id: "module-4",
      code: "worship",
      name: "Louvor",
      description: "Escalas, integrantes, funcoes e confirmacao de presenca.",
      status: "active",
    },
    {
      id: "module-5",
      code: "financial",
      name: "Financeiro",
      description: "Dízimos, ofertas, receitas, despesas, categorias e relatórios.",
      status: "active",
    },
    {
      id: "module-6",
      code: "kids",
      name: "Kids / Infantil",
      description: "Gestão do ministério infantil: crianças, turmas, presença e comunicados.",
      status: "active",
    },
    {
      id: "module-7",
      code: "intercession",
      name: "Intercessão",
      description: "Pedidos de oração, distribuição e acompanhamento de intercessores.",
      status: "active",
    },
  ],
  moduleAdminModuleIdsByProfileId: {
    "user-1": ["module-1", "module-2"],
  },
  moduleAdminModuleIdsByMemberId: {
    "member-1": ["module-1", "module-4"],
  },
  catalogRoles: [
    { id: "role-sys-1", tenant_id: null, name: "Membro" },
    { id: "role-sys-2", tenant_id: null, name: "Líder de ministério" },
    { id: "role-tenant-1", tenant_id: "demo-tenant", name: "Líder de célula" },
  ],
  catalogMinistries: [
    { id: "min-sys-1", tenant_id: null, name: "Ministério de Louvor" },
    { id: "min-sys-2", tenant_id: null, name: "Intercessão / Oração" },
    { id: "min-tenant-1", tenant_id: "demo-tenant", name: "Ministério de Artes" },
  ],
  allPlatformModules: [
    { id: "module-1", code: "members",       name: "Membresia",          description: "Cadastro de membros, famílias e ministérios.", status: "active" },
    { id: "module-2", code: "events",         name: "Eventos",            description: "Agenda institucional da igreja.",               status: "active" },
    { id: "module-3", code: "announcements", name: "Comunicados",        description: "Comunicados gerais para membros.",              status: "active" },
    { id: "module-4", code: "worship",       name: "Louvor",             description: "Escalas e confirmação de presença.",            status: "active" },
    { id: "module-5", code: "financial",     name: "Financeiro",         description: "Dízimos, ofertas e relatórios.",                status: "active" },
    { id: "module-6", code: "kids",          name: "Kids / Infantil",    description: "Gestão do ministério infantil.",                status: "active" },
    { id: "module-7", code: "intercession", name: "Intercessão",        description: "Pedidos de oração e gestão de intercessores.",  status: "active" },
  ],
  financialCategories: [
    { id: "fin-cat-1", tenant_id: null, name: "Dízimos", type: "income", color: "#2f8a5f", is_system: true, sort_order: 10 },
    { id: "fin-cat-2", tenant_id: null, name: "Ofertas", type: "income", color: "#087c7a", is_system: true, sort_order: 20 },
    { id: "fin-cat-3", tenant_id: null, name: "Doações", type: "income", color: "#00a7c4", is_system: true, sort_order: 30 },
    { id: "fin-cat-4", tenant_id: null, name: "Salários / Honorários", type: "expense", color: "#c23b3b", is_system: true, sort_order: 60 },
    { id: "fin-cat-5", tenant_id: null, name: "Manutenção", type: "expense", color: "#2f5a8a", is_system: true, sort_order: 100 },
    { id: "fin-cat-6", tenant_id: null, name: "Eventos", type: "expense", color: "#8a2f5a", is_system: true, sort_order: 110 },
  ],
  financialTransactions: [
    {
      id: "fin-tx-1",
      tenant_id: "demo-tenant",
      type: "income",
      amount: 3200.0,
      description: "Dízimos - Culto Dominical 26/05",
      date: "2026-05-26",
      payment_method: "pix",
      category_id: "fin-cat-1",
      member_id: "member-1",
      notes: null,
      created_at: new Date().toISOString(),
      financial_categories: { name: "Dízimos", color: "#2f8a5f" },
      members: { name: "Mariana Souza" },
    },
    {
      id: "fin-tx-2",
      tenant_id: "demo-tenant",
      type: "income",
      amount: 1850.0,
      description: "Oferta - Culto Dominical 26/05",
      date: "2026-05-26",
      payment_method: "cash",
      category_id: "fin-cat-2",
      member_id: null,
      notes: null,
      created_at: new Date().toISOString(),
      financial_categories: { name: "Ofertas", color: "#087c7a" },
      members: null,
    },
    {
      id: "fin-tx-3",
      tenant_id: "demo-tenant",
      type: "expense",
      amount: 4500.0,
      description: "Salário pastoral - Maio 2026",
      date: "2026-05-31",
      payment_method: "transfer",
      category_id: "fin-cat-4",
      member_id: null,
      notes: null,
      created_at: new Date().toISOString(),
      financial_categories: { name: "Salários / Honorários", color: "#c23b3b" },
      members: null,
    },
    {
      id: "fin-tx-4",
      tenant_id: "demo-tenant",
      type: "expense",
      amount: 320.0,
      description: "Manutenção sistema de som",
      date: "2026-05-20",
      payment_method: "pix",
      category_id: "fin-cat-5",
      member_id: null,
      notes: "Troca de cabos e microfone",
      created_at: new Date().toISOString(),
      financial_categories: { name: "Manutenção", color: "#2f5a8a" },
      members: null,
    },
    {
      id: "fin-tx-5",
      tenant_id: "demo-tenant",
      type: "income",
      amount: 500.0,
      description: "Dízimos - Culto de Oração 19/05",
      date: "2026-05-19",
      payment_method: "pix",
      category_id: "fin-cat-1",
      member_id: "member-2",
      notes: null,
      created_at: new Date().toISOString(),
      financial_categories: { name: "Dízimos", color: "#2f8a5f" },
      members: { name: "Paulo Alves" },
    },
  ],
  kidsGroups: [
    { id: "kids-group-1", tenant_id: "demo-tenant", name: "Berçário", description: "Bebês de 0 a 2 anos", age_min: 0, age_max: 2, color: "#f9a825", is_active: true, sort_order: 10, created_at: new Date().toISOString() },
    { id: "kids-group-2", tenant_id: "demo-tenant", name: "Maternal", description: "Crianças de 3 a 5 anos", age_min: 3, age_max: 5, color: "#42a5f5", is_active: true, sort_order: 20, created_at: new Date().toISOString() },
    { id: "kids-group-3", tenant_id: "demo-tenant", name: "Primários", description: "Crianças de 6 a 9 anos", age_min: 6, age_max: 9, color: "#66bb6a", is_active: true, sort_order: 30, created_at: new Date().toISOString() },
  ],
  kidsChildren: [
    { id: "kids-child-1", tenant_id: "demo-tenant", name: "Isabela Souza", date_of_birth: "2023-03-10", group_id: "kids-group-1", member_id: "member-1", allergies: null, special_needs: null, notes: null, is_active: true, created_at: new Date().toISOString(), kids_groups: { name: "Berçário" } },
    { id: "kids-child-2", tenant_id: "demo-tenant", name: "Gabriel Alves", date_of_birth: "2021-07-22", group_id: "kids-group-2", member_id: null, allergies: "Amendoim", special_needs: null, notes: null, is_active: true, created_at: new Date().toISOString(), kids_groups: { name: "Maternal" } },
    { id: "kids-child-3", tenant_id: "demo-tenant", name: "Layla Costa", date_of_birth: "2019-11-05", group_id: "kids-group-3", member_id: null, allergies: null, special_needs: null, notes: null, is_active: true, created_at: new Date().toISOString(), kids_groups: { name: "Primários" } },
  ],
  kidsGuardiansByChildId: {
    "kids-child-1": [{ id: "kids-guard-1", tenant_id: "demo-tenant", child_id: "kids-child-1", name: "Mariana Souza", phone: "(11) 99999-0001", relationship: "parent", member_id: "member-1", is_primary: true, created_at: new Date().toISOString(), kids_children: { name: "Isabela Souza" } }],
    "kids-child-2": [{ id: "kids-guard-2", tenant_id: "demo-tenant", child_id: "kids-child-2", name: "Paulo Alves", phone: "(11) 99999-0002", relationship: "parent", member_id: "member-2", is_primary: true, created_at: new Date().toISOString(), kids_children: { name: "Gabriel Alves" } }],
    "kids-child-3": [{ id: "kids-guard-3", tenant_id: "demo-tenant", child_id: "kids-child-3", name: "Ana Costa", phone: "(11) 99999-0003", relationship: "parent", member_id: null, is_primary: true, created_at: new Date().toISOString(), kids_children: { name: "Layla Costa" } }],
  },
  kidsTeacherSchedule: [
    { id: "kids-sched-1", tenant_id: "demo-tenant", schedule_date: new Date().toISOString().slice(0, 10), group_id: "kids-group-1", member_id: "member-3", role_label: "Professora", notes: null, created_at: new Date().toISOString(), members: { name: "Ana Lima", phone: null }, kids_groups: { name: "Berçário" } },
    { id: "kids-sched-2", tenant_id: "demo-tenant", schedule_date: new Date().toISOString().slice(0, 10), group_id: "kids-group-2", member_id: "member-4", role_label: "Professor", notes: null, created_at: new Date().toISOString(), members: { name: "Carlos Dias", phone: null }, kids_groups: { name: "Maternal" } },
  ],
  kidsAttendance: [
    { id: "kids-att-1", tenant_id: "demo-tenant", child_id: "kids-child-1", group_id: "kids-group-1", attendance_date: new Date().toISOString().slice(0, 10), checked_in_at: new Date().toISOString(), checked_out_at: null, guardian_name: "Mariana Souza", notes: null, created_at: new Date().toISOString(), kids_children: { name: "Isabela Souza" }, kids_groups: { name: "Berçário" } },
    { id: "kids-att-2", tenant_id: "demo-tenant", child_id: "kids-child-2", group_id: "kids-group-2", attendance_date: new Date().toISOString().slice(0, 10), checked_in_at: new Date().toISOString(), checked_out_at: null, guardian_name: "Paulo Alves", notes: null, created_at: new Date().toISOString(), kids_children: { name: "Gabriel Alves" }, kids_groups: { name: "Maternal" } },
  ],
  kidsActivities: [
    { id: "kids-act-1", tenant_id: "demo-tenant", group_id: "kids-group-2", title: "História de Davi e Golias", description: "Contação de história com fantoches. Material: bíblia ilustrada, fantoches.", activity_date: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString(), kids_groups: { name: "Maternal" } },
    { id: "kids-act-2", tenant_id: "demo-tenant", group_id: "kids-group-3", title: "Salmo 23 — memorização", description: "Atividade de memorização do Salmo 23 com música.", activity_date: new Date().toISOString().slice(0, 10), created_at: new Date().toISOString(), kids_groups: { name: "Primários" } },
  ],
  kidsCommunications: [
    { id: "kids-comm-1", tenant_id: "demo-tenant", child_id: null, title: "Evento especial crianças", message: "Neste domingo teremos uma programação especial para as crianças! Traga seu filho(a).", sent_via: "system", sent_at: new Date().toISOString(), created_at: new Date().toISOString(), kids_children: null },
  ],
  socialMediaChannels: [],
};

const clientTabs = [
  { key: "overview", label: "Visão geral", icon: LayoutDashboard },
  { key: "reports", label: "Relatórios", icon: Receipt },
  { key: "members", label: "Membros", icon: UsersRound },
  { key: "families", label: "Famílias", icon: Users2 },
  { key: "events", label: "Eventos", icon: CalendarDays },
  { key: "worship", label: "Louvor", icon: Music },
  { key: "financial", label: "Financeiro", icon: DollarSign },
  { key: "kids", label: "Kids", icon: Baby },
  { key: "bible-school", label: "Escola Bíblica", icon: BookOpen },
  { key: "notices", label: "Comunicados", icon: Bell },
  { key: "social-media", label: "Mídias Sociais", icon: Play },
  { key: "intercession", label: "Intercessão", icon: Heart },
  { key: "lists", label: "Cargos/Ministérios", icon: Edit3 },
  { key: "theme", label: "Identidade", icon: Palette },
  { key: "users", label: "Usuários", icon: ShieldCheck },
  { key: "policies", label: "Política & LGPD", icon: ScrollText },
] as const;

type ClientTab = (typeof clientTabs)[number]["key"];

const defaultClientTabs = new Set<ClientTab>(["overview"]);

const clientTabModuleCode: Partial<Record<ClientTab, string>> = {
  members: "members",
  families: "members",
  events: "events",
  worship: "worship",
  financial: "financial",
  kids: "kids",
  "bible-school": "bible-school",
  notices: "announcements",
  "social-media": "social_media",
  intercession: "intercession",
};

const tenantAdminOnlyTabs = new Set<ClientTab>(["lists", "theme", "users", "policies"]);

type ClientAdminProps = {
  demoMode?: boolean;
};

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const trimmed = String(value ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return fallback.toLowerCase();
}

function hexToRgbTuple(hex: string) {
  const normalized = normalizeHexColor(hex, "#000000");
  const value = normalized.slice(1);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }
  return [r, g, b] as const;
}

function rgbTupleToHex(rgb: readonly [number, number, number]) {
  const [r, g, b] = rgb;
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHexColors(aHex: string, bHex: string, weight: number) {
  const a = hexToRgbTuple(aHex);
  const b = hexToRgbTuple(bHex);
  if (!a || !b) {
    return normalizeHexColor(aHex, "#000000");
  }

  const w = Math.min(1, Math.max(0, weight));
  const mix = (aValue: number, bValue: number) => Math.round(aValue * (1 - w) + bValue * w);
  return rgbTupleToHex([mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2])]);
}

function lightenHex(hex: string, amount: number) {
  return mixHexColors(hex, "#ffffff", amount);
}

function darkenHex(hex: string, amount: number) {
  return mixHexColors(hex, "#000000", amount);
}

function pickReadableTextColor(backgroundHex: string) {
  const rgb = hexToRgbTuple(backgroundHex);
  if (!rgb) {
    return "#ffffff";
  }

  const srgb = rgb.map((channel) => channel / 255) as unknown as [number, number, number];
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [r, g, b] = srgb.map(toLinear) as unknown as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.58 ? "#162423" : "#ffffff";
}

function normalizePermissionLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isArtsScheduleAccessLabel(value: string | null | undefined) {
  const tokens = normalizePermissionLabel(value ?? "").split(/[^a-z0-9]+/).filter(Boolean);
  const scheduleTokens = new Set([
    "arte",
    "artes",
    "louvor",
    "worship",
    "danca",
    "midia",
    "multimidia",
    "teatro",
    "som",
    "audio",
    "audiovisual",
    "sound",
  ]);
  return tokens.some((token) => scheduleTokens.has(token));
}

function getTenantLogoObjectKey(storedLogoUrl: string | null | undefined) {
  if (!storedLogoUrl) {
    return null;
  }

  const trimmed = storedLogoUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/") || trimmed.startsWith("data:")) {
    return null;
  }

  if (!trimmed.startsWith("http")) {
    return trimmed.startsWith("tenant-logos/") ? trimmed.slice("tenant-logos/".length) : trimmed;
  }

  const match = trimmed.match(/\/storage\/v1\/object\/(?:public|sign)\/tenant-logos\/([^?]+)(?:\?.*)?$/i);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getTenantLogoPublicUrl(storedLogoUrl: string | null | undefined, tenantId: string) {
  const rawLogo = storedLogoUrl?.trim() ?? "";
  if (!rawLogo) {
    return null;
  }

  if (rawLogo.startsWith("/") || rawLogo.startsWith("data:")) {
    return rawLogo;
  }

  const objectKey = getTenantLogoObjectKey(rawLogo);
  if (!objectKey && rawLogo.startsWith("http")) {
    return rawLogo;
  }

  const resolvedObjectKey = objectKey ?? `${tenantId}/logo`;
  const { data } = supabase.storage.from("tenant-logos").getPublicUrl(resolvedObjectKey);
  return data.publicUrl ? `${data.publicUrl}?v=${encodeURIComponent(rawLogo)}` : null;
}

type DocInfo = { formatted: string; type: "cpf" | "rg" | "unknown"; error: string | null };

function formatDocument(raw: string): DocInfo {
  // Keep digits and letters (RG may end in X)
  const clean = raw.replace(/[^0-9a-zA-Z]/g, "").toUpperCase().slice(0, 11);
  const digits = clean.replace(/[^0-9]/g, "");

  // 10-11 numeric chars → CPF
  if (digits.length >= 10 && clean === digits) {
    const d = digits.slice(0, 11);
    let formatted = d;
    if (d.length > 9) formatted = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
    else if (d.length > 6) formatted = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    else if (d.length > 3) formatted = `${d.slice(0,3)}.${d.slice(3)}`;

    let error: string | null = null;
    if (d.length === 11) {
      if (/^(\d)\1{10}$/.test(d)) {
        error = "CPF inválido";
      } else {
        const calc = (len: number) => {
          let sum = 0;
          for (let i = 0; i < len; i++) sum += parseInt(d[i]) * (len + 1 - i);
          const r = (sum * 10) % 11;
          return r >= 10 ? 0 : r;
        };
        if (calc(9) !== parseInt(d[9]) || calc(10) !== parseInt(d[10])) error = "CPF inválido";
      }
    }
    return { formatted, type: "cpf", error };
  }

  // ≤ 9 chars → RG (format: 00.000.000-X)
  const rg = clean.slice(0, 9);
  let formatted = rg;
  if (rg.length > 8) formatted = `${rg.slice(0,2)}.${rg.slice(2,5)}.${rg.slice(5,8)}-${rg.slice(8)}`;
  else if (rg.length > 5) formatted = `${rg.slice(0,2)}.${rg.slice(2,5)}.${rg.slice(5)}`;
  else if (rg.length > 2) formatted = `${rg.slice(0,2)}.${rg.slice(2)}`;
  const type = rg.length >= 5 ? "rg" : "unknown";
  return { formatted, type, error: null };
}

function worshipStatusLabel(status: WorshipEventRecord["status"]) {
  if (status === "published") return "Publicado";
  if (status === "completed") return "Concluido";
  if (status === "cancelled") return "Cancelado";
  return "Rascunho";
}

function worshipAssignmentStatusLabel(status: WorshipAssignmentRecord["status"]) {
  if (status === "confirmed") return "Confirmado";
  if (status === "declined") return "Recusado";
  if (status === "standby") return "Apoio";
  return "Pendente";
}

function toCsvValue(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  const normalized = raw.replace(/\r?\n/g, " ").trim();
  if (/[",;\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      for (const key of Object.keys(row)) acc.add(key);
      return acc;
    }, new Set<string>()),
  );

  const lines: string[] = [];
  lines.push(headers.map(toCsvValue).join(";"));
  for (const row of rows) {
    lines.push(headers.map((key) => toCsvValue(row[key])).join(";"));
  }

  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openPrintablePdf(html: string, title: string) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; font-size: 13px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: bold; color: #444; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
    th, td { border: 1px solid #ddd; padding: 7px 9px; font-size: 12px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; font-weight: bold; }
    tr:nth-child(even) td { background: #fafafa; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 12px 16px; }
    .summary-card .label { font-size: 11px; color: #666; margin-bottom: 4px; }
    .summary-card .value { font-size: 20px; font-weight: bold; }
    .income { color: #1a7a44; }
    .expense { color: #c0392b; }
    .neutral { color: #1a3d6b; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; }
    .badge-present { background: #d4edda; color: #155724; }
    .badge-absent { background: #f8d7da; color: #721c24; }
    .badge-excused { background: #fff3cd; color: #856404; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
${html}
<script>window.print();</script>
</body>
</html>`);
  popup.document.close();
}

function exportFinancialPdf(
  tenantName: string,
  period: string,
  income: number,
  expense: number,
  net: number,
  reportByCategory: Array<{ name: string; income: number; expense: number; color?: string | null }>,
  transactions: Array<{ date: string; description: string | null; type: "income" | "expense"; amount: number; financial_categories?: { name: string } | null; members?: { name: string } | null; payment_method?: string | null }>,
) {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const esc = (v: string | null | undefined) =>
    (v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const catRows = reportByCategory
    .map(
      (r) =>
        `<tr>
          <td>${esc(r.name)}</td>
          <td class="income">${r.income > 0 ? fmt(r.income) : "—"}</td>
          <td class="expense">${r.expense > 0 ? fmt(r.expense) : "—"}</td>
          <td>${fmt(r.income - r.expense)}</td>
        </tr>`,
    )
    .join("");

  const txRows = transactions
    .slice(0, 200)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (t) =>
        `<tr>
          <td>${new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
          <td>${esc(t.description)}</td>
          <td>${esc(t.financial_categories?.name)}</td>
          <td>${esc(t.members?.name)}</td>
          <td>${esc(t.payment_method ?? "—")}</td>
          <td class="${t.type === "income" ? "income" : "expense"}">${t.type === "income" ? "+" : "-"}${fmt(t.amount)}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <h1>Relatório Financeiro — ${esc(tenantName)}</h1>
    <div class="meta">Período: ${esc(period)} · Gerado em ${new Date().toLocaleString("pt-BR")}</div>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Receitas</div><div class="value income">${fmt(income)}</div></div>
      <div class="summary-card"><div class="label">Despesas</div><div class="value expense">${fmt(expense)}</div></div>
      <div class="summary-card"><div class="label">Saldo</div><div class="value ${net >= 0 ? "income" : "expense"}">${fmt(net)}</div></div>
    </div>
    <div class="section-title">Por categoria</div>
    <table>
      <thead><tr><th>Categoria</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr></thead>
      <tbody>${catRows || "<tr><td colspan='4'>Sem dados</td></tr>"}</tbody>
    </table>
    <div class="section-title">Lançamentos (${transactions.length})</div>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Membro</th><th>Forma pgto.</th><th>Valor</th></tr></thead>
      <tbody>${txRows || "<tr><td colspan='6'>Sem lançamentos</td></tr>"}</tbody>
    </table>`;

  openPrintablePdf(html, `Financeiro ${period} · ${tenantName}`);
}

function exportBibleSchoolPdf(
  tenantName: string,
  className: string,
  enrollments: Array<{ id: string; bible_school_students: { name: string } | null }>,
  sessions: Array<{ id: string; session_date: string; topic: string | null }>,
  attendance: Array<{ session_id: string; enrollment_id: string; status: "present" | "absent" | "excused" }>,
  grades: Array<{ enrollment_id: string; title: string; score: number | null; max_score: number | null }>,
) {
  const esc = (v: string | null | undefined) =>
    (v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const statusLabel = { present: "Presente", absent: "Falta", excused: "Justificada" };
  const statusClass = { present: "badge-present", absent: "badge-absent", excused: "badge-excused" };

  const attHeaders = sessions
    .slice()
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .map(
      (s) =>
        `<th title="${esc(s.topic ?? "")}">${new Date(s.session_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</th>`,
    )
    .join("");

  const attRows = enrollments
    .map((enr) => {
      const cells = sessions
        .slice()
        .sort((a, b) => a.session_date.localeCompare(b.session_date))
        .map((s) => {
          const rec = attendance.find((a) => a.session_id === s.id && a.enrollment_id === enr.id);
          if (!rec) return `<td style="color:#aaa">—</td>`;
          return `<td><span class="badge ${statusClass[rec.status]}">${statusLabel[rec.status]}</span></td>`;
        })
        .join("");
      return `<tr><td>${esc(enr.bible_school_students?.name)}</td>${cells}</tr>`;
    })
    .join("");

  const gradeRows = grades
    .map((g) => {
      const enr = enrollments.find((e) => e.id === g.enrollment_id);
      const score =
        g.score === null && g.max_score === null
          ? "—"
          : g.max_score === null
            ? String(g.score ?? "—")
            : `${g.score ?? "—"} / ${g.max_score}`;
      return `<tr><td>${esc(enr?.bible_school_students?.name ?? "—")}</td><td>${esc(g.title)}</td><td>${score}</td></tr>`;
    })
    .join("");

  const html = `
    <h1>Escola Bíblica — ${esc(className)}</h1>
    <div class="meta">${esc(tenantName)} · Gerado em ${new Date().toLocaleString("pt-BR")}</div>
    <div class="section-title">Frequência (${sessions.length} aulas · ${enrollments.length} alunos)</div>
    <table>
      <thead><tr><th>Aluno</th>${attHeaders}</tr></thead>
      <tbody>${attRows || "<tr><td>Sem alunos</td></tr>"}</tbody>
    </table>
    <div class="section-title">Notas (${grades.length} registros)</div>
    <table>
      <thead><tr><th>Aluno</th><th>Avaliação</th><th>Nota</th></tr></thead>
      <tbody>${gradeRows || "<tr><td colspan='3'>Nenhuma nota lançada</td></tr>"}</tbody>
    </table>`;

  openPrintablePdf(html, `Escola Bíblica · ${className} · ${tenantName}`);
}

function exportKidsAttendancePdf(
  tenantName: string,
  date: string,
  attendance: Array<{ kids_children?: { name: string } | null; kids_groups?: { name: string } | null; checked_in_at: string | null; checked_out_at: string | null; guardian_name: string | null }>,
) {
  const esc = (v: string | null | undefined) =>
    (v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const rows = attendance
    .map(
      (a) =>
        `<tr>
          <td>${esc(a.kids_children?.name)}</td>
          <td>${esc(a.kids_groups?.name)}</td>
          <td>${a.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
          <td>${a.checked_out_at ? new Date(a.checked_out_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
          <td>${esc(a.guardian_name)}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <h1>Kids — Presença do dia</h1>
    <div class="meta">${esc(tenantName)} · ${new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · Gerado em ${new Date().toLocaleString("pt-BR")}</div>
    <div class="summary-grid" style="grid-template-columns: repeat(2,auto);">
      <div class="summary-card"><div class="label">Crianças presentes</div><div class="value neutral">${attendance.length}</div></div>
    </div>
    <table>
      <thead><tr><th>Criança</th><th>Turma</th><th>Entrada</th><th>Saída</th><th>Responsável</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='5'>Nenhuma presença registrada</td></tr>"}</tbody>
    </table>`;

  openPrintablePdf(html, `Kids · Presença ${date} · ${tenantName}`);
}

function openPrintableTable(title: string, headers: string[], rows: string[][]) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;

  const escape = (v: string) =>
    v
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escape(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    .meta { color: #666; font-size: 12px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>${escape(title)}</h1>
  <div class="meta">Gerado em ${escape(new Date().toLocaleString("pt-BR"))}</div>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`)
        .join("")}
    </tbody>
  </table>
  <script>window.print();</script>
</body>
</html>`;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

export function ClientAdmin({ demoMode = false }: ClientAdminProps) {
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [dataStatus, setDataStatus] = useState<LoadStatus>("idle");
  const [clientData, setClientData] = useState<ClientDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>("overview");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordDraftConfirm, setPasswordDraftConfirm] = useState("");
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<LoginStatus>("idle");
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<"all" | MemberFormState["status"]>("all");
  const [memberForm, setMemberForm] = useState<MemberFormState>(emptyMemberForm);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberSaveStatus, setMemberSaveStatus] = useState<LoginStatus>("idle");
  const [memberSaveMessage, setMemberSaveMessage] = useState("");
  const [memberHistory, setMemberHistory] = useState<MemberHistoryRecord[]>([]);
  const [memberHistoryStatus, setMemberHistoryStatus] = useState<LoadStatus>("idle");
  const [memberHistoryDraftType, setMemberHistoryDraftType] = useState("");
  const [memberHistoryDraftNotes, setMemberHistoryDraftNotes] = useState("");
  const [familyForm, setFamilyForm] = useState<FamilyFormState>(emptyFamilyForm);
  const [isFamilyFormOpen, setIsFamilyFormOpen] = useState(false);
  const [familySaveStatus, setFamilySaveStatus] = useState<LoginStatus>("idle");
  const [familySaveMessage, setFamilySaveMessage] = useState("");
  const [familyMemberPickerId, setFamilyMemberPickerId] = useState("");
  const [familyMemberRelationship, setFamilyMemberRelationship] = useState("other");
  const [familyMemberPrimary, setFamilyMemberPrimary] = useState(false);
  const [memberDependentPickerId, setMemberDependentPickerId] = useState("");
  const [memberDependentRelationship, setMemberDependentRelationship] = useState("child");
  const [memberDependentName, setMemberDependentName] = useState("");
  const [memberDependentDob, setMemberDependentDob] = useState("");
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventSaveStatus, setEventSaveStatus] = useState<LoginStatus>("idle");
  const [eventSaveMessage, setEventSaveMessage] = useState("");
  const [eventBannerFile, setEventBannerFile] = useState<File | null>(null);
  const [eventBannerPreviewUrl, setEventBannerPreviewUrl] = useState<string | null>(null);
  const [eventBannerUploadStatus, setEventBannerUploadStatus] = useState<LoginStatus>("idle");
  const [eventBannerUploadMessage, setEventBannerUploadMessage] = useState("");
  const eventDescriptionEditorRef = useRef<HTMLDivElement | null>(null);
  const [eventViewMode, setEventViewMode] = useState<"list" | "calendar">("list");
  const [eventCalendarMonth, setEventCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [eventNotifyOpen, setEventNotifyOpen] = useState(false);
  const [eventNotifyTarget, setEventNotifyTarget] = useState<EventRecord | null>(null);
  const [eventNotifyStatus, setEventNotifyStatus] = useState<LoginStatus>("idle");
  const [eventNotifyMessage, setEventNotifyMessage] = useState("");
  const [eventPreviewOpen, setEventPreviewOpen] = useState(false);
  const [eventPreviewTarget, setEventPreviewTarget] = useState<EventRecord | null>(null);
  const [pushComposerOpen, setPushComposerOpen] = useState(false);
  const [pushComposerModule, setPushComposerModule] = useState<"worship" | "kids" | "bible-school">("worship");
  const [pushComposerMode, setPushComposerMode] = useState<
    | "worship_ministry"
    | "worship_admins"
    | "worship_selected"
    | "kids_checked_in"
    | "kids_selected"
    | "bible_all"
    | "bible_selected"
  >("worship_ministry");
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushRecipientSearch, setPushRecipientSearch] = useState("");
  const [pushCandidatesStatus, setPushCandidatesStatus] = useState<LoadStatus>("idle");
  const [pushCandidatesMessage, setPushCandidatesMessage] = useState("");
  const [pushCandidates, setPushCandidates] = useState<Array<{ profile_id: string; label: string; meta?: string }>>([]);
  const [pushSelectedProfileIds, setPushSelectedProfileIds] = useState<string[]>([]);
  const [pushKidsGroupId, setPushKidsGroupId] = useState<string>("");
  const [pushKidsDate, setPushKidsDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pushSendStatus, setPushSendStatus] = useState<LoginStatus>("idle");
  const [pushSendMessage, setPushSendMessage] = useState("");
  const [worshipEventForm, setWorshipEventForm] = useState<WorshipEventFormState>(emptyWorshipEventForm);
  const [worshipAssignmentForm, setWorshipAssignmentForm] = useState<WorshipAssignmentFormState>(
    emptyWorshipAssignmentForm,
  );
  const [worshipSaveStatus, setWorshipSaveStatus] = useState<LoginStatus>("idle");
  const [worshipSaveMessage, setWorshipSaveMessage] = useState("");
  const [worshipEmailModalEventId, setWorshipEmailModalEventId] = useState<string | null>(null);
  const [worshipEmailSending, setWorshipEmailSending] = useState(false);
  const [worshipEmailFeedback, setWorshipEmailFeedback] = useState("");
  const [worshipEmailFeedbackType, setWorshipEmailFeedbackType] = useState<"success" | "error">("success");
  const [worshipEmailCampaignsByEventId, setWorshipEmailCampaignsByEventId] = useState<Record<string, WorshipEmailCampaign[]>>({});
  const [editingWorshipEventId, setEditingWorshipEventId] = useState<string | null>(null);
  const [worshipFlowStep, setWorshipFlowStep] = useState<1 | 2>(1);
  const [worshipViewMode, setWorshipViewMode] = useState<"list" | "calendar">("list");
  const [worshipCalendarMonth, setWorshipCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const announcementEditorRef = useRef<HTMLDivElement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(emptyAnnouncementForm);
  const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);
  const [announcementSaveStatus, setAnnouncementSaveStatus] = useState<LoginStatus>("idle");
  const [announcementSaveMessage, setAnnouncementSaveMessage] = useState("");
  const [announcementNotifyOpen, setAnnouncementNotifyOpen] = useState(false);
  const [announcementNotifyTarget, setAnnouncementNotifyTarget] = useState<AnnouncementRecord | null>(null);
  const [announcementNotifyStatus, setAnnouncementNotifyStatus] = useState<LoginStatus>("idle");
  const [announcementNotifyMessage, setAnnouncementNotifyMessage] = useState("");
  const [announcementPreviewOpen, setAnnouncementPreviewOpen] = useState(false);
  const [announcementPreviewTarget, setAnnouncementPreviewTarget] = useState<AnnouncementRecord | null>(null);
  const [isSocialMediaFormOpen, setIsSocialMediaFormOpen] = useState(false);
  const [socialMediaFormMode, setSocialMediaFormMode] = useState<"create" | "edit">("create");
  const [socialMediaEditTarget, setSocialMediaEditTarget] = useState<SocialMediaChannelRecord | null>(null);
  const [socialMediaFormName, setSocialMediaFormName] = useState("");
  const [socialMediaFormUrl, setSocialMediaFormUrl] = useState("");
  const [socialMediaFormDescription, setSocialMediaFormDescription] = useState("");
  const [socialMediaSaveStatus, setSocialMediaSaveStatus] = useState<LoginStatus>("idle");
  const [socialMediaSaveMessage, setSocialMediaSaveMessage] = useState("");

  // Intercession state
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequestRecord[]>([]);
  const [prayerAssignments, setPrayerAssignments] = useState<PrayerAssignmentRecord[]>([]);
  const [intercessionLoadStatus, setIntercessionLoadStatus] = useState<LoadStatus>("idle");
  const [intercessionMembers, setIntercessionMembers] = useState<IntercessorMember[]>([]);
  const [assignModalTarget, setAssignModalTarget] = useState<PrayerRequestRecord | null>(null);
  const [assignSelectedMemberId, setAssignSelectedMemberId] = useState("");
  const [assignStatus, setAssignStatus] = useState<LoginStatus>("idle");
  const [assignMessage, setAssignMessage] = useState("");
  const [distributeStatus, setDistributeStatus] = useState<LoginStatus>("idle");
  const [distributeMessage, setDistributeMessage] = useState("");
  const [intercessionFilter, setIntercessionFilter] = useState<"all" | "new" | "assigned" | "interceding" | "done">("all");

  const [themeForm, setThemeForm] = useState<ThemeFormState>(emptyThemeForm);
  const [themeSaveStatus, setThemeSaveStatus] = useState<LoginStatus>("idle");
  const [themeSaveMessage, setThemeSaveMessage] = useState("");
  const [logoUploadStatus, setLogoUploadStatus] = useState<LoginStatus>("idle");
  const [logoUploadMessage, setLogoUploadMessage] = useState("");
  const [resolvedTenantLogoUrl, setResolvedTenantLogoUrl] = useState<string | null>(null);
  const [themeLogoPreviewUrl, setThemeLogoPreviewUrl] = useState<string | null>(null);
  const [userEdits, setUserEdits] = useState<Record<string, UserEditState>>({});
  const [userSaveStatus, setUserSaveStatus] = useState<Record<string, LoginStatus>>({});
  const [userSaveMessage, setUserSaveMessage] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [avatarErrorUrl, setAvatarErrorUrl] = useState<string | null>(null);
  const [catalogRoleDraft, setCatalogRoleDraft] = useState("");
  const [catalogMinistryDraft, setCatalogMinistryDraft] = useState("");
  const [catalogEdits, setCatalogEdits] = useState<Record<string, string>>({});
  const [catalogSaveStatus, setCatalogSaveStatus] = useState<LoginStatus>("idle");
  const [catalogSaveMessage, setCatalogSaveMessage] = useState("");
  const [ministryPickerId, setMinistryPickerId] = useState("");
  const [cepLookupStatus, setCepLookupStatus] = useState<"idle" | "loading" | "notfound" | "error">("idle");
  const [cepError, setCepError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [financialTransactionForm, setFinancialTransactionForm] = useState<FinancialTransactionFormState>(emptyFinancialTransactionForm);
  const [financialCategoryForm, setFinancialCategoryForm] = useState<FinancialCategoryFormState>(emptyFinancialCategoryForm);
  const [isFinancialTransactionFormOpen, setIsFinancialTransactionFormOpen] = useState(false);
  const [financialSaveStatus, setFinancialSaveStatus] = useState<LoginStatus>("idle");
  const [financialSaveMessage, setFinancialSaveMessage] = useState("");
  const [financialView, setFinancialView] = useState<"dashboard" | "transactions" | "categories" | "reports">("dashboard");
  const [financialFilterType, setFinancialFilterType] = useState<"all" | "income" | "expense">("all");
  const [financialFilterCategoryId, setFinancialFilterCategoryId] = useState("");
  const [financialFilterMonth, setFinancialFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [financialReceiptTransactionId, setFinancialReceiptTransactionId] = useState<string | null>(null);
  const [financialDashboardDonutType, setFinancialDashboardDonutType] = useState<"income" | "expense">("income");
  const [financialDashboardHoverMonth, setFinancialDashboardHoverMonth] = useState<string | null>(null);
  const [financialDashboardHoverCategory, setFinancialDashboardHoverCategory] = useState<string | null>(null);
  const [kidsView, setKidsView] = useState<"dashboard" | "children" | "schedule" | "attendance" | "activities" | "communications">("dashboard");
  const [kidsGroupForm, setKidsGroupForm] = useState<KidsGroupFormState>(emptyKidsGroupForm);
  const [kidsChildForm, setKidsChildForm] = useState<KidsChildFormState>(emptyKidsChildForm);
  const [kidsGuardianForm, setKidsGuardianForm] = useState<KidsGuardianFormState>(emptyKidsGuardianForm);
  const [kidsTeacherScheduleForm, setKidsTeacherScheduleForm] = useState<KidsTeacherScheduleFormState>(emptyKidsTeacherScheduleForm);
  const [kidsAttendanceForm, setKidsAttendanceForm] = useState<KidsAttendanceFormState>(emptyKidsAttendanceForm);
  const [kidsActivityForm, setKidsActivityForm] = useState<KidsActivityFormState>(emptyKidsActivityForm);
  const [kidsCommunicationForm, setKidsCommunicationForm] = useState<KidsCommunicationFormState>(emptyKidsCommunicationForm);
  const [isKidsGroupFormOpen, setIsKidsGroupFormOpen] = useState(false);
  const [isKidsChildFormOpen, setIsKidsChildFormOpen] = useState(false);
  const [isKidsGuardianFormOpen, setIsKidsGuardianFormOpen] = useState(false);
  const [isKidsTeacherScheduleFormOpen, setIsKidsTeacherScheduleFormOpen] = useState(false);
  const [isKidsAttendanceFormOpen, setIsKidsAttendanceFormOpen] = useState(false);
  const [isKidsActivityFormOpen, setIsKidsActivityFormOpen] = useState(false);
  const [isKidsCommunicationFormOpen, setIsKidsCommunicationFormOpen] = useState(false);
  const [kidsSaveStatus, setKidsSaveStatus] = useState<LoginStatus>("idle");
  const [kidsSaveMessage, setKidsSaveMessage] = useState("");
  const [kidsFilterGroupId, setKidsFilterGroupId] = useState("");
  const [kidsAttendanceDate, setKidsAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kidsSelectedChildId, setKidsSelectedChildId] = useState<string | null>(null);
  const [kidsChildSearch, setKidsChildSearch] = useState("");
  const [kidsQrToken, setKidsQrToken] = useState("");
  const [isKidsQrScannerOpen, setIsKidsQrScannerOpen] = useState(false);
  const [kidsQrScannerMessage, setKidsQrScannerMessage] = useState("");
  const kidsQrVideoRef = useRef<HTMLVideoElement | null>(null);
  const kidsQrStreamRef = useRef<MediaStream | null>(null);
  const kidsQrScanTimerRef = useRef<number | null>(null);
  const [bibleSchoolStatus, setBibleSchoolStatus] = useState<LoadStatus>("idle");
  const [bibleSchoolMessage, setBibleSchoolMessage] = useState("");
  const [bibleSchoolClasses, setBibleSchoolClasses] = useState<BibleSchoolClassRecord[]>([]);
  const [selectedBibleSchoolClassId, setSelectedBibleSchoolClassId] = useState<string | null>(null);
  const [bibleSchoolClassForm, setBibleSchoolClassForm] = useState<BibleSchoolClassFormState>(emptyBibleSchoolClassForm);
  const [isBibleSchoolClassFormOpen, setIsBibleSchoolClassFormOpen] = useState(false);
  const [bibleSchoolTeachers, setBibleSchoolTeachers] = useState<BibleSchoolTeacherRecord[]>([]);
  const [bibleSchoolClassTeachers, setBibleSchoolClassTeachers] = useState<BibleSchoolClassTeacherRecord[]>([]);
  const [bibleSchoolEnrollments, setBibleSchoolEnrollments] = useState<BibleSchoolEnrollmentRecord[]>([]);
  const [bibleSchoolStudents, setBibleSchoolStudents] = useState<BibleSchoolStudentRecord[]>([]);
  const [bibleSchoolStudentForm, setBibleSchoolStudentForm] = useState<BibleSchoolStudentFormState>(emptyBibleSchoolStudentForm);
  const [isBibleSchoolStudentFormOpen, setIsBibleSchoolStudentFormOpen] = useState(false);
  const [bibleSchoolSessions, setBibleSchoolSessions] = useState<BibleSchoolSessionRecord[]>([]);
  const [selectedBibleSchoolSessionId, setSelectedBibleSchoolSessionId] = useState<string | null>(null);
  const [bibleSchoolSessionForm, setBibleSchoolSessionForm] = useState<BibleSchoolSessionFormState>(emptyBibleSchoolSessionForm);
  const [isBibleSchoolSessionFormOpen, setIsBibleSchoolSessionFormOpen] = useState(false);
  const [bibleSchoolAttendance, setBibleSchoolAttendance] = useState<BibleSchoolAttendanceRecord[]>([]);
  const [bibleSchoolMaterials, setBibleSchoolMaterials] = useState<BibleSchoolMaterialRecord[]>([]);
  const [bibleSchoolGrades, setBibleSchoolGrades] = useState<BibleSchoolGradeRecord[]>([]);
  const [bibleSchoolMaterialForm, setBibleSchoolMaterialForm] = useState<BibleSchoolMaterialFormState>(emptyBibleSchoolMaterialForm);
  const [isBibleSchoolMaterialFormOpen, setIsBibleSchoolMaterialFormOpen] = useState(false);
  const [bibleSchoolGradeForm, setBibleSchoolGradeForm] = useState<BibleSchoolGradeFormState>(emptyBibleSchoolGradeForm);
  const [isBibleSchoolGradeFormOpen, setIsBibleSchoolGradeFormOpen] = useState(false);
  const [tenantAuditLogs, setTenantAuditLogs] = useState<TenantAuditLogRecord[]>([]);
  const [tenantAuditStatus, setTenantAuditStatus] = useState<LoadStatus>("idle");
  const [tenantAuditMessage, setTenantAuditMessage] = useState("");
  const [isTenantAuditOpen, setIsTenantAuditOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ── Política & LGPD ──────────────────────────────────────────────────────
  type PolicyRecord = { id: string; terms_text: string; privacy_text: string; version: number; published_at: string | null };
  type LgpdConsentRecord = { id: string; user_id: string; consent_type: string; granted: boolean; consented_at: string; profiles?: { full_name: string | null; email: string } };
  type PolicyAcceptanceRecord = { id: string; user_id: string; policy_version: number; accepted_at: string; profiles?: { full_name: string | null; email: string } };
  const [policyRecord, setPolicyRecord] = useState<PolicyRecord | null>(null);
  const [policyForm, setPolicyForm] = useState({ terms_text: "", privacy_text: "" });
  const [policyStatus, setPolicyStatus] = useState<LoginStatus>("idle");
  const [policyMessage, setPolicyMessage] = useState("");
  const [lgpdConsents, setLgpdConsents] = useState<LgpdConsentRecord[]>([]);
  const [policyAcceptances, setPolicyAcceptances] = useState<PolicyAcceptanceRecord[]>([]);

  const isTenantAdmin = useMemo(() => {
    if (!profile) return false;
    return profile.tenant_role === "owner" || profile.tenant_role === "admin";
  }, [profile]);

  const isSecretariaAdmin = useMemo(() => {
    if (!profile?.member_id || !clientData) {
      return false;
    }

    const memberships = clientData.memberMinistriesByMemberId[profile.member_id] ?? [];
    const hasSecretariaMinistryAccess = memberships.some(
      (item) => item.is_admin && normalizePermissionLabel(item.name).startsWith("secretari"),
    );

    const roleIds = clientData.memberRoleIdsByMemberId[profile.member_id] ?? [];
    const hasSecretaryRole = roleIds.some((roleId) => {
      const role = clientData.catalogRoles.find((item) => item.id === roleId);
      return role ? normalizePermissionLabel(role.name).startsWith("secretari") : false;
    });

    return hasSecretariaMinistryAccess || hasSecretaryRole;
  }, [clientData, profile?.member_id]);

  const activeModuleIdByCode = useMemo(() => {
    const modules = clientData?.modules ?? [];
    return modules.reduce<Record<string, string>>((acc, item) => {
      acc[item.code] = item.id;
      return acc;
    }, {});
  }, [clientData?.modules]);

  const currentUserModuleAdminIds = useMemo(() => {
    if (!profile || !clientData) {
      return [];
    }

    const directAccess = clientData.moduleAdminModuleIdsByProfileId[profile.id] ?? [];
    const memberAccess = profile.member_id ? clientData.moduleAdminModuleIdsByMemberId[profile.member_id] ?? [] : [];
    return Array.from(new Set([...directAccess, ...memberAccess]));
  }, [clientData, profile]);

  const canManageModuleCode = (moduleCode: string) => {
    if (isTenantAdmin) {
      return true;
    }

    const moduleId = activeModuleIdByCode[moduleCode];
    return Boolean(moduleId && currentUserModuleAdminIds.includes(moduleId));
  };

  const canManageMembershipModule = canManageModuleCode("members");
  const canManageMembers = isTenantAdmin || isSecretariaAdmin || canManageMembershipModule;
  const canManageEvents = canManageModuleCode("events");
  const canManageWorship = canManageModuleCode("worship");
  const canManageFinancial = canManageModuleCode("financial");
  const canManageKids = canManageModuleCode("kids");
  const canManageBibleSchool = canManageModuleCode("bible-school");
  const canManageAnnouncements = canManageModuleCode("announcements");
  const canManageSocialMedia = canManageModuleCode("social_media");
  const canManageIntercession = canManageModuleCode("intercession");

  const pushRouteDefaults: Record<"worship" | "kids" | "bible-school", string> = {
    worship: "/(app)/modulos/louvor",
    kids: "/(app)/modulos/kids",
    "bible-school": "/(app)/modulos/escola-biblica",
  };

  function closePushComposer() {
    setPushComposerOpen(false);
    setPushSendStatus("idle");
    setPushSendMessage("");
    setPushCandidatesStatus("idle");
    setPushCandidatesMessage("");
    setPushCandidates([]);
    setPushSelectedProfileIds([]);
    setPushRecipientSearch("");
  }

  async function loadPushCandidates(mode: typeof pushComposerMode, moduleCode: typeof pushComposerModule) {
    if (!clientData) return;

    setPushCandidatesStatus("loading");
    setPushCandidatesMessage("");
    setPushCandidates([]);
    setPushSelectedProfileIds([]);

    if (moduleCode === "worship" && mode === "worship_selected") {
      const moduleId = activeModuleIdByCode.worship ?? null;
      const adminProfileIds: string[] = [];
      const adminMemberIds: string[] = [];

      if (moduleId) {
        const moduleAdminsResult = await supabase
          .from("tenant_module_admins")
          .select("profile_id, member_id")
          .eq("tenant_id", clientData.tenant.id)
          .eq("module_id", moduleId);

        if (!moduleAdminsResult.error) {
          (moduleAdminsResult.data ?? []).forEach((row) => {
            if (row.profile_id) adminProfileIds.push(String(row.profile_id));
            if (row.member_id) adminMemberIds.push(String(row.member_id));
          });
        }
      }

      const tenantMinistry = await supabase
        .from("catalog_ministries")
        .select("id")
        .eq("tenant_id", clientData.tenant.id)
        .ilike("name", "%louvor%")
        .limit(1)
        .maybeSingle<{ id: string }>();

      const systemMinistry = !tenantMinistry.data?.id
        ? await supabase
            .from("catalog_ministries")
            .select("id")
            .is("tenant_id", null)
            .ilike("name", "%louvor%")
            .limit(1)
            .maybeSingle<{ id: string }>()
        : null;

      const ministryId = tenantMinistry.data?.id ?? systemMinistry?.data?.id ?? null;

      const ministryMemberIds: string[] = [];
      if (ministryId) {
        const ministryMembersResult = await supabase
          .from("member_ministries")
          .select("member_id")
          .eq("tenant_id", clientData.tenant.id)
          .eq("ministry_id", ministryId);

        if (!ministryMembersResult.error) {
          (ministryMembersResult.data ?? []).forEach((row) => {
            if (row.member_id) ministryMemberIds.push(String(row.member_id));
          });
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, member_id, tenant_role")
        .eq("tenant_id", clientData.tenant.id)
        .eq("status", "active");

      if (error) {
        setPushCandidatesStatus("error");
        setPushCandidatesMessage("Não foi possível carregar a lista de usuários.");
        return;
      }

      const adminProfileSet = new Set(adminProfileIds);
      const adminMemberSet = new Set(adminMemberIds);
      const ministryMemberSet = new Set(ministryMemberIds);

      const filtered = (data ?? []).filter((row) => {
        const tenantRole = row.tenant_role as TenantRole | null;
        if (tenantRole === "owner" || tenantRole === "admin") return true;
        if (adminProfileSet.has(String(row.id))) return true;
        const memberId = row.member_id ? String(row.member_id) : null;
        if (!memberId) return false;
        return adminMemberSet.has(memberId) || ministryMemberSet.has(memberId);
      });

      const list = filtered
        .map((row) => ({
          profile_id: String(row.id),
          label: String(row.full_name ?? row.email ?? "Usuário"),
          meta: row.email as string | undefined,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

      setPushCandidates(list);
      setPushCandidatesStatus("ready");
      return;
    }

    if (moduleCode === "kids" && (mode === "kids_checked_in" || mode === "kids_selected")) {
      const groupId = pushKidsGroupId || kidsFilterGroupId || "";
      if (!groupId) {
        setPushCandidatesStatus("error");
        setPushCandidatesMessage("Selecione uma turma para listar os responsáveis.");
        return;
      }

      const date = pushKidsDate || kidsAttendanceDate;
      const attendanceResult = await supabase
        .from("kids_attendance")
        .select("child_id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("attendance_date", date)
        .eq("group_id", groupId)
        .not("checked_in_at", "is", null);

      if (attendanceResult.error) {
        setPushCandidatesStatus("error");
        setPushCandidatesMessage("Não foi possível carregar as crianças com check-in.");
        return;
      }

      const childIds = Array.from(new Set((attendanceResult.data ?? []).map((row) => row.child_id).filter(Boolean)));
      if (childIds.length === 0) {
        setPushCandidatesStatus("ready");
        setPushCandidatesMessage("Nenhuma criança com check-in para a turma/data selecionadas.");
        return;
      }

      const guardiansResult = await supabase
        .from("kids_guardians")
        .select("member_id")
        .eq("tenant_id", clientData.tenant.id)
        .in("child_id", childIds)
        .not("member_id", "is", null);

      if (guardiansResult.error) {
        setPushCandidatesStatus("error");
        setPushCandidatesMessage("Não foi possível carregar os responsáveis.");
        return;
      }

      const guardianMemberIds = Array.from(new Set((guardiansResult.data ?? []).map((row) => row.member_id).filter(Boolean)));
      if (guardianMemberIds.length === 0) {
        setPushCandidatesStatus("ready");
        setPushCandidatesMessage("Nenhum responsável vinculado a membro para enviar push.");
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("id, full_name, email, member_id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("status", "active")
        .in("member_id", guardianMemberIds);

      if (profileResult.error) {
        setPushCandidatesStatus("error");
        setPushCandidatesMessage("Não foi possível mapear responsáveis para usuários do sistema.");
        return;
      }

      const list = (profileResult.data ?? [])
        .map((row) => ({
          profile_id: row.id as string,
          label: String(row.full_name ?? row.email ?? "Responsável"),
          meta: row.email as string | undefined,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

      setPushCandidates(list);
      setPushCandidatesStatus("ready");
      return;
    }

    if (moduleCode === "bible-school" && mode === "bible_selected") {
      const enrollmentsResult = await supabase
        .from("bible_school_enrollments")
        .select("student_id, bible_school_students (member_id, name)")
        .eq("tenant_id", clientData.tenant.id)
        .eq("status", "active");

      if (enrollmentsResult.error) {
        setPushCandidatesStatus("error");
        setPushCandidatesMessage("Não foi possível carregar a lista de alunos matriculados.");
        return;
      }

      const memberIds = Array.from(new Set((enrollmentsResult.data ?? [])
        .map((row) => (row as unknown as { bible_school_students?: { member_id: string | null } | null }).bible_school_students?.member_id)
        .filter(Boolean)));

      if (memberIds.length === 0) {
        setPushCandidatesStatus("ready");
        setPushCandidatesMessage("Nenhum aluno vinculado a membro para enviar push.");
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("id, full_name, email, member_id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("status", "active")
        .in("member_id", memberIds);

      if (profileResult.error) {
        setPushCandidatesStatus("error");
        setPushCandidatesMessage("Não foi possível mapear alunos para usuários do sistema.");
        return;
      }

      const byMemberId = new Map((profileResult.data ?? []).map((row) => [row.member_id as string, row] as const));
      const enrollmentLabels = new Map<string, string>();
      (enrollmentsResult.data ?? []).forEach((row) => {
        const student = (row as unknown as { bible_school_students?: { member_id: string | null; name: string } | null }).bible_school_students;
        if (student?.member_id) enrollmentLabels.set(student.member_id, student.name);
      });

      const list = Array.from(byMemberId.values())
        .map((row) => ({
          profile_id: row.id as string,
          label: String(enrollmentLabels.get(String(row.member_id)) ?? row.full_name ?? row.email ?? "Aluno"),
          meta: row.email as string | undefined,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

      setPushCandidates(list);
      setPushCandidatesStatus("ready");
      return;
    }

    if (moduleCode === "bible-school" && mode === "bible_all") {
      setPushCandidatesStatus("ready");
      return;
    }

    setPushCandidatesStatus("ready");
  }

  async function openPushComposer(moduleCode: "worship" | "kids" | "bible-school") {
    const defaultMode: typeof pushComposerMode =
      moduleCode === "worship"
        ? "worship_ministry"
        : moduleCode === "kids"
        ? "kids_checked_in"
        : "bible_all";

    setPushComposerModule(moduleCode);
    setPushComposerMode(defaultMode);
    setPushTitle("");
    setPushBody("");
    setPushSendStatus("idle");
    setPushSendMessage("");
    setPushCandidatesStatus("idle");
    setPushCandidatesMessage("");
    setPushCandidates([]);
    setPushSelectedProfileIds([]);
    setPushRecipientSearch("");
    setPushKidsGroupId(kidsFilterGroupId || "");
    setPushKidsDate(kidsAttendanceDate);
    setPushComposerOpen(true);

    if (defaultMode === "kids_checked_in") {
      await loadPushCandidates(defaultMode, moduleCode);
    }
  }

  async function resolvePushProfileIds(mode: typeof pushComposerMode, moduleCode: typeof pushComposerModule): Promise<string[]> {
    if (!clientData) return [];

    const uniq = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

    if (mode === "worship_selected" || mode === "kids_selected" || mode === "bible_selected") {
      return uniq(pushSelectedProfileIds);
    }

    if (moduleCode === "worship" && mode === "worship_admins") {
      const moduleId = activeModuleIdByCode.worship;
      if (!moduleId) return [];

      const { data: rows, error } = await supabase
        .from("tenant_module_admins")
        .select("profile_id, member_id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("module_id", moduleId);
      if (error) return [];

      const direct = (rows ?? []).map((r) => r.profile_id).filter(Boolean) as string[];
      const memberIds = (rows ?? []).map((r) => r.member_id).filter(Boolean) as string[];

      if (memberIds.length === 0) return uniq(direct);

      const profileResult = await supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("status", "active")
        .in("member_id", memberIds);

      if (profileResult.error) return uniq(direct);

      const fromMembers = (profileResult.data ?? []).map((p) => p.id as string);
      return uniq([...direct, ...fromMembers]);
    }

    if (moduleCode === "worship" && mode === "worship_ministry") {
      const tenantMinistry = await supabase
        .from("catalog_ministries")
        .select("id")
        .eq("tenant_id", clientData.tenant.id)
        .ilike("name", "%louvor%")
        .limit(1)
        .maybeSingle<{ id: string }>();

      const systemMinistry = !tenantMinistry.data?.id
        ? await supabase
            .from("catalog_ministries")
            .select("id")
            .is("tenant_id", null)
            .ilike("name", "%louvor%")
            .limit(1)
            .maybeSingle<{ id: string }>()
        : null;

      const ministryId = tenantMinistry.data?.id ?? systemMinistry?.data?.id ?? null;
      if (!ministryId) return [];

      const mmResult = await supabase
        .from("member_ministries")
        .select("member_id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("ministry_id", ministryId);

      if (mmResult.error) return [];
      const memberIds = (mmResult.data ?? []).map((r) => r.member_id).filter(Boolean) as string[];
      if (memberIds.length === 0) return [];

      const profileResult = await supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("status", "active")
        .in("member_id", memberIds);

      if (profileResult.error) return [];
      return uniq((profileResult.data ?? []).map((p) => p.id as string));
    }

    if (moduleCode === "kids" && mode === "kids_checked_in") {
      const groupId = pushKidsGroupId || kidsFilterGroupId || "";
      if (!groupId) return [];
      const date = pushKidsDate || kidsAttendanceDate;

      const attendanceResult = await supabase
        .from("kids_attendance")
        .select("child_id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("attendance_date", date)
        .eq("group_id", groupId)
        .not("checked_in_at", "is", null);

      if (attendanceResult.error) return [];
      const childIds = uniq((attendanceResult.data ?? []).map((row) => row.child_id as string));
      if (childIds.length === 0) return [];

      const guardiansResult = await supabase
        .from("kids_guardians")
        .select("member_id")
        .eq("tenant_id", clientData.tenant.id)
        .in("child_id", childIds)
        .not("member_id", "is", null);

      if (guardiansResult.error) return [];
      const memberIds = uniq((guardiansResult.data ?? []).map((row) => row.member_id as string));
      if (memberIds.length === 0) return [];

      const profileResult = await supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("status", "active")
        .in("member_id", memberIds);

      if (profileResult.error) return [];
      return uniq((profileResult.data ?? []).map((row) => row.id as string));
    }

    if (moduleCode === "bible-school" && mode === "bible_all") {
      const enrollmentsResult = await supabase
        .from("bible_school_enrollments")
        .select("student_id, bible_school_students (member_id)")
        .eq("tenant_id", clientData.tenant.id)
        .eq("status", "active");

      if (enrollmentsResult.error) return [];

      const memberIds = uniq((enrollmentsResult.data ?? [])
        .map((row) => (row as unknown as { bible_school_students?: { member_id: string | null } | null }).bible_school_students?.member_id as string | null)
        .filter(Boolean) as string[]);

      if (memberIds.length === 0) return [];

      const profileResult = await supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", clientData.tenant.id)
        .eq("status", "active")
        .in("member_id", memberIds);

      if (profileResult.error) return [];
      return uniq((profileResult.data ?? []).map((row) => row.id as string));
    }

    return [];
  }

  async function handleSendPush() {
    if (!clientData) return;

    setPushSendStatus("loading");
    setPushSendMessage("");

    const title = pushTitle.trim();
    const messageBody = pushBody.trim();
    const route = pushRouteDefaults[pushComposerModule];

    if (!title || !messageBody) {
      setPushSendStatus("error");
      setPushSendMessage("Preencha título e mensagem.");
      return;
    }

    const profileIds = await resolvePushProfileIds(pushComposerMode, pushComposerModule);
    if (profileIds.length === 0) {
      setPushSendStatus("error");
      setPushSendMessage("Nenhum destinatário encontrado para enviar push.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          profile_ids: profileIds,
          title,
          body: messageBody,
          data: { route },
          module_code: pushComposerModule,
        },
      });

      if (error) {
        setPushSendStatus("error");
        if (error.message === "Failed to send a request to the Edge Function") {
          setPushSendMessage(
            "Não foi possível conectar ao serviço de push (Edge Function). Verifique se a função send-push já foi deployada no Supabase e se as variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY apontam para o projeto correto.",
          );
        } else {
          setPushSendMessage(error.message);
        }
        return;
      }

      const sent = (data as { sent?: number })?.sent ?? 0;
      const failed = (data as { failed?: number })?.failed ?? 0;
      const tokenCount = (data as { token_count?: number })?.token_count ?? 0;
      setPushSendStatus("success");
      if (tokenCount === 0) {
        setPushSendMessage(
          "Nenhum dispositivo com push habilitado foi encontrado para esses destinatários. Peça para os usuários abrirem o app no celular, aceitarem a permissão de notificações e fazerem login para registrar o token.",
        );
      } else {
        setPushSendMessage(`Push enviado: ${sent} token(s) com sucesso${failed ? `, ${failed} com falha` : ""}.`);
      }
    } catch (err) {
      setPushSendStatus("error");
      setPushSendMessage("Erro ao enviar push.");
    }
  }

  const visibleClientTabs = useMemo(() => {
    return clientTabs.filter((tab) => {
      if (tab.key === "families") return false;
      if (defaultClientTabs.has(tab.key)) {
        return isTenantAdmin;
      }

      if (tab.key === "reports") {
        return isTenantAdmin;
      }

      if (tenantAdminOnlyTabs.has(tab.key)) {
        return isTenantAdmin;
      }

      const moduleCode = clientTabModuleCode[tab.key];
      const isActiveModule = Boolean(moduleCode && activeModuleIdByCode[moduleCode]);

      if (tab.key === "members" && canManageMembers && isActiveModule) {
        return true;
      }

      if (!moduleCode || !isActiveModule) {
        return false;
      }

      return isTenantAdmin || canManageModuleCode(moduleCode);
    });
  }, [activeModuleIdByCode, canManageMembers, currentUserModuleAdminIds, isTenantAdmin]);

  const catalogRoleNameById = useMemo(() => {
    const items = clientData?.catalogRoles ?? [];
    return items.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [clientData?.catalogRoles]);

  const catalogMinistryNameById = useMemo(() => {
    const items = clientData?.catalogMinistries ?? [];
    return items.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [clientData?.catalogMinistries]);

  const memberSummaryById = useMemo(() => {
    if (!clientData) {
      return {};
    }

    const roles = clientData.memberRoleIdsByMemberId;
    const ministries = clientData.memberMinistriesByMemberId;

    return clientData.members.reduce<Record<string, string>>((acc, member) => {
      const roleNames = (roles[member.id] ?? [])
        .map((id) => catalogRoleNameById[id])
        .filter(Boolean);

      const ministryNames = (ministries[member.id] ?? []).map((item) =>
        item.is_admin ? `${item.name} (Admin)` : item.name,
      );

      const parts = [...ministryNames, ...roleNames].filter(Boolean);
      acc[member.id] = parts.length ? parts.join(" · ") : member.email ?? "Sem vínculos";
      return acc;
    }, {});
  }, [catalogRoleNameById, clientData, clientData?.members, clientData?.memberMinistriesByMemberId, clientData?.memberRoleIdsByMemberId]);

  const worshipAssignableMembers = useMemo(() => {
    if (!clientData) {
      return [];
    }

    return clientData.members.filter((member) => {
      const ministryNames = [
        member.ministry,
        ...(clientData.memberMinistriesByMemberId[member.id] ?? []).map((item) => item.name),
      ];
      const roleNames = (clientData.memberRoleIdsByMemberId[member.id] ?? [])
        .map((roleId) => catalogRoleNameById[roleId])
        .filter(Boolean);

      return [...ministryNames, ...roleNames].some((name) => isArtsScheduleAccessLabel(name));
    });
  }, [catalogRoleNameById, clientData, clientData?.members, clientData?.memberMinistriesByMemberId, clientData?.memberRoleIdsByMemberId]);

  const filteredMembers = useMemo(() => {
    if (!clientData) {
      return [];
    }

    const term = memberSearchTerm.trim().toLowerCase();
    return clientData.members.filter((member) => {
      const status = (member.status_v2 ?? member.status) as MemberFormState["status"];
      if (memberStatusFilter !== "all" && status !== memberStatusFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      return [member.name, member.email ?? "", member.phone ?? ""].join(" ").toLowerCase().includes(term);
    });
  }, [clientData, memberSearchTerm, memberStatusFilter]);

  const activeModules = clientData?.modules ?? [];
  const memberCount = clientData?.members.length ?? 0;
  const eventCount = clientData?.events.length ?? 0;
  const worshipEventCount = clientData?.worshipEvents.length ?? 0;
  const worshipAssignmentCount =
    clientData?.worshipEvents.reduce((total, item) => total + (clientData.worshipAssignmentsByEventId[item.id]?.length ?? 0), 0) ?? 0;
  const announcementCount = clientData?.announcements.length ?? 0;

  useEffect(() => {
    const tenant = clientData?.tenant;
    if (!tenant) {
      return;
    }

    const primary = normalizeHexColor(tenant.primary_color, "#087c7a");
    const accent = normalizeHexColor(tenant.accent_color, "#00a7c4");
    const primaryDark = darkenHex(primary, 0.32);
    const primaryDarker = darkenHex(primary, 0.48);
    const primarySoft = lightenHex(primary, 0.86);
    const primaryWash = lightenHex(primary, 0.94);
    const accentSoft = lightenHex(accent, 0.86);
    const accentWash = lightenHex(accent, 0.94);

    const headerBg = normalizeHexColor(tenant.header_color || primary, primary);
    const sidebarBg = normalizeHexColor(tenant.sidebar_color || primary, primaryDark);
    const footerBg = normalizeHexColor(tenant.footer_color || primary, primaryDark);

    const sidebarFg = pickReadableTextColor(sidebarBg);
    const headerFg = pickReadableTextColor(headerBg);
    const footerFg = pickReadableTextColor(footerBg);

    const primaryRgb = hexToRgbTuple(primary) ?? [8, 124, 122];
    const accentRgb = hexToRgbTuple(accent) ?? [0, 167, 196];

    const root = document.documentElement;
    root.style.setProperty("--color-brand-primary", primary);
    root.style.setProperty("--color-brand-primary-dark", primaryDark);
    root.style.setProperty("--color-brand-primary-soft", primarySoft);
    root.style.setProperty("--color-brand-accent", accent);
    root.style.setProperty("--color-brand-accent-soft", accentSoft);
    root.style.setProperty("--color-brand-primary-rgb", primaryRgb.join(", "));
    root.style.setProperty("--color-brand-accent-rgb", accentRgb.join(", "));
    root.style.setProperty("--tenant-page-bg", `linear-gradient(180deg, ${primaryWash}, ${accentWash} 42%, #f7faf9)`);
    root.style.setProperty("--tenant-card-border", `rgba(${primaryRgb.join(", ")}, 0.16)`);
    root.style.setProperty("--tenant-accent-border", `rgba(${accentRgb.join(", ")}, 0.36)`);
    root.style.setProperty("--tenant-accent-ring", `rgba(${accentRgb.join(", ")}, 0.18)`);
    root.style.setProperty("--tenant-primary-darker", primaryDarker);

    root.style.setProperty("--tenant-header-bg", headerBg);
    root.style.setProperty("--tenant-header-fg", headerFg);
    root.style.setProperty("--tenant-sidebar-bg", sidebarBg);
    root.style.setProperty("--tenant-sidebar-fg", sidebarFg);
    root.style.setProperty("--tenant-footer-bg", footerBg);
    root.style.setProperty("--tenant-footer-fg", footerFg);

    const isSidebarTextWhite = sidebarFg.toLowerCase() === "#ffffff";
    const sidebarLogoBg = isSidebarTextWhite ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.72)";
    root.style.setProperty("--tenant-sidebar-muted-fg", isSidebarTextWhite ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.72)");
    root.style.setProperty("--tenant-sidebar-hover-bg", isSidebarTextWhite ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");
    root.style.setProperty("--tenant-sidebar-hover-border", isSidebarTextWhite ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)");
    root.style.setProperty("--tenant-sidebar-divider", isSidebarTextWhite ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)");
    root.style.setProperty("--tenant-sidebar-logo-bg", sidebarLogoBg);
  }, [
    clientData?.tenant.id,
    clientData?.tenant.primary_color,
    clientData?.tenant.accent_color,
    clientData?.tenant.header_color,
    clientData?.tenant.sidebar_color,
    clientData?.tenant.footer_color,
  ]);

  useEffect(() => {
    const tenant = clientData?.tenant;
    if (!tenant) {
      setResolvedTenantLogoUrl(null);
      setThemeLogoPreviewUrl(null);
      return;
    }

    const rawLogo = tenant.logo_url?.trim() ?? "";
    if (!rawLogo) {
      setResolvedTenantLogoUrl(null);
      setThemeLogoPreviewUrl(null);
      return;
    }

    const publicLogoUrl = getTenantLogoPublicUrl(rawLogo, tenant.id);
    if (publicLogoUrl) {
      setResolvedTenantLogoUrl(publicLogoUrl);
      setThemeLogoPreviewUrl(publicLogoUrl);
      return;
    }

    const objectKey = getTenantLogoObjectKey(rawLogo) ?? `${tenant.id}/logo`;
    supabase.storage
      .from("tenant-logos")
      .createSignedUrl(objectKey, 60 * 60)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) {
          setResolvedTenantLogoUrl(null);
          setThemeLogoPreviewUrl(null);
          return;
        }
        setResolvedTenantLogoUrl(data.signedUrl);
        setThemeLogoPreviewUrl(data.signedUrl);
      });
  }, [clientData?.tenant.id, clientData?.tenant.logo_url]);

  useEffect(() => {
    if (demoMode) {
      setClientData(sampleClientDashboardData);
      setThemeForm({
        logo_url: sampleClientDashboardData.tenant.logo_url ?? "",
        primary_color: sampleClientDashboardData.tenant.primary_color,
        accent_color: sampleClientDashboardData.tenant.accent_color,
        header_color: sampleClientDashboardData.tenant.header_color,
        sidebar_color: sampleClientDashboardData.tenant.sidebar_color,
        footer_color: sampleClientDashboardData.tenant.footer_color,
      });
      setProfile(sampleClientDashboardData.profile);
      setDataStatus("ready");
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        return;
      }

      setMustChangePassword(Boolean((data.user.user_metadata as Record<string, unknown> | null)?.must_change_password));
      const currentProfile = await loadClientData(data.user.id);
      if (currentProfile) {
        setProfile(currentProfile);
      }
    });
  }, [demoMode]);

  useEffect(() => {
    if (!visibleClientTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleClientTabs[0]?.key ?? "overview");
    }
  }, [activeTab, visibleClientTabs]);

  useEffect(() => {
    setAvatarErrorUrl(null);
  }, [profile?.avatar_url]);

  useEffect(() => {
    return () => {
      stopKidsQrScanner();
    };
  }, []);

  // ── useEffect: recarrega políticas toda vez que a tab é aberta ──────────
  useEffect(() => {
    if (activeTab !== "policies" || demoMode || !profile?.tenant_id) return;
    void loadPolicies(profile.tenant_id);
  }, [activeTab, demoMode, profile?.tenant_id]);

  // ── useEffect: carrega dados de intercessão ao abrir a tab ───────────────
  useEffect(() => {
    if (activeTab !== "intercession" || demoMode || !profile?.tenant_id) return;
    void loadIntercessionData(profile.tenant_id);
  }, [activeTab, demoMode, profile?.tenant_id]);

  async function loadPolicies(tenantId: string) {
    const [policyResult, consentsResult, acceptancesResult] = await Promise.all([
      supabase
        .from("tenant_policies")
        .select("id, terms_text, privacy_text, version, published_at")
        .eq("tenant_id", tenantId)
        .maybeSingle<PolicyRecord>(),
      supabase
        .from("lgpd_consents")
        .select("id, user_id, consent_type, granted, consented_at, profiles(full_name, email)")
        .eq("tenant_id", tenantId)
        .order("consented_at", { ascending: false }),
      supabase
        .from("user_policy_acceptances")
        .select("id, user_id, policy_version, accepted_at, profiles(full_name, email)")
        .eq("tenant_id", tenantId)
        .order("accepted_at", { ascending: false }),
    ]);

    if (policyResult.data) {
      setPolicyRecord(policyResult.data);
      setPolicyForm({ terms_text: policyResult.data.terms_text, privacy_text: policyResult.data.privacy_text });
    } else {
      setPolicyRecord(null);
      setPolicyForm({ terms_text: "", privacy_text: "" });
    }

    setLgpdConsents((consentsResult.data ?? []) as unknown as LgpdConsentRecord[]);
    setPolicyAcceptances((acceptancesResult.data ?? []) as unknown as PolicyAcceptanceRecord[]);
  }

  async function loadIntercessionData(tenantId: string) {
    setIntercessionLoadStatus("loading");

    // Resolve ministry id for "Intercessão" (system or tenant-level)
    const { data: ministryRow } = await supabase
      .from("catalog_ministries")
      .select("id")
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .ilike("name", "Intercessão")
      .order("tenant_id", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    const [requestsResult, assignmentsResult] = await Promise.all([
      supabase
        .from("prayer_requests")
        .select("id, tenant_id, member_id, profile_id, is_anonymous, content, status, source, created_at, members(name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(200)
        .returns<PrayerRequestRecord[]>(),
      supabase
        .from("prayer_assignments")
        .select("id, tenant_id, prayer_request_id, assigned_member_id, assigned_profile_id, assigned_by_profile_id, assigned_at, status, started_at, completed_at, members!prayer_assignments_assigned_member_id_fkey(name)")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "interceding"])
        .returns<PrayerAssignmentRecord[]>(),
    ]);

    if (requestsResult.error || assignmentsResult.error) {
      setIntercessionLoadStatus("error");
      return;
    }

    setPrayerRequests(requestsResult.data ?? []);
    setPrayerAssignments(assignmentsResult.data ?? []);

    // Load intercessors (members of the Intercessão ministry)
    if (ministryRow?.id) {
      const { data: memberMinistries } = await supabase
        .from("member_ministries")
        .select("member_id, members(id, name, profiles(id))")
        .eq("tenant_id", tenantId)
        .eq("ministry_id", ministryRow.id)
        .returns<Array<{ member_id: string; members: { id: string; name: string; profiles: { id: string }[] } | null }>>();

      const intercessors: IntercessorMember[] = (memberMinistries ?? [])
        .filter((mm) => mm.members)
        .map((mm) => ({
          id: mm.members!.id,
          name: mm.members!.name,
          profile_id: Array.isArray(mm.members!.profiles) && mm.members!.profiles.length > 0
            ? mm.members!.profiles[0].id
            : null,
        }));
      setIntercessionMembers(intercessors);
    } else {
      setIntercessionMembers([]);
    }

    setIntercessionLoadStatus("loaded");
  }

  // Fisher-Yates shuffle
  function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function handleDistributeAll() {
    if (!profile?.tenant_id || intercessionMembers.length === 0) return;
    const newRequests = prayerRequests.filter((r) => r.status === "new");
    if (newRequests.length === 0) return;

    setDistributeStatus("loading");
    setDistributeMessage("");

    const shuffled = shuffleArray(intercessionMembers);
    const assignments = newRequests.map((req, i) => {
      const intercessor = shuffled[i % shuffled.length];
      return {
        tenant_id: profile.tenant_id!,
        prayer_request_id: req.id,
        assigned_member_id: intercessor.id,
        assigned_profile_id: intercessor.profile_id ?? null,
        assigned_by_profile_id: profile.id,
        status: "pending" as const,
      };
    });

    const { error: insertError } = await supabase.from("prayer_assignments").insert(assignments);
    if (insertError) {
      setDistributeStatus("error");
      setDistributeMessage("Erro ao distribuir pedidos. Tente novamente.");
      return;
    }

    const requestIds = newRequests.map((r) => r.id);
    const { error: updateError } = await supabase
      .from("prayer_requests")
      .update({ status: "assigned" })
      .in("id", requestIds)
      .eq("tenant_id", profile.tenant_id);

    if (updateError) {
      setDistributeStatus("error");
      setDistributeMessage("Pedidos atribuídos mas erro ao atualizar status.");
      return;
    }

    // Send push to each intercessor
    const profileIdsPush = assignments
      .map((a) => a.assigned_profile_id)
      .filter((id): id is string => Boolean(id));
    const uniquePushIds = Array.from(new Set(profileIdsPush));
    if (uniquePushIds.length > 0) {
      await supabase.functions.invoke("send-push", {
        body: {
          profile_ids: uniquePushIds,
          title: "Pedido de oração recebido",
          body: "Você recebeu um novo pedido de oração para interceder.",
          module_code: "intercession",
          data: { tab: "intercession" },
        },
      });
    }

    setDistributeStatus("success");
    setDistributeMessage(`${newRequests.length} pedido(s) distribuído(s) com sucesso.`);
    await loadIntercessionData(profile.tenant_id);
  }

  async function handleDirectAssign() {
    if (!profile?.tenant_id || !assignModalTarget || !assignSelectedMemberId) return;
    setAssignStatus("loading");
    setAssignMessage("");

    const intercessor = intercessionMembers.find((m) => m.id === assignSelectedMemberId);
    if (!intercessor) {
      setAssignStatus("error");
      setAssignMessage("Intercessor não encontrado.");
      return;
    }

    const { error: insertError } = await supabase.from("prayer_assignments").insert({
      tenant_id: profile.tenant_id,
      prayer_request_id: assignModalTarget.id,
      assigned_member_id: intercessor.id,
      assigned_profile_id: intercessor.profile_id ?? null,
      assigned_by_profile_id: profile.id,
      status: "pending",
    });

    if (insertError) {
      setAssignStatus("error");
      setAssignMessage("Erro ao atribuir pedido. Tente novamente.");
      return;
    }

    await supabase
      .from("prayer_requests")
      .update({ status: "assigned" })
      .eq("id", assignModalTarget.id);

    if (intercessor.profile_id) {
      await supabase.functions.invoke("send-push", {
        body: {
          profile_ids: [intercessor.profile_id],
          title: "Pedido de oração recebido",
          body: "Você recebeu um novo pedido de oração para interceder.",
          module_code: "intercession",
          data: { tab: "intercession" },
        },
      });
    }

    setAssignStatus("success");
    setAssignMessage("Pedido atribuído com sucesso.");
    await loadIntercessionData(profile.tenant_id);
    setTimeout(() => {
      setAssignModalTarget(null);
      setAssignSelectedMemberId("");
      setAssignStatus("idle");
      setAssignMessage("");
    }, 1200);
  }

  async function handleSavePolicy() {
    if (!profile?.tenant_id) return;
    setPolicyStatus("loading");
    setPolicyMessage("");

    if (policyRecord) {
      const { error } = await supabase
        .from("tenant_policies")
        .update({ terms_text: policyForm.terms_text, privacy_text: policyForm.privacy_text, updated_at: new Date().toISOString() })
        .eq("id", policyRecord.id);
      if (error) { setPolicyStatus("error"); setPolicyMessage("Erro ao salvar: " + error.message); return; }
      setPolicyRecord((r) => r ? { ...r, terms_text: policyForm.terms_text, privacy_text: policyForm.privacy_text } : r);
    } else {
      const { data, error } = await supabase
        .from("tenant_policies")
        .insert({ tenant_id: profile.tenant_id, terms_text: policyForm.terms_text, privacy_text: policyForm.privacy_text, version: 1 })
        .select("id, terms_text, privacy_text, version, published_at")
        .single<PolicyRecord>();
      if (error || !data) { setPolicyStatus("error"); setPolicyMessage("Erro ao criar: " + (error?.message ?? "")); return; }
      setPolicyRecord(data);
    }

    setPolicyStatus("success");
    setPolicyMessage("Rascunho salvo com sucesso.");
    setTimeout(() => { setPolicyStatus("idle"); setPolicyMessage(""); }, 3000);
  }

  async function handlePublishPolicy() {
    if (!profile?.tenant_id || !policyRecord) return;
    setPolicyStatus("loading");
    setPolicyMessage("");

    const newVersion = policyRecord.version + 1;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("tenant_policies")
      .update({ terms_text: policyForm.terms_text, privacy_text: policyForm.privacy_text, version: newVersion, published_at: now })
      .eq("id", policyRecord.id);

    if (error) { setPolicyStatus("error"); setPolicyMessage("Erro ao publicar: " + error.message); return; }
    setPolicyRecord((r) => r ? { ...r, terms_text: policyForm.terms_text, privacy_text: policyForm.privacy_text, version: newVersion, published_at: now } : r);
    setPolicyStatus("success");
    setPolicyMessage(`Versão ${newVersion} publicada. Membros precisarão aceitar novamente ao acessar o portal.`);
    setTimeout(() => { setPolicyStatus("idle"); setPolicyMessage(""); }, 5000);
  }

  async function handleForcePasswordChangeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoMode) {
      return;
    }

    setPasswordChangeStatus("loading");
    setPasswordChangeMessage("");

    const nextPassword = passwordDraft;
    if (!nextPassword || nextPassword.length < 8) {
      setPasswordChangeStatus("error");
      setPasswordChangeMessage("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (nextPassword !== passwordDraftConfirm) {
      setPasswordChangeStatus("error");
      setPasswordChangeMessage("As senhas não conferem.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: nextPassword,
      data: {
        must_change_password: false,
      },
    });

    if (error) {
      setPasswordChangeStatus("error");
      setPasswordChangeMessage("Não foi possível atualizar a senha. Tente novamente.");
      return;
    }

    setPasswordChangeStatus("success");
    setPasswordChangeMessage("Senha atualizada com sucesso.");
    setMustChangePassword(false);
    setPasswordDraft("");
    setPasswordDraftConfirm("");
  }

  async function loadTenantAuditLogs(tenantId: string) {
    if (demoMode) {
      setTenantAuditLogs([]);
      setTenantAuditStatus("ready");
      setTenantAuditMessage("");
      return;
    }

    setTenantAuditStatus("loading");
    setTenantAuditMessage("");

    const result = await supabase
      .from("audit_logs")
      .select("id, tenant_id, actor_user_id, action, entity_type, entity_id, metadata, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<TenantAuditLogRecord[]>();

    if (result.error) {
      setTenantAuditLogs([]);
      setTenantAuditStatus("error");
      setTenantAuditMessage("Não foi possível carregar auditoria.");
      return;
    }

    setTenantAuditLogs(result.data ?? []);
    setTenantAuditStatus("ready");
  }

  function isUuidLike(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  function shortId(value: string, head = 8, tail = 4) {
    if (value.length <= head + tail + 1) return value;
    return `${value.slice(0, head)}…${value.slice(-tail)}`;
  }

  function formatRelativeTimePtBR(iso: string) {
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return "";
    const diffMs = Date.now() - ts;
    const absMs = Math.abs(diffMs);
    const future = diffMs < 0;

    const mins = Math.round(absMs / 60000);
    const hours = Math.round(absMs / 3600000);
    const days = Math.round(absMs / 86400000);

    if (mins < 1) return future ? "em instantes" : "agora";
    if (mins < 60) return future ? `em ${mins} min` : `há ${mins} min`;
    if (hours < 24) return future ? `em ${hours} h` : `há ${hours} h`;
    return future ? `em ${days} d` : `há ${days} d`;
  }

  function splitAuditAction(action: string) {
    const parts = action.split(" · ").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return { area: parts[0], verb: parts.slice(1).join(" · ") };
    }
    return { area: null as string | null, verb: action.trim() };
  }

  function tenantStatusLabel(status: unknown) {
    const v = typeof status === "string" ? status : "";
    if (v === "active") return "Ativo";
    if (v === "suspended") return "Suspenso";
    if (v === "configuring") return "Em configuração";
    return v || "—";
  }

  function normalizeAuditAction(action: string) {
    const clean = action.trim();
    if (!clean) return "";
    if (clean.startsWith("Tenant ·")) return clean.replace(/^Tenant ·/i, "Cliente ·");
    return clean;
  }

  function resolveAuditActorLabel(actorUserId: string | null) {
    if (!actorUserId) return "Sistema";
    const user = clientData?.users.find((u) => u.id === actorUserId) ?? null;
    const display = user?.full_name?.trim() || user?.email?.trim() || "";
    if (display) return display;
    return "Admin do sistema";
  }

  function humanizeAuditEntityType(entityType: string) {
    const clean = entityType.trim();
    if (clean.toLowerCase() === "cliente módulos") return "Módulos do cliente";
    return clean;
  }

  function resolveAuditEntityLabel(log: TenantAuditLogRecord) {
    const entityType = humanizeAuditEntityType(log.entity_type);
    const entityId = log.entity_id?.trim() || null;
    const meta = log.metadata ?? {};
    const metaName = typeof meta.name === "string" ? meta.name.trim() : "";
    const metaTenant = typeof meta.tenant === "string" ? meta.tenant.trim() : "";

    if (!clientData) {
      if (!entityId || isUuidLike(entityId)) return entityType;
      return `${entityType}: ${entityId}`;
    }

    if (entityType === "Cliente" || entityType === "Módulos do cliente") {
      const tenantName = metaTenant || metaName || clientData.tenant.name;
      return tenantName ? `Cliente: ${tenantName}` : entityType;
    }

    if (entityId) {
      const member = clientData.members.find((m) => m.id === entityId) ?? null;
      if (member) return `Membro: ${member.name}`;

      const family = clientData.families.find((f) => f.id === entityId) ?? null;
      if (family) return `Família: ${family.name}`;

      const event = clientData.events.find((e) => e.id === entityId) ?? null;
      if (event) return `Evento: ${event.title}`;

      const announcement = clientData.announcements.find((a) => a.id === entityId) ?? null;
      if (announcement) return `Comunicado: ${announcement.title}`;

      const child = clientData.kidsChildren.find((c) => c.id === entityId) ?? null;
      if (child) return `Kids: ${child.name}`;

      const group = clientData.kidsGroups.find((g) => g.id === entityId) ?? null;
      if (group) return `Grupo Kids: ${group.name}`;

      const tx = clientData.financialTransactions.find((t) => t.id === entityId) ?? null;
      if (tx) return `Financeiro: ${tx.description}`;

      if (!isUuidLike(entityId)) return `${entityType}: ${entityId}`;
    }

    return entityType;
  }

  function formatTenantAuditLogUi(log: TenantAuditLogRecord) {
    const action = normalizeAuditAction(log.action);
    const { area, verb } = splitAuditAction(action);
    const meta = log.metadata ?? {};

    const metaName = typeof meta.name === "string" ? meta.name.trim() : "";
    const metaTitle = typeof meta.title === "string" ? meta.title.trim() : "";
    const metaTenant = typeof meta.tenant === "string" ? meta.tenant.trim() : "";
    const metaFrom = (meta as { from?: unknown }).from;
    const metaTo = (meta as { to?: unknown }).to;
    const metaActiveModulesRaw = meta.active_modules;
    const metaActiveModules =
      typeof metaActiveModulesRaw === "number"
        ? metaActiveModulesRaw
        : typeof metaActiveModulesRaw === "string"
        ? Number(metaActiveModulesRaw)
        : null;

    const areaLower = (area ?? "").trim().toLowerCase();

    let title = verb;
    if (areaLower === "cliente" && /^criado$/i.test(verb)) {
      title = metaName ? `Cliente criado: ${metaName}` : "Cliente criado";
    } else if (areaLower === "cliente" && /^atualizado$/i.test(verb)) {
      title = metaName ? `Cliente atualizado: ${metaName}` : "Cliente atualizado";
    } else if (areaLower === "cliente" && /^status alterado$/i.test(verb)) {
      const fromLabel = tenantStatusLabel(metaFrom);
      const toLabel = tenantStatusLabel(metaTo);
      title = metaFrom && metaTo ? `Status do cliente alterado: ${fromLabel} → ${toLabel}` : "Status do cliente alterado";
    } else if (areaLower === "cliente" && /módulos atualizados/i.test(verb) && metaActiveModules !== null && Number.isFinite(metaActiveModules)) {
      title = `Módulos atualizados (${metaActiveModules} ativos)`;
    } else if (/material \(arquivo\) enviado/i.test(verb)) {
      title = metaTitle ? `Material enviado: ${metaTitle}` : "Material enviado";
    } else if (metaName) {
      title = `${verb}: ${metaName}`;
    } else if (metaTitle) {
      title = `${verb}: ${metaTitle}`;
    }

    const subtitleParts: string[] = [];
    const entityLabel = resolveAuditEntityLabel(log);
    const showArea = area && areaLower !== "cliente" && !title.toLowerCase().startsWith(`${areaLower} `);
    if (showArea) subtitleParts.push(area);

    const resolvedTenantLabel = metaTenant || (areaLower === "cliente" ? metaName : "");
    if (resolvedTenantLabel) subtitleParts.push(`Cliente: ${resolvedTenantLabel}`);

    const hideEntityLabel =
      (/módulos atualizados/i.test(verb) && entityLabel === "Cliente: " + (metaTenant || metaName || clientData?.tenant.name || "")) ||
      (/módulos atualizados/i.test(verb) && entityLabel === "Módulos do cliente") ||
      (entityLabel.startsWith("Cliente:") && Boolean(resolvedTenantLabel));

    if (entityLabel && entityLabel !== area && !hideEntityLabel) subtitleParts.push(entityLabel);
    subtitleParts.push(`por ${resolveAuditActorLabel(log.actor_user_id)}`);

    return {
      title,
      subtitle: subtitleParts.join(" · "),
      whenLabel: formatRelativeTimePtBR(log.created_at),
      whenTitle: new Date(log.created_at).toLocaleString("pt-BR"),
    };
  }

  async function recordTenantAuditLog(payload: {
    tenant_id: string;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (demoMode) return;
    await supabase.rpc("audit_log", {
      tenant_id: payload.tenant_id,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id ?? null,
      metadata: payload.metadata ?? {},
    });
  }

  async function loadClientData(userId: string) {
    setDataStatus("loading");
    setLoginMessage("");

    const profileResult = await supabase
      .from("profiles")
      .select("id, full_name, email, tenant_id, tenant_role, member_id, status, avatar_url")
      .eq("id", userId)
      .single<TenantProfile>();

    if (profileResult.error || !profileResult.data) {
      setDataStatus("error");
      setLoginMessage("Não foi possível carregar seu perfil.");
      return null;
    }

    let currentProfile = profileResult.data;
    if (!currentProfile.tenant_id || currentProfile.status !== "active") {
      setDataStatus("error");
      setLoginMessage("Este usuário não está autorizado como cliente ou está inativo.");
      return null;
    }

    if (!currentProfile.member_id) {
      await supabase.rpc("ensure_current_profile_member");
      const refreshedProfileResult = await supabase
        .from("profiles")
        .select("id, full_name, email, tenant_id, tenant_role, member_id, status, avatar_url")
        .eq("id", userId)
        .single<TenantProfile>();

      if (!refreshedProfileResult.error && refreshedProfileResult.data) {
        currentProfile = refreshedProfileResult.data;
      }
    }

    const tenantId = currentProfile.tenant_id!;

    const [
      tenantResult,
      membersResult,
      memberRolesResult,
      memberMinistriesResult,
      familiesResult,
      familyMembersResult,
      eventsResult,
      announcementsResult,
      worshipRolesResult,
      worshipEventsResult,
      worshipAssignmentsResult,
      usersResult,
      modulesResult,
      moduleAdminsResult,
      catalogRolesResult,
      catalogMinistriesResult,
      financialCategoriesResult,
      financialTransactionsResult,
      kidsGroupsResult,
      kidsChildrenResult,
      kidsGuardiansResult,
      kidsTeacherScheduleResult,
      kidsAttendanceResult,
      kidsActivitiesResult,
      kidsCommunicationsResult,
      allPlatformModulesResult,
      socialMediaChannelsResult,
    ] = await Promise.all([
        supabase
          .from("tenants")
          .select(
            "id, name, slug, logo_url, primary_color, accent_color, header_color, sidebar_color, footer_color",
          )
          .eq("id", tenantId)
          .single<TenantRecord>(),
        supabase
          .from("members")
          .select(
            "id, name, email, phone, status, status_v2, date_of_birth, document_number, address_line1, address_city, address_state, address_postal_code, ministry, notes, created_at",
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .returns<MemberRecord[]>(),
        supabase
          .from("member_roles")
          .select("tenant_id, member_id, role_id, catalog_roles (name)")
          .eq("tenant_id", tenantId)
          .returns<MemberRoleRecord[]>(),
        supabase
          .from("member_ministries")
          .select("tenant_id, member_id, ministry_id, is_admin, catalog_ministries (name)")
          .eq("tenant_id", tenantId)
          .returns<MemberMinistryRecord[]>(),
        supabase
          .from("families")
          .select("id, tenant_id, name, notes, created_at, updated_at")
          .eq("tenant_id", tenantId)
          .order("name", { ascending: true })
          .returns<FamilyRecord[]>(),
        supabase
          .from("family_members")
          .select("id, tenant_id, family_id, member_id, name, date_of_birth, relationship, is_primary, members (name, email, date_of_birth)")
          .eq("tenant_id", tenantId)
          .returns<FamilyMemberRecord[]>(),
        supabase
          .from("tenant_events")
          .select("id, title, description, description_html, location, event_date, ends_at, event_type, color, status, cover_image_url, created_at")
          .eq("tenant_id", tenantId)
          .order("event_date", { ascending: true })
          .returns<EventRecord[]>(),
        supabase
          .from("tenant_announcements")
          .select("id, title, message, message_html, published_at, expires_at, created_at")
          .eq("tenant_id", tenantId)
          .order("published_at", { ascending: false })
          .returns<AnnouncementRecord[]>(),
        supabase
          .from("worship_roles")
          .select("id, tenant_id, name, role_type, sort_order, is_active")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .returns<WorshipRoleRecord[]>(),
        supabase
          .from("worship_events")
          .select("id, tenant_id, title, event_type, starts_at, ends_at, location, notes, status, created_at")
          .eq("tenant_id", tenantId)
          .order("starts_at", { ascending: true })
          .returns<WorshipEventRecord[]>(),
        supabase
          .from("worship_assignments")
          .select("id, tenant_id, event_id, member_id, role_id, role_name, arrival_at, status, decline_reason, notes, members (name, email, phone), worship_roles (name)")
          .eq("tenant_id", tenantId)
          .returns<WorshipAssignmentRecord[]>(),
        supabase
          .from("profiles")
          .select("id, full_name, email, tenant_role, status")
          .eq("tenant_id", tenantId)
          .returns<TenantUserRecord[]>(),
        supabase
          .from("tenant_modules")
          .select("status, platform_modules (id, code, name, description, status)")
          .eq("tenant_id", tenantId)
          .eq("status", "active"),
        supabase
          .from("tenant_module_admins")
          .select("module_id, profile_id, member_id")
          .eq("tenant_id", tenantId)
          .returns<ModuleAdminAccessRecord[]>(),
        supabase
          .from("catalog_roles")
          .select("id, tenant_id, name")
          .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
          .order("name", { ascending: true })
          .returns<CatalogItemRecord[]>(),
        supabase
          .from("catalog_ministries")
          .select("id, tenant_id, name")
          .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
          .order("name", { ascending: true })
          .returns<CatalogItemRecord[]>(),
        supabase
          .from("financial_categories")
          .select("id, tenant_id, name, type, color, is_system, sort_order")
          .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
          .order("sort_order", { ascending: true })
          .returns<FinancialCategoryRecord[]>(),
        supabase
          .from("financial_transactions")
          .select("id, tenant_id, type, amount, description, date, payment_method, category_id, member_id, notes, created_at, financial_categories (name, color), members (name)")
          .eq("tenant_id", tenantId)
          .order("date", { ascending: false })
          .limit(300)
          .returns<FinancialTransactionRecord[]>(),
        supabase
          .from("kids_groups")
          .select("id, tenant_id, name, description, age_min, age_max, color, is_active, sort_order, created_at")
          .eq("tenant_id", tenantId)
          .order("sort_order", { ascending: true })
          .returns<KidsGroupRecord[]>(),
        supabase
          .from("kids_children")
          .select("id, tenant_id, name, date_of_birth, group_id, member_id, allergies, special_needs, notes, is_active, created_at, kids_groups (name)")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("name", { ascending: true })
          .returns<KidsChildRecord[]>(),
        supabase
          .from("kids_guardians")
          .select("id, tenant_id, child_id, name, phone, relationship, member_id, is_primary, created_at, kids_children (name)")
          .eq("tenant_id", tenantId)
          .returns<KidsGuardianRecord[]>(),
        supabase
          .from("kids_teacher_schedule")
          .select("id, tenant_id, schedule_date, group_id, member_id, role_label, notes, created_at, members (name, phone), kids_groups (name)")
          .eq("tenant_id", tenantId)
          .order("schedule_date", { ascending: false })
          .limit(100)
          .returns<KidsTeacherScheduleRecord[]>(),
        supabase
          .from("kids_attendance")
          .select("id, tenant_id, child_id, group_id, attendance_date, checked_in_at, checked_out_at, guardian_name, notes, created_at, kids_children (name), kids_groups (name)")
          .eq("tenant_id", tenantId)
          .order("attendance_date", { ascending: false })
          .limit(200)
          .returns<KidsAttendanceRecord[]>(),
        supabase
          .from("kids_activities")
          .select("id, tenant_id, group_id, title, description, activity_date, created_at, kids_groups (name)")
          .eq("tenant_id", tenantId)
          .order("activity_date", { ascending: false })
          .limit(100)
          .returns<KidsActivityRecord[]>(),
        supabase
          .from("kids_communications")
          .select("id, tenant_id, child_id, title, message, sent_via, sent_at, created_at, kids_children (name)")
          .eq("tenant_id", tenantId)
          .order("sent_at", { ascending: false })
          .limit(100)
          .returns<KidsCommunicationRecord[]>(),
        supabase
          .from("platform_modules")
          .select("id, code, name, description, status")
          .eq("status", "active")
          .order("sort_order", { ascending: true })
          .returns<TenantModuleRecord[]>(),
        supabase
          .from("social_media_channels")
          .select("id, tenant_id, name, platform, channel_type, channel_id, channel_url, description, is_active, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true })
          .returns<SocialMediaChannelRecord[]>(),
      ]);

    if (
      tenantResult.error ||
      membersResult.error ||
      memberRolesResult.error ||
      memberMinistriesResult.error ||
      familiesResult.error ||
      familyMembersResult.error ||
      announcementsResult.error ||
      worshipRolesResult.error ||
      worshipEventsResult.error ||
      worshipAssignmentsResult.error ||
      usersResult.error ||
      modulesResult.error ||
      moduleAdminsResult.error ||
      catalogRolesResult.error ||
      catalogMinistriesResult.error ||
      financialCategoriesResult.error ||
      financialTransactionsResult.error ||
      kidsGroupsResult.error ||
      kidsChildrenResult.error ||
      kidsGuardiansResult.error ||
      kidsTeacherScheduleResult.error ||
      kidsAttendanceResult.error ||
      kidsActivitiesResult.error ||
      kidsCommunicationsResult.error ||
      allPlatformModulesResult.error ||
      socialMediaChannelsResult.error
    ) {
      setDataStatus("error");
      setLoginMessage("Erro ao carregar dados do tenant.");
      return null;
    }

    const modules = (modulesResult.data ?? [])
      .flatMap((item) => {
        const embedded = (item as { platform_modules?: unknown }).platform_modules;
        if (!embedded) {
          return [];
        }
        return Array.isArray(embedded) ? (embedded as TenantModuleRecord[]) : ([embedded] as TenantModuleRecord[]);
      })
      .filter((module): module is TenantModuleRecord => Boolean(module?.id && module?.code));

    const memberRoleIdsByMemberId = (memberRolesResult.data ?? []).reduce<Record<string, string[]>>(
      (acc, row) => {
        if (!acc[row.member_id]) {
          acc[row.member_id] = [];
        }
        acc[row.member_id].push(row.role_id);
        return acc;
      },
      {},
    );

    const memberMinistriesByMemberId = (memberMinistriesResult.data ?? []).reduce<
      Record<string, Array<{ ministry_id: string; name: string; is_admin: boolean }>>
    >((acc, row) => {
      if (!acc[row.member_id]) {
        acc[row.member_id] = [];
      }
      acc[row.member_id].push({
        ministry_id: row.ministry_id,
        name: row.catalog_ministries?.name ?? "Ministério",
        is_admin: row.is_admin,
      });
      return acc;
    }, {});

    const familyMembersByFamilyId = (familyMembersResult.data ?? []).reduce<
      Record<string, Array<{ id: string; member_id: string | null; name: string; date_of_birth: string | null; relationship: string; is_primary: boolean }>>
    >((acc, row) => {
      if (!acc[row.family_id]) {
        acc[row.family_id] = [];
      }
      acc[row.family_id].push({
        id: row.id,
        member_id: row.member_id,
        name: row.name || row.members?.name || "Dependente",
        date_of_birth: row.date_of_birth ?? row.members?.date_of_birth ?? null,
        relationship: row.relationship,
        is_primary: row.is_primary,
      });
      return acc;
    }, {});

    const moduleAdminModuleIdsByProfileId = (moduleAdminsResult.data ?? []).reduce<Record<string, string[]>>(
      (acc, row) => {
        if (!row.profile_id) {
          return acc;
        }
        acc[row.profile_id] = [...(acc[row.profile_id] ?? []), row.module_id];
        return acc;
      },
      {},
    );

    const moduleAdminModuleIdsByMemberId = (moduleAdminsResult.data ?? []).reduce<Record<string, string[]>>(
      (acc, row) => {
        if (!row.member_id) {
          return acc;
        }
        acc[row.member_id] = [...(acc[row.member_id] ?? []), row.module_id];
        return acc;
      },
      {},
    );

    const worshipAssignmentsByEventId = (worshipAssignmentsResult.data ?? []).reduce<
      Record<string, WorshipAssignmentRecord[]>
    >((acc, row) => {
      acc[row.event_id] = [...(acc[row.event_id] ?? []), row];
      return acc;
    }, {});

    const kidsGuardiansByChildId = (kidsGuardiansResult.data ?? []).reduce<Record<string, KidsGuardianRecord[]>>(
      (acc, row) => {
        if (!acc[row.child_id]) acc[row.child_id] = [];
        acc[row.child_id].push(row);
        return acc;
      },
      {},
    );

    setClientData({
      profile: currentProfile,
      tenant: tenantResult.data,
      members: membersResult.data ?? [],
      memberRoleIdsByMemberId,
      memberMinistriesByMemberId,
      families: familiesResult.data ?? [],
      familyMembersByFamilyId,
      events: eventsResult.data ?? [],
      announcements: announcementsResult.data ?? [],
      worshipRoles: worshipRolesResult.data ?? [],
      worshipEvents: worshipEventsResult.data ?? [],
      worshipAssignmentsByEventId,
      users: usersResult.data ?? [],
      modules,
      moduleAdminModuleIdsByProfileId,
      moduleAdminModuleIdsByMemberId,
      catalogRoles: catalogRolesResult.data ?? [],
      catalogMinistries: catalogMinistriesResult.data ?? [],
      financialCategories: financialCategoriesResult.data ?? [],
      financialTransactions: financialTransactionsResult.data ?? [],
      kidsGroups: kidsGroupsResult.data ?? [],
      kidsChildren: kidsChildrenResult.data ?? [],
      kidsGuardiansByChildId,
      kidsTeacherSchedule: kidsTeacherScheduleResult.data ?? [],
      kidsAttendance: kidsAttendanceResult.data ?? [],
      kidsActivities: kidsActivitiesResult.data ?? [],
      kidsCommunications: kidsCommunicationsResult.data ?? [],
      allPlatformModules: allPlatformModulesResult.data ?? [],
      socialMediaChannels: socialMediaChannelsResult.data ?? [],
    });

    setThemeForm({
      logo_url: tenantResult.data.logo_url ?? "",
      primary_color: tenantResult.data.primary_color,
      accent_color: tenantResult.data.accent_color,
      header_color: tenantResult.data.header_color,
      sidebar_color: tenantResult.data.sidebar_color,
      footer_color: tenantResult.data.footer_color,
    });

    void loadTenantAuditLogs(tenantId);

    if (modules.some((item) => item.code === "bible-school")) {
      void loadBibleSchoolData(tenantId);
    } else {
      setBibleSchoolStatus("idle");
      setBibleSchoolMessage("");
      setBibleSchoolClasses([]);
      setSelectedBibleSchoolClassId(null);
      setBibleSchoolTeachers([]);
      setBibleSchoolClassTeachers([]);
      setBibleSchoolEnrollments([]);
      setBibleSchoolStudents([]);
      setBibleSchoolSessions([]);
      setSelectedBibleSchoolSessionId(null);
      setBibleSchoolAttendance([]);
      setBibleSchoolMaterials([]);
      setBibleSchoolGrades([]);
    }

    setDataStatus("ready");
    return currentProfile;
  }

  async function loadBibleSchoolData(tenantId: string) {
    setBibleSchoolStatus("loading");
    setBibleSchoolMessage("");

    if (demoMode) {
      const now = new Date().toISOString();
      const demoClasses: BibleSchoolClassRecord[] = [
        {
          id: "bible-class-1",
          tenant_id: tenantId,
          name: "Classe de Discipulado",
          description: "Fundamentos da fé e vida cristã.",
          starts_at: new Date().toISOString().slice(0, 10),
          ends_at: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ];
      setBibleSchoolClasses(demoClasses);
      setSelectedBibleSchoolClassId(demoClasses[0]?.id ?? null);
      setBibleSchoolTeachers([]);
      setBibleSchoolClassTeachers([]);
      setBibleSchoolStatus("ready");
      return;
    }

    const [classesResult, teachersResult, classTeachersResult] = await Promise.all([
      supabase
        .from("bible_school_classes")
        .select("id, tenant_id, name, description, starts_at, ends_at, is_active, created_at, updated_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .returns<BibleSchoolClassRecord[]>(),
      supabase
        .from("bible_school_teachers")
        .select("id, tenant_id, member_id, role, members (name, email, phone)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .returns<BibleSchoolTeacherRecord[]>(),
      supabase
        .from("bible_school_class_teachers")
        .select(
          "id, tenant_id, class_id, teacher_id, bible_school_teachers (id, tenant_id, member_id, role, members (name, email, phone))",
        )
        .eq("tenant_id", tenantId)
        .returns<BibleSchoolClassTeacherRecord[]>(),
    ]);

    if (classesResult.error || teachersResult.error || classTeachersResult.error) {
      setBibleSchoolStatus("error");
      setBibleSchoolMessage("Não foi possível carregar os dados da Escola Bíblica.");
      setBibleSchoolClasses([]);
      setBibleSchoolTeachers([]);
      setBibleSchoolClassTeachers([]);
      return;
    }

    setBibleSchoolClasses(classesResult.data ?? []);
    setBibleSchoolTeachers(teachersResult.data ?? []);
    setBibleSchoolClassTeachers(classTeachersResult.data ?? []);
    setBibleSchoolStatus("ready");

    if (!selectedBibleSchoolClassId && (classesResult.data ?? []).length) {
      setSelectedBibleSchoolClassId((classesResult.data ?? [])[0]!.id);
    }
  }

  async function loadBibleSchoolClassDetails(tenantId: string, classId: string) {
    setBibleSchoolMessage("");

    if (demoMode) {
      setBibleSchoolEnrollments([]);
      setBibleSchoolStudents([]);
      setBibleSchoolSessions([]);
      setSelectedBibleSchoolSessionId(null);
      setBibleSchoolAttendance([]);
      setBibleSchoolMaterials([]);
      setBibleSchoolGrades([]);
      return;
    }

    const [enrollmentsResult, sessionsResult, materialsResult] = await Promise.all([
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
        .from("bible_school_sessions")
        .select("id, tenant_id, class_id, session_date, topic, notes, created_at")
        .eq("tenant_id", tenantId)
        .eq("class_id", classId)
        .order("session_date", { ascending: false })
        .returns<BibleSchoolSessionRecord[]>(),
      supabase
        .from("bible_school_materials")
        .select("id, tenant_id, class_id, title, kind, url, content, created_at")
        .eq("tenant_id", tenantId)
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .returns<BibleSchoolMaterialRecord[]>(),
    ]);

    if (enrollmentsResult.error || sessionsResult.error || materialsResult.error) {
      setBibleSchoolMessage("Não foi possível carregar turmas/matrículas da Escola Bíblica.");
      setBibleSchoolEnrollments([]);
      setBibleSchoolSessions([]);
      setBibleSchoolMaterials([]);
      return;
    }

    setBibleSchoolEnrollments(enrollmentsResult.data ?? []);
    setBibleSchoolSessions(sessionsResult.data ?? []);
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

    const activeSessionId =
      selectedBibleSchoolSessionId && (sessionsResult.data ?? []).some((s) => s.id === selectedBibleSchoolSessionId)
        ? selectedBibleSchoolSessionId
        : (sessionsResult.data ?? [])[0]?.id ?? null;
    setSelectedBibleSchoolSessionId(activeSessionId);

    if (!activeSessionId) {
      setBibleSchoolAttendance([]);
      return;
    }

    const attendanceResult = await supabase
      .from("bible_school_attendance")
      .select("id, tenant_id, session_id, enrollment_id, status, notes, created_at")
      .eq("tenant_id", tenantId)
      .eq("session_id", activeSessionId)
      .returns<BibleSchoolAttendanceRecord[]>();

    if (attendanceResult.error) {
      setBibleSchoolAttendance([]);
      return;
    }

    setBibleSchoolAttendance(attendanceResult.data ?? []);
  }

  useEffect(() => {
    if (!clientData?.tenant.id || !selectedBibleSchoolClassId) {
      return;
    }
    void loadBibleSchoolClassDetails(clientData.tenant.id, selectedBibleSchoolClassId);
  }, [clientData?.tenant.id, selectedBibleSchoolClassId]);

  function openBibleSchoolCreateClassForm() {
    if (!clientData || !canManageBibleSchool) {
      return;
    }
    setBibleSchoolClassForm(emptyBibleSchoolClassForm);
    setIsBibleSchoolClassFormOpen(true);
  }

  function openBibleSchoolEditClassForm(item: BibleSchoolClassRecord) {
    if (!clientData || !canManageBibleSchool) {
      return;
    }

    const teacherMemberIds = bibleSchoolClassTeachers
      .filter((row) => row.class_id === item.id)
      .map((row) => row.bible_school_teachers?.member_id)
      .filter((value): value is string => Boolean(value));

    setBibleSchoolClassForm({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      starts_at: item.starts_at ?? "",
      ends_at: item.ends_at ?? "",
      is_active: item.is_active,
      teacherMemberIds,
    });
    setIsBibleSchoolClassFormOpen(true);
  }

  async function handleBibleSchoolClassSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !canManageBibleSchool) {
      return;
    }

    const tenantId = clientData.tenant.id;
    const payload = {
      tenant_id: tenantId,
      name: bibleSchoolClassForm.name.trim(),
      description: bibleSchoolClassForm.description.trim() || null,
      starts_at: bibleSchoolClassForm.starts_at || null,
      ends_at: bibleSchoolClassForm.ends_at || null,
      is_active: bibleSchoolClassForm.is_active,
    };

    if (!payload.name) {
      setBibleSchoolMessage("Informe o nome da turma.");
      return;
    }

    setBibleSchoolStatus("loading");

    const classResult = bibleSchoolClassForm.id
      ? await supabase.from("bible_school_classes").update(payload).eq("id", bibleSchoolClassForm.id).select("id").single()
      : await supabase.from("bible_school_classes").insert(payload).select("id").single();

    if (classResult.error || !classResult.data?.id) {
      setBibleSchoolStatus("error");
      setBibleSchoolMessage("Não foi possível salvar a turma.");
      return;
    }

    const classId = classResult.data.id as string;

    const existingTeacherByMemberId = (bibleSchoolTeachers ?? []).reduce<Record<string, BibleSchoolTeacherRecord>>(
      (acc, teacher) => {
        acc[teacher.member_id] = teacher;
        return acc;
      },
      {},
    );

    const desiredMemberIds = Array.from(new Set(bibleSchoolClassForm.teacherMemberIds.filter(Boolean)));
    const teacherIds: string[] = [];

    for (const memberId of desiredMemberIds) {
      const existing = existingTeacherByMemberId[memberId];
      if (existing) {
        teacherIds.push(existing.id);
        continue;
      }

      const insertTeacher = await supabase
        .from("bible_school_teachers")
        .insert({ tenant_id: tenantId, member_id: memberId, role: "teacher" })
        .select("id, tenant_id, member_id, role, members (name, email, phone)")
        .single<BibleSchoolTeacherRecord>();

      if (!insertTeacher.error && insertTeacher.data) {
        teacherIds.push(insertTeacher.data.id);
      }
    }

    await supabase.from("bible_school_class_teachers").delete().eq("tenant_id", tenantId).eq("class_id", classId);

    if (teacherIds.length) {
      await supabase.from("bible_school_class_teachers").insert(
        teacherIds.map((teacherId) => ({
          tenant_id: tenantId,
          class_id: classId,
          teacher_id: teacherId,
        })),
      );
    }

    setIsBibleSchoolClassFormOpen(false);
    setBibleSchoolClassForm(emptyBibleSchoolClassForm);
    setBibleSchoolStatus("ready");
    await recordTenantAuditLog({
      tenant_id: tenantId,
      action: bibleSchoolClassForm.id ? "Escola Bíblica · Turma atualizada" : "Escola Bíblica · Turma criada",
      entity_type: "Escola Bíblica",
      entity_id: classId,
      metadata: { name: payload.name, is_active: payload.is_active },
    });
    await loadBibleSchoolData(tenantId);
    setSelectedBibleSchoolClassId(classId);
  }

  function openBibleSchoolStudentForm() {
    if (!clientData || !canManageBibleSchool || !selectedBibleSchoolClassId) {
      return;
    }
    setBibleSchoolStudentForm(emptyBibleSchoolStudentForm);
    setIsBibleSchoolStudentFormOpen(true);
  }

  async function handleBibleSchoolStudentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !canManageBibleSchool || !selectedBibleSchoolClassId) {
      return;
    }

    const tenantId = clientData.tenant.id;
    const memberId = bibleSchoolStudentForm.member_id.trim() || null;

    let resolvedName = bibleSchoolStudentForm.name.trim();
    let resolvedEmail = bibleSchoolStudentForm.email.trim() || null;
    let resolvedPhone = bibleSchoolStudentForm.phone.trim() || null;

    if (memberId) {
      const member = clientData.members.find((m) => m.id === memberId) ?? null;
      if (member) {
        resolvedName = member.name;
        resolvedEmail = member.email ?? resolvedEmail;
        resolvedPhone = member.phone ?? resolvedPhone;
      }
    }

    if (!resolvedName) {
      setBibleSchoolMessage("Informe o nome do aluno.");
      return;
    }

    setBibleSchoolStatus("loading");

    const existingStudent = memberId
      ? await supabase
          .from("bible_school_students")
          .select("id, tenant_id, member_id, name, email, phone, notes, created_at")
          .eq("tenant_id", tenantId)
          .eq("member_id", memberId)
          .maybeSingle<BibleSchoolStudentRecord>()
      : { data: null, error: null };

    if ((existingStudent as { error: unknown }).error) {
      setBibleSchoolStatus("error");
      setBibleSchoolMessage("Não foi possível validar o aluno.");
      return;
    }

    const studentId =
      (existingStudent as { data: BibleSchoolStudentRecord | null }).data?.id ??
      (
        await supabase
          .from("bible_school_students")
          .insert({
            tenant_id: tenantId,
            member_id: memberId,
            name: resolvedName,
            email: resolvedEmail,
            phone: resolvedPhone,
            notes: bibleSchoolStudentForm.notes.trim() || null,
          })
          .select("id")
          .single<{ id: string }>()
      ).data?.id ??
      null;

    if (!studentId) {
      setBibleSchoolStatus("error");
      setBibleSchoolMessage("Não foi possível salvar o aluno.");
      return;
    }

    const enrollmentResult = await supabase
      .from("bible_school_enrollments")
      .insert({ tenant_id: tenantId, class_id: selectedBibleSchoolClassId, student_id: studentId, status: "active" })
      .select("id")
      .single<{ id: string }>();

    if (enrollmentResult.error) {
      setBibleSchoolStatus("error");
      setBibleSchoolMessage("Aluno salvo, mas não foi possível matricular na turma.");
      return;
    }

    setIsBibleSchoolStudentFormOpen(false);
    setBibleSchoolStudentForm(emptyBibleSchoolStudentForm);
    setBibleSchoolStatus("ready");
    await recordTenantAuditLog({
      tenant_id: tenantId,
      action: "Escola Bíblica · Matrícula criada",
      entity_type: "Escola Bíblica",
      entity_id: enrollmentResult.data.id,
      metadata: { class_id: selectedBibleSchoolClassId, student_id: studentId },
    });
    await loadBibleSchoolClassDetails(tenantId, selectedBibleSchoolClassId);
  }

  function openBibleSchoolSessionForm() {
    if (!clientData || !selectedBibleSchoolClassId) {
      return;
    }
    if (!canManageBibleSchool) {
      setBibleSchoolMessage("Sem permissão para criar aulas.");
      return;
    }
    setBibleSchoolSessionForm(emptyBibleSchoolSessionForm);
    setIsBibleSchoolSessionFormOpen(true);
  }

  async function handleBibleSchoolSessionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !selectedBibleSchoolClassId || !canManageBibleSchool) {
      return;
    }

    const tenantId = clientData.tenant.id;
    const payload = {
      tenant_id: tenantId,
      class_id: selectedBibleSchoolClassId,
      session_date: bibleSchoolSessionForm.session_date,
      topic: bibleSchoolSessionForm.topic.trim() || null,
      notes: bibleSchoolSessionForm.notes.trim() || null,
    };

    if (!payload.session_date) {
      setBibleSchoolMessage("Informe a data da aula.");
      return;
    }

    setBibleSchoolStatus("loading");

    const result = bibleSchoolSessionForm.id
      ? await supabase.from("bible_school_sessions").update(payload).eq("id", bibleSchoolSessionForm.id)
      : await supabase.from("bible_school_sessions").insert(payload);

    if (result.error) {
      setBibleSchoolStatus("error");
      setBibleSchoolMessage("Não foi possível salvar a aula.");
      return;
    }

    setIsBibleSchoolSessionFormOpen(false);
    setBibleSchoolSessionForm(emptyBibleSchoolSessionForm);
    setBibleSchoolStatus("ready");
    await recordTenantAuditLog({
      tenant_id: tenantId,
      action: bibleSchoolSessionForm.id ? "Escola Bíblica · Aula atualizada" : "Escola Bíblica · Aula criada",
      entity_type: "Escola Bíblica",
      entity_id: bibleSchoolSessionForm.id,
      metadata: { class_id: selectedBibleSchoolClassId, session_date: payload.session_date, topic: payload.topic },
    });
    await loadBibleSchoolClassDetails(tenantId, selectedBibleSchoolClassId);
  }

  async function upsertBibleSchoolAttendance(enrollmentId: string, nextStatus: BibleSchoolAttendanceRecord["status"]) {
    if (!clientData?.tenant.id || !selectedBibleSchoolSessionId || !selectedBibleSchoolClassId) {
      return;
    }

    if (!canManageBibleSchool) {
      setBibleSchoolMessage("Sem permissão para registrar presença.");
      return;
    }

    const tenantId = clientData.tenant.id;
    const existing = bibleSchoolAttendance.find((row) => row.enrollment_id === enrollmentId) ?? null;

    setBibleSchoolStatus("loading");

    const payload = {
      tenant_id: tenantId,
      session_id: selectedBibleSchoolSessionId,
      enrollment_id: enrollmentId,
      status: nextStatus,
      notes: null,
    };

    const result = existing
      ? await supabase.from("bible_school_attendance").update(payload).eq("id", existing.id)
      : await supabase.from("bible_school_attendance").insert(payload);

    if (result.error) {
      setBibleSchoolStatus("error");
      setBibleSchoolMessage("Não foi possível registrar presença.");
      return;
    }

    setBibleSchoolStatus("ready");
    await recordTenantAuditLog({
      tenant_id: tenantId,
      action: "Escola Bíblica · Presença registrada",
      entity_type: "Escola Bíblica",
      entity_id: existing?.id ?? null,
      metadata: { session_id: selectedBibleSchoolSessionId, enrollment_id: enrollmentId, status: nextStatus },
    });
    await loadBibleSchoolClassDetails(tenantId, selectedBibleSchoolClassId);
  }

  function openBibleSchoolMaterialForm() {
    if (!clientData || !selectedBibleSchoolClassId) {
      return;
    }
    if (!canManageBibleSchool) {
      setBibleSchoolMessage("Sem permissão para cadastrar materiais.");
      return;
    }
    setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
    setIsBibleSchoolMaterialFormOpen(true);
  }

  async function handleBibleSchoolMaterialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !selectedBibleSchoolClassId || !canManageBibleSchool) {
      return;
    }

    const tenantId = clientData.tenant.id;
    const title = bibleSchoolMaterialForm.title.trim();
    const kind = bibleSchoolMaterialForm.kind;
    const rawUrl = bibleSchoolMaterialForm.url.trim();
    const rawContent = bibleSchoolMaterialForm.content.trim();

    if (!title) {
      setBibleSchoolMessage("Informe um título para o material.");
      return;
    }

    if (kind === "link" && !rawUrl) {
      setBibleSchoolMessage("Informe a URL do material.");
      return;
    }

    setBibleSchoolStatus("loading");

    if (kind === "file") {
      const file = bibleSchoolMaterialForm.file;
      if (!file) {
        setBibleSchoolStatus("error");
        setBibleSchoolMessage("Selecione um arquivo para upload.");
        return;
      }

      const materialId = crypto.randomUUID();
      const safeName = (file.name || "arquivo").replace(/[^\w.-]+/g, "-");
      const objectKey = `${tenantId}/${selectedBibleSchoolClassId}/${materialId}/${Date.now()}-${safeName}`;

      const uploadResult = await supabase.storage.from("bible-school-materials").upload(objectKey, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

      if (uploadResult.error) {
        setBibleSchoolStatus("error");
        setBibleSchoolMessage("Não foi possível fazer upload do arquivo.");
        return;
      }

      const insertResult = await supabase.from("bible_school_materials").insert({
        id: materialId,
        tenant_id: tenantId,
        class_id: selectedBibleSchoolClassId,
        title,
        kind,
        url: objectKey,
        content: null,
      });

      if (insertResult.error) {
        setBibleSchoolStatus("error");
        setBibleSchoolMessage("Arquivo enviado, mas não foi possível salvar o material.");
        return;
      }

      setIsBibleSchoolMaterialFormOpen(false);
      setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
      setBibleSchoolStatus("ready");
      await recordTenantAuditLog({
        tenant_id: tenantId,
        action: "Escola Bíblica · Material (arquivo) enviado",
        entity_type: "Escola Bíblica",
        entity_id: materialId,
        metadata: { class_id: selectedBibleSchoolClassId, title, object_key: objectKey },
      });
      await loadBibleSchoolClassDetails(tenantId, selectedBibleSchoolClassId);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      class_id: selectedBibleSchoolClassId,
      title,
      kind,
      url: kind === "link" ? rawUrl || null : null,
      content: kind === "text" ? rawContent || null : null,
    };

    const result = bibleSchoolMaterialForm.id
      ? await supabase.from("bible_school_materials").update(payload).eq("id", bibleSchoolMaterialForm.id)
      : await supabase.from("bible_school_materials").insert(payload);

    if (result.error) {
      setBibleSchoolStatus("error");
      setBibleSchoolMessage("Não foi possível salvar o material.");
      return;
    }

    setIsBibleSchoolMaterialFormOpen(false);
    setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
    setBibleSchoolStatus("ready");
    await recordTenantAuditLog({
      tenant_id: tenantId,
      action: bibleSchoolMaterialForm.id ? "Escola Bíblica · Material atualizado" : "Escola Bíblica · Material criado",
      entity_type: "Escola Bíblica",
      entity_id: bibleSchoolMaterialForm.id,
      metadata: { class_id: selectedBibleSchoolClassId, title: payload.title, kind: payload.kind },
    });
    await loadBibleSchoolClassDetails(tenantId, selectedBibleSchoolClassId);
  }

  function openBibleSchoolGradeForm() {
    if (!clientData || !selectedBibleSchoolClassId || !canManageBibleSchool) {
      return;
    }
    const firstEnrollment = bibleSchoolEnrollments[0]?.id ?? "";
    setBibleSchoolGradeForm({ ...emptyBibleSchoolGradeForm, enrollment_id: firstEnrollment });
    setIsBibleSchoolGradeFormOpen(true);
  }

  async function handleBibleSchoolGradeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !selectedBibleSchoolClassId || !canManageBibleSchool) {
      return;
    }

    const tenantId = clientData.tenant.id;
    const enrollmentId = bibleSchoolGradeForm.enrollment_id;
    const title = bibleSchoolGradeForm.title.trim();

    if (!enrollmentId) {
      setBibleSchoolMessage("Selecione uma matrícula.");
      return;
    }

    if (!title) {
      setBibleSchoolMessage("Informe um título para a nota.");
      return;
    }

    const scoreRaw = bibleSchoolGradeForm.score.trim();
    const maxScoreRaw = bibleSchoolGradeForm.max_score.trim();
    const score = scoreRaw ? Number(scoreRaw.replace(",", ".")) : null;
    const maxScore = maxScoreRaw ? Number(maxScoreRaw.replace(",", ".")) : null;

    if (scoreRaw && Number.isNaN(score as number)) {
      setBibleSchoolMessage("Informe um valor de nota válido.");
      return;
    }

    if (maxScoreRaw && Number.isNaN(maxScore as number)) {
      setBibleSchoolMessage("Informe um valor de nota máxima válido.");
      return;
    }

    setBibleSchoolStatus("loading");

    const result = await supabase.from("bible_school_grades").insert({
      tenant_id: tenantId,
      enrollment_id: enrollmentId,
      title,
      score,
      max_score: maxScore,
      notes: bibleSchoolGradeForm.notes.trim() || null,
    });

    if (result.error) {
      setBibleSchoolStatus("error");
      setBibleSchoolMessage("Não foi possível salvar a nota.");
      return;
    }

    setIsBibleSchoolGradeFormOpen(false);
    setBibleSchoolGradeForm(emptyBibleSchoolGradeForm);
    setBibleSchoolStatus("ready");
    await recordTenantAuditLog({
      tenant_id: tenantId,
      action: "Escola Bíblica · Nota lançada",
      entity_type: "Escola Bíblica",
      entity_id: null,
      metadata: { enrollment_id: enrollmentId, title, score, max_score: maxScore },
    });
    await loadBibleSchoolClassDetails(tenantId, selectedBibleSchoolClassId);
  }

  async function openBibleSchoolMaterial(mat: BibleSchoolMaterialRecord) {
    if (!clientData?.tenant.id) {
      return;
    }

    if (mat.kind === "link" && mat.url) {
      window.open(mat.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (mat.kind === "file" && mat.url) {
      const signed = await supabase.storage.from("bible-school-materials").createSignedUrl(mat.url, 60);
      const signedUrl = signed.data?.signedUrl ?? null;
      if (signed.error || !signedUrl) {
        setBibleSchoolStatus("error");
        setBibleSchoolMessage("Não foi possível gerar link de download.");
        return;
      }
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  function handleCatalogEditChange(itemId: string, value: string) {
    setCatalogEdits((current) => ({ ...current, [itemId]: value }));
  }

  async function handleAddCatalogItem(kind: "roles" | "ministries") {
    if (!clientData || !profile || !isTenantAdmin) {
      return;
    }

    const tenantId = clientData.tenant.id;
    const draft = kind === "roles" ? catalogRoleDraft : catalogMinistryDraft;
    const name = draft.trim();

    if (name.length < 2) {
      setCatalogSaveStatus("error");
      setCatalogSaveMessage("Informe um nome válido.");
      return;
    }

    setCatalogSaveStatus("loading");
    setCatalogSaveMessage("");

    if (demoMode) {
      const newItem: CatalogItemRecord = {
        id: `${kind}-${Date.now()}`,
        tenant_id: tenantId,
        name,
      };

      setClientData((current) => {
        if (!current) return current;
        if (kind === "roles") {
          return { ...current, catalogRoles: [...current.catalogRoles, newItem].sort((a, b) => a.name.localeCompare(b.name)) };
        }
        return {
          ...current,
          catalogMinistries: [...current.catalogMinistries, newItem].sort((a, b) => a.name.localeCompare(b.name)),
        };
      });

      if (kind === "roles") {
        setCatalogRoleDraft("");
      } else {
        setCatalogMinistryDraft("");
      }

      setCatalogSaveStatus("success");
      setCatalogSaveMessage("Item adicionado ao seu tenant.");
      return;
    }

    const table = kind === "roles" ? "catalog_roles" : "catalog_ministries";
    const { error } = await supabase.from(table).insert({ tenant_id: tenantId, name });

    if (error) {
      setCatalogSaveStatus("error");
      setCatalogSaveMessage("Não foi possível adicionar o item.");
      return;
    }

    if (kind === "roles") {
      setCatalogRoleDraft("");
    } else {
      setCatalogMinistryDraft("");
    }

    setCatalogSaveStatus("success");
    setCatalogSaveMessage("Item adicionado ao seu tenant.");
    await loadClientData(profile.id);
  }

  async function handleSaveCatalogItem(kind: "roles" | "ministries", item: CatalogItemRecord) {
    if (!clientData || !profile || !isTenantAdmin) {
      return;
    }

    if (!item.tenant_id) {
      return;
    }

    const tenantId = clientData.tenant.id;
    if (item.tenant_id !== tenantId) {
      return;
    }

    const name = String(catalogEdits[item.id] ?? item.name).trim();
    if (name.length < 2) {
      setCatalogSaveStatus("error");
      setCatalogSaveMessage("Informe um nome válido.");
      return;
    }

    setCatalogSaveStatus("loading");
    setCatalogSaveMessage("");

    if (demoMode) {
      setClientData((current) => {
        if (!current) return current;
        if (kind === "roles") {
          return {
            ...current,
            catalogRoles: current.catalogRoles
              .map((row) => (row.id === item.id ? { ...row, name } : row))
              .sort((a, b) => a.name.localeCompare(b.name)),
          };
        }
        return {
          ...current,
          catalogMinistries: current.catalogMinistries
            .map((row) => (row.id === item.id ? { ...row, name } : row))
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      });

      setCatalogSaveStatus("success");
      setCatalogSaveMessage("Item atualizado.");
      return;
    }

    const table = kind === "roles" ? "catalog_roles" : "catalog_ministries";
    const { error } = await supabase.from(table).update({ name }).eq("id", item.id);

    if (error) {
      setCatalogSaveStatus("error");
      setCatalogSaveMessage("Não foi possível atualizar o item.");
      return;
    }

    setCatalogSaveStatus("success");
    setCatalogSaveMessage("Item atualizado.");
    await loadClientData(profile.id);
  }

  async function handleClientLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginStatus("loading");
    setLoginMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setLoginStatus("error");
      setLoginMessage("Falha no login. Verifique e-mail e senha.");
      return;
    }

    const currentProfile = await loadClientData(data.user.id);
    if (currentProfile) {
      setProfile(currentProfile);
      setLoginStatus("success");
    } else {
      setLoginStatus("error");
    }
  }

  async function handleSignOut() {
    if (demoMode) {
      window.location.assign("/");
      return;
    }

    await supabase.auth.signOut();
    setClientData(null);
    setProfile(null);
    setAvatarErrorUrl(null);
    setLoginStatus("idle");
    setDataStatus("idle");
  }

  function openCreateMemberForm() {
    if (!canManageMembers) {
      return;
    }

    setMemberForm({ ...emptyMemberForm, tenant_id: clientData?.tenant.id ?? "" });
    setCepLookupStatus("idle");
    setCepError(null);
    setDocError(null);
    setMemberSaveStatus("idle");
    setMemberSaveMessage("");
    setMemberHistory([]);
    setMemberHistoryStatus("idle");
    setMemberHistoryDraftType("");
    setMemberHistoryDraftNotes("");
    setMinistryPickerId("");
    setMemberDependentPickerId("");
    setMemberDependentRelationship("child");
    setMemberDependentName("");
    setMemberDependentDob("");
    setIsMemberFormOpen(true);
  }

  function openEditMemberForm(member: MemberRecord) {
    if (!canManageMembers) {
      return;
    }

    setCepLookupStatus("idle");
    setCepError(null);
    setDocError(null);
    const memberId = member.id;
    const roleIds = clientData?.memberRoleIdsByMemberId[memberId] ?? [];
    const ministries =
      clientData?.memberMinistriesByMemberId[memberId]?.map((item) => ({
        ministry_id: item.ministry_id,
        is_admin: item.is_admin,
      })) ?? [];

    setMemberForm({
      id: member.id,
      tenant_id: clientData?.tenant.id ?? "",
      name: member.name,
      email: member.email ?? "",
      phone: member.phone ?? "",
      status: (member.status_v2 ?? member.status) as MemberFormState["status"],
      date_of_birth: member.date_of_birth ?? "",
      document_number: member.document_number ?? "",
      address_line1: member.address_line1 ?? "",
      address_city: member.address_city ?? "",
      address_state: member.address_state ?? "",
      address_postal_code: member.address_postal_code ?? "",
      notes: member.notes ?? "",
      roleIds,
      ministries,
      moduleAdminModuleIds: clientData?.moduleAdminModuleIdsByMemberId[memberId] ?? [],
    });
    setMemberSaveStatus("idle");
    setMemberSaveMessage("");
    setMemberHistory([]);
    setMemberHistoryStatus("idle");
    setMemberHistoryDraftType("");
    setMemberHistoryDraftNotes("");
    setMinistryPickerId("");
    setMemberDependentPickerId("");
    setMemberDependentRelationship("child");
    setMemberDependentName("");
    setMemberDependentDob("");
    setIsMemberFormOpen(true);
    void loadMemberHistory(member.id);
  }

  function updateMemberForm(field: keyof MemberFormState, value: string) {
    setMemberForm((current) => ({ ...current, [field]: value }));
  }

  function toggleMemberRole(roleId: string) {
    setMemberForm((current) => {
      const exists = current.roleIds.includes(roleId);
      return {
        ...current,
        roleIds: exists ? current.roleIds.filter((id) => id !== roleId) : [...current.roleIds, roleId],
      };
    });
  }

  function toggleMemberModuleAdmin(moduleId: string) {
    setMemberForm((current) => {
      const exists = current.moduleAdminModuleIds.includes(moduleId);
      return {
        ...current,
        moduleAdminModuleIds: exists
          ? current.moduleAdminModuleIds.filter((id) => id !== moduleId)
          : [...current.moduleAdminModuleIds, moduleId],
      };
    });
  }

  function addMemberMinistry(ministryId: string) {
    if (!ministryId) return;
    setMemberForm((current) => {
      if (current.ministries.some((item) => item.ministry_id === ministryId)) {
        return current;
      }
      return { ...current, ministries: [...current.ministries, { ministry_id: ministryId, is_admin: false }] };
    });
    setMinistryPickerId("");
  }

  function removeMemberMinistry(ministryId: string) {
    setMemberForm((current) => ({
      ...current,
      ministries: current.ministries.filter((item) => item.ministry_id !== ministryId),
    }));
  }

  function setMemberMinistryAdmin(ministryId: string, isAdmin: boolean) {
    setMemberForm((current) => ({
      ...current,
      ministries: current.ministries.map((item) =>
        item.ministry_id === ministryId ? { ...item, is_admin: isAdmin } : item,
      ),
    }));
  }

  async function loadMemberHistory(memberId: string) {
    if (!clientData || !memberId) {
      return;
    }

    if (demoMode) {
      setMemberHistory([]);
      setMemberHistoryStatus("ready");
      return;
    }

    setMemberHistoryStatus("loading");
    const { data, error } = await supabase
      .from("member_history")
      .select("id, tenant_id, member_id, event_type, notes, occurred_at")
      .eq("tenant_id", clientData.tenant.id)
      .eq("member_id", memberId)
      .order("occurred_at", { ascending: false })
      .limit(20)
      .returns<MemberHistoryRecord[]>();

    if (error) {
      setMemberHistoryStatus("error");
      return;
    }

    setMemberHistory(data ?? []);
    setMemberHistoryStatus("ready");
  }

  async function handleAddMemberHistory() {
    if (!clientData || !profile || !canManageMembers || !memberForm.id) {
      return;
    }

    const eventType = memberHistoryDraftType.trim();
    if (eventType.length < 3) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Informe um tipo de histórico válido.");
      return;
    }

    if (demoMode) {
      const now = new Date().toISOString();
      setMemberHistory((current) => [
        {
          id: `history-${Date.now()}`,
          tenant_id: clientData.tenant.id,
          member_id: memberForm.id,
          event_type: eventType,
          notes: memberHistoryDraftNotes.trim() || null,
          occurred_at: now,
        },
        ...current,
      ]);
      setMemberHistoryDraftType("");
      setMemberHistoryDraftNotes("");
      return;
    }

    const { error } = await supabase.from("member_history").insert({
      tenant_id: clientData.tenant.id,
      member_id: memberForm.id,
      event_type: eventType,
      notes: memberHistoryDraftNotes.trim() || null,
    });

    if (error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Não foi possível salvar o histórico.");
      return;
    }

    setMemberHistoryDraftType("");
    setMemberHistoryDraftNotes("");
    await loadMemberHistory(memberForm.id);
  }

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMemberSaveStatus("loading");
    setMemberSaveMessage("");

    if (!memberForm.name.trim()) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Informe o nome do membro.");
      return;
    }

    if (!clientData) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Dados do cliente não carregados.");
      return;
    }

    const payload = {
      id: memberForm.id || undefined,
      tenant_id: clientData.tenant.id,
      name: memberForm.name.trim(),
      email: memberForm.email.trim() || null,
      phone: memberForm.phone.trim() || null,
      status: memberForm.status,
      status_v2: memberForm.status,
      date_of_birth: memberForm.date_of_birth || null,
      document_number: memberForm.document_number.trim() || null,
      address_line1: memberForm.address_line1.trim() || null,
      address_city: memberForm.address_city.trim() || null,
      address_state: memberForm.address_state.trim() || null,
      address_postal_code: memberForm.address_postal_code.trim() || null,
      notes: memberForm.notes.trim() || null,
    };

    if (demoMode) {
      const now = new Date().toISOString();
      const memberId = memberForm.id || `member-${Date.now()}`;
      const memberRow: MemberRecord = {
        id: memberId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        status: payload.status,
        status_v2: payload.status_v2,
        date_of_birth: payload.date_of_birth,
        document_number: payload.document_number,
        address_line1: payload.address_line1,
        address_city: payload.address_city,
        address_state: payload.address_state,
        address_postal_code: payload.address_postal_code,
        ministry: null,
        notes: payload.notes,
        created_at: now,
      };

      setClientData((current) => {
        if (!current) return current;
        const nextMembers = memberForm.id
          ? current.members.map((row) => (row.id === memberId ? { ...row, ...memberRow } : row))
          : [memberRow, ...current.members];
        return {
          ...current,
          members: nextMembers,
          memberRoleIdsByMemberId: { ...current.memberRoleIdsByMemberId, [memberId]: [...memberForm.roleIds] },
          memberMinistriesByMemberId: {
            ...current.memberMinistriesByMemberId,
            [memberId]: memberForm.ministries.map((item) => ({
              ministry_id: item.ministry_id,
              name:
                current.catalogMinistries.find((m) => m.id === item.ministry_id)?.name ??
                "Ministério",
              is_admin: item.is_admin,
            })),
          },
          moduleAdminModuleIdsByMemberId: {
            ...current.moduleAdminModuleIdsByMemberId,
            [memberId]: [...memberForm.moduleAdminModuleIds],
          },
        };
      });

      setMemberSaveStatus("success");
      setMemberSaveMessage(memberForm.id ? "Membro atualizado." : "Membro criado.");
      setIsMemberFormOpen(false);
      setMemberForm({ ...emptyMemberForm, tenant_id: clientData.tenant.id });
      return;
    }

    const memberResult = memberForm.id
      ? await supabase.from("members").update(payload).eq("id", memberForm.id).select("id").single<{ id: string }>()
      : await supabase.from("members").insert(payload).select("id").single<{ id: string }>();

    if (memberResult.error || !memberResult.data) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Não foi possível salvar o membro.");
      return;
    }

    const memberId = memberResult.data.id;

    const [deleteRolesResult, deleteMinistriesResult, deleteModuleAdminsResult] = await Promise.all([
      supabase.from("member_roles").delete().eq("member_id", memberId),
      supabase.from("member_ministries").delete().eq("member_id", memberId),
      supabase.from("tenant_module_admins").delete().eq("tenant_id", clientData.tenant.id).eq("member_id", memberId),
    ]);

    if (deleteRolesResult.error || deleteMinistriesResult.error || deleteModuleAdminsResult.error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Membro salvo, mas não foi possível atualizar cargos, ministérios ou módulos.");
      return;
    }

    const roleRows = memberForm.roleIds.map((roleId) => ({
      tenant_id: clientData.tenant.id,
      member_id: memberId,
      role_id: roleId,
    }));

    const ministryRows = memberForm.ministries.map((item) => ({
      tenant_id: clientData.tenant.id,
      member_id: memberId,
      ministry_id: item.ministry_id,
      is_admin: item.is_admin,
    }));

    const moduleAdminRows = memberForm.moduleAdminModuleIds.map((moduleId) => ({
      tenant_id: clientData.tenant.id,
      member_id: memberId,
      module_id: moduleId,
    }));

    const [insertRolesResult, insertMinistriesResult, insertModuleAdminsResult] = await Promise.all([
      roleRows.length ? supabase.from("member_roles").insert(roleRows) : Promise.resolve({ error: null }),
      ministryRows.length ? supabase.from("member_ministries").insert(ministryRows) : Promise.resolve({ error: null }),
      moduleAdminRows.length
        ? supabase.from("tenant_module_admins").insert(moduleAdminRows)
        : Promise.resolve({ error: null }),
    ]);

    if ("error" in insertRolesResult && insertRolesResult.error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Membro salvo, mas não foi possível vincular cargos.");
      return;
    }

    if ("error" in insertMinistriesResult && insertMinistriesResult.error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Membro salvo, mas não foi possível vincular ministérios.");
      return;
    }

    if ("error" in insertModuleAdminsResult && insertModuleAdminsResult.error) {
      setMemberSaveStatus("error");
      setMemberSaveMessage("Membro salvo, mas não foi possível liberar módulos administrativos.");
      return;
    }

    setMemberSaveStatus("success");
    setMemberSaveMessage(memberForm.id ? "Membro atualizado." : "Membro criado.");
    setIsMemberFormOpen(false);
    setMemberForm({ ...emptyMemberForm, tenant_id: clientData.tenant.id });
    if (profile) {
      await loadClientData(profile.id);
    }
  }

  async function handleDeleteMember(memberId: string) {
    if (!memberId || !profile || !canManageMembers) {
      return;
    }

    const { error } = await supabase.from("members").delete().eq("id", memberId);
    if (!error) {
      await loadClientData(profile.id);
    }
  }

  function openCreateFamilyForm() {
    if (!canManageMembers) {
      return;
    }

    setFamilyForm({ ...emptyFamilyForm, tenant_id: clientData?.tenant.id ?? "" });
    setFamilySaveStatus("idle");
    setFamilySaveMessage("");
    setFamilyMemberPickerId("");
    setFamilyMemberRelationship("other");
    setFamilyMemberPrimary(false);
    setIsFamilyFormOpen(true);
  }

  function openEditFamilyForm(family: FamilyRecord) {
    if (!canManageMembers || !clientData) {
      return;
    }

    const members = clientData.familyMembersByFamilyId[family.id] ?? [];
    setFamilyForm({
      id: family.id,
      tenant_id: clientData.tenant.id,
      name: family.name,
      notes: family.notes ?? "",
      members: members.map((item) => ({
        id: item.id,
        member_id: item.member_id,
        name: item.name,
        date_of_birth: item.date_of_birth ?? "",
        relationship: item.relationship,
        is_primary: item.is_primary,
      })),
    });
    setFamilySaveStatus("idle");
    setFamilySaveMessage("");
    setFamilyMemberPickerId("");
    setFamilyMemberRelationship("other");
    setFamilyMemberPrimary(false);
    setIsFamilyFormOpen(true);
  }

  function addFamilyMemberToForm() {
    if (!familyMemberPickerId) {
      return;
    }

    setFamilyForm((current) => {
      if (current.members.some((item) => item.member_id === familyMemberPickerId)) {
        return current;
      }

      const member = clientData?.members.find((row) => row.id === familyMemberPickerId) ?? null;
      const nextMember = {
        id: `ffm-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        member_id: familyMemberPickerId,
        name: member?.name ?? "",
        date_of_birth: member?.date_of_birth ?? "",
        relationship: familyMemberRelationship,
        is_primary: familyMemberPrimary,
      };

      const nextMembers = familyMemberPrimary
        ? current.members.map((item) => ({ ...item, is_primary: false })).concat(nextMember)
        : current.members.concat(nextMember);

      return { ...current, members: nextMembers };
    });

    setFamilyMemberPickerId("");
    setFamilyMemberRelationship("other");
    setFamilyMemberPrimary(false);
  }

  function addFamilyDependentToForm() {
    setFamilyForm((current) => ({
      ...current,
      members: current.members.concat({
        id: `ffm-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        member_id: null,
        name: "",
        date_of_birth: "",
        relationship: "child",
        is_primary: false,
      }),
    }));
  }

  function updateFamilyMember(rowId: string, next: Partial<{ relationship: string; is_primary: boolean; name: string; date_of_birth: string; member_id: string | null }>) {
    setFamilyForm((current) => {
      const nextMembers = current.members.map((item) => {
        if (item.id !== rowId) {
          return item;
        }
        return { ...item, ...next };
      });

      const shouldPrimary = next.is_primary === true;
      return {
        ...current,
        members: shouldPrimary ? nextMembers.map((item) => ({ ...item, is_primary: item.id === rowId })) : nextMembers,
      };
    });
  }

  function updateFamilyMemberLink(rowId: string, memberId: string | null) {
    const member = memberId ? clientData?.members.find((row) => row.id === memberId) ?? null : null;
    setFamilyForm((current) => {
      const hasDuplicate = memberId ? current.members.some((m) => m.id !== rowId && m.member_id === memberId) : false;
      if (hasDuplicate) return current;

      return {
        ...current,
        members: current.members.map((item) => {
          if (item.id !== rowId) return item;
          return {
            ...item,
            member_id: memberId,
            name: member ? member.name : item.name,
            date_of_birth: member ? (member.date_of_birth ?? "") : item.date_of_birth,
            is_primary: memberId ? item.is_primary : false,
          };
        }),
      };
    });
  }

  function removeFamilyMember(rowId: string) {
    setFamilyForm((current) => ({ ...current, members: current.members.filter((item) => item.id !== rowId) }));
  }

  async function handleFamilySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || !clientData || !canManageMembers) {
      return;
    }

    const name = familyForm.name.trim();
    if (name.length < 2) {
      setFamilySaveStatus("error");
      setFamilySaveMessage("Informe um nome de família válido.");
      return;
    }

    setFamilySaveStatus("loading");
    setFamilySaveMessage("");

    if (demoMode) {
      const now = new Date().toISOString();
      const familyId = familyForm.id || `family-${Date.now()}`;
      const familyRow: FamilyRecord = {
        id: familyId,
        tenant_id: clientData.tenant.id,
        name,
        notes: familyForm.notes.trim() || null,
        created_at: now,
        updated_at: now,
      };

      setClientData((current) => {
        if (!current) return current;
        const families = familyForm.id
          ? current.families.map((row) => (row.id === familyId ? { ...row, ...familyRow } : row))
          : [...current.families, familyRow].sort((a, b) => a.name.localeCompare(b.name));

        const familyMembersByFamilyId = {
          ...current.familyMembersByFamilyId,
          [familyId]: familyForm.members.map((item) => {
            const member = item.member_id ? current.members.find((m) => m.id === item.member_id) ?? null : null;
            const resolvedName = member?.name ?? (item.name.trim() || "Dependente");
            return {
              id: item.id,
              member_id: item.member_id,
              name: resolvedName,
              date_of_birth: member?.date_of_birth ?? (item.date_of_birth.trim() || null),
              relationship: item.relationship,
              is_primary: item.is_primary,
            };
          }),
        };

        return { ...current, families, familyMembersByFamilyId };
      });

      setFamilySaveStatus("success");
      setFamilySaveMessage(familyForm.id ? "Família atualizada." : "Família criada.");
      setIsFamilyFormOpen(false);
      setFamilyForm({ ...emptyFamilyForm, tenant_id: clientData.tenant.id });
      return;
    }

    const payload = {
      tenant_id: clientData.tenant.id,
      name,
      notes: familyForm.notes.trim() || null,
    };

    const familyResult = familyForm.id
      ? await supabase.from("families").update(payload).eq("id", familyForm.id).select("id").single<{ id: string }>()
      : await supabase.from("families").insert(payload).select("id").single<{ id: string }>();

    if (familyResult.error || !familyResult.data) {
      setFamilySaveStatus("error");
      setFamilySaveMessage("Não foi possível salvar a família.");
      return;
    }

    const familyId = familyResult.data.id;
    const deleteResult = await supabase.from("family_members").delete().eq("family_id", familyId);
    if (deleteResult.error) {
      setFamilySaveStatus("error");
      setFamilySaveMessage("Família salva, mas não foi possível atualizar dependentes.");
      return;
    }

    const familyMembersRows = familyForm.members
      .map((item) => {
        const member = item.member_id ? clientData.members.find((m) => m.id === item.member_id) ?? null : null;
        const name = member?.name ?? item.name.trim();
        if (!name) return null;

        return {
          tenant_id: clientData.tenant.id,
          family_id: familyId,
          member_id: item.member_id,
          name,
          date_of_birth: member?.date_of_birth ?? (item.date_of_birth.trim() || null),
          relationship: item.relationship,
          is_primary: item.is_primary,
        };
      })
      .filter(Boolean) as Array<{
        tenant_id: string;
        family_id: string;
        member_id: string | null;
        name: string;
        date_of_birth: string | null;
        relationship: string;
        is_primary: boolean;
      }>;

    if (familyMembersRows.length) {
      const insertResult = await supabase.from("family_members").insert(familyMembersRows);
      if (insertResult.error) {
        setFamilySaveStatus("error");
        setFamilySaveMessage("Família salva, mas não foi possível vincular dependentes.");
        return;
      }
    }

    setFamilySaveStatus("success");
    setFamilySaveMessage(familyForm.id ? "Família atualizada." : "Família criada.");
    setIsFamilyFormOpen(false);
    setFamilyForm({ ...emptyFamilyForm, tenant_id: clientData.tenant.id });
    await loadClientData(profile.id);
  }

  async function handleDeleteFamily(familyId: string) {
    if (!profile || !canManageMembers) {
      return;
    }

    const { error } = await supabase.from("families").delete().eq("id", familyId);
    if (!error) {
      await loadClientData(profile.id);
    }
  }

  async function handleAddMemberDependent() {
    if (!clientData || !profile || !memberForm.id) return;
    const tenantId = clientData.tenant.id;
    const memberId = memberForm.id;

    // Resolve name and dob: linked member takes precedence, otherwise manual fields
    const linkedMember = memberDependentPickerId ? clientData.members.find((m) => m.id === memberDependentPickerId) : null;
    const resolvedName = linkedMember?.name ?? memberDependentName.trim();
    if (!resolvedName) return;
    const resolvedDob = (linkedMember?.date_of_birth ?? memberDependentDob) || null;

    const existingFamily = clientData.families.find((f) =>
      clientData.familyMembersByFamilyId[f.id]?.some((fm) => fm.member_id === memberId),
    );

    if (demoMode) {
      const familyId = existingFamily?.id ?? `family-${Date.now()}`;
      const primaryMember = clientData.members.find((m) => m.id === memberId);
      setClientData((c) => {
        if (!c) return c;
        const existingFamilies = existingFamily ? c.families : [...c.families, { id: familyId, tenant_id: tenantId, name: `Família de ${primaryMember?.name ?? "Membro"}`, notes: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
        const currentMembers = c.familyMembersByFamilyId[familyId] ?? [];
        const withPrimary = existingFamily ? currentMembers : [{ id: `fm-p-${Date.now()}`, member_id: memberId, name: primaryMember?.name ?? "", date_of_birth: null, relationship: "self", is_primary: true }, ...currentMembers];
        const next = [...withPrimary, { id: `fm-${Date.now()}`, member_id: memberDependentPickerId || null, name: resolvedName, date_of_birth: resolvedDob, relationship: memberDependentRelationship, is_primary: false }];
        return { ...c, families: existingFamilies, familyMembersByFamilyId: { ...c.familyMembersByFamilyId, [familyId]: next } };
      });
      setMemberDependentPickerId(""); setMemberDependentName(""); setMemberDependentDob("");
      return;
    }

    let familyId: string;

    if (existingFamily) {
      familyId = existingFamily.id;
    } else {
      const primaryMember = clientData.members.find((m) => m.id === memberId);
      const familyResult = await supabase
        .from("families")
        .insert({ tenant_id: tenantId, name: `Família de ${primaryMember?.name ?? "Membro"}` })
        .select("id")
        .single<{ id: string }>();
      if (familyResult.error || !familyResult.data) return;
      familyId = familyResult.data.id;
      await supabase.from("family_members").insert({ tenant_id: tenantId, family_id: familyId, member_id: memberId, name: primaryMember?.name ?? "Titular", date_of_birth: primaryMember?.date_of_birth ?? null, relationship: "self", is_primary: true });
    }

    await supabase.from("family_members").insert({
      tenant_id: tenantId,
      family_id: familyId,
      member_id: memberDependentPickerId || null,
      name: resolvedName,
      date_of_birth: resolvedDob,
      relationship: memberDependentRelationship,
      is_primary: false,
    });

    setMemberDependentPickerId(""); setMemberDependentName(""); setMemberDependentDob("");
    await loadClientData(profile.id);
  }

  async function handleRemoveMemberDependent(depId: string) {
    if (!clientData || !profile || !memberForm.id) return;
    const memberId = memberForm.id;

    const existingFamily = clientData.families.find((f) =>
      clientData.familyMembersByFamilyId[f.id]?.some((fm) => fm.member_id === memberId),
    );
    if (!existingFamily) return;

    if (demoMode) {
      setClientData((c) => {
        if (!c) return c;
        const next = (c.familyMembersByFamilyId[existingFamily.id] ?? []).filter((fm) => fm.id !== depId);
        return { ...c, familyMembersByFamilyId: { ...c.familyMembersByFamilyId, [existingFamily.id]: next } };
      });
      return;
    }

    await supabase.from("family_members").delete().eq("id", depId);
    await loadClientData(profile.id);
  }

  const EVENT_BANNERS_BUCKET = "event-banners";

  function resolveEventBannerUrl(value: string | null): string | null {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const { data } = supabase.storage.from(EVENT_BANNERS_BUCKET).getPublicUrl(value);
    return data?.publicUrl ?? null;
  }

  function escapePlainTextAsHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function syncEventDescriptionFromEditor() {
    const editor = eventDescriptionEditorRef.current;
    if (!editor) return;
    const sanitized = sanitizeRichHtml(editor.innerHTML);
    const plain = sanitized ? htmlToPlainText(sanitized) : "";
    setEventForm((current) => ({
      ...current,
      description_html: sanitized || null,
      description: plain,
    }));
  }

  function applyEventRichCommand(command: string, value?: string) {
    if (!eventDescriptionEditorRef.current) return;
    eventDescriptionEditorRef.current.focus();
    document.execCommand(command, false, value);
    syncEventDescriptionFromEditor();
  }

  async function uploadEventBanner(file: File, eventId: string) {
    if (!clientData?.tenant?.id || !eventId) {
      return { ok: false as const, message: "Dados do tenant ou evento inválidos." };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      setEventBannerUploadStatus("error");
      setEventBannerUploadMessage("Sessão expirada. Faça login novamente para enviar a imagem do evento.");
      return { ok: false as const, message: "NO_SESSION" };
    }

    setEventBannerUploadStatus("loading");
    setEventBannerUploadMessage("");

    const safeName = (file.name || "banner").replace(/[^\w.-]+/g, "-");
    const objectKey = `${clientData.tenant.id}/${eventId}/${Date.now()}-${safeName}`;
    const uploadResult = await supabase.storage.from(EVENT_BANNERS_BUCKET).upload(objectKey, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadResult.error) {
      const rawError = uploadResult.error.message ?? "UPLOAD_ERROR";
      const looksLikeSchemaError = /invalid or incompatible/i.test(rawError);
      if (looksLikeSchemaError) {
        const fallbackBucket = "tenant-logos";
        const fallbackKey = `${clientData.tenant.id}/events/${eventId}/banner`;
        const fallbackUpload = await supabase.storage.from(fallbackBucket).upload(fallbackKey, file, {
          upsert: true,
          contentType: file.type || undefined,
        });

        if (!fallbackUpload.error) {
          const fallbackPublicUrl = supabase.storage.from(fallbackBucket).getPublicUrl(fallbackKey).data.publicUrl;
          setEventForm((current) => ({ ...current, cover_image_url: fallbackPublicUrl }));
          setEventBannerUploadStatus("success");
          setEventBannerUploadMessage("Imagem enviada.");
          return { ok: true as const, objectKey: fallbackPublicUrl };
        }
      }

      setEventBannerUploadStatus("error");
      const details = uploadResult.error.message ? ` Detalhes: ${uploadResult.error.message}` : "";
      const debug = ` (tenant=${clientData.tenant.id} event=${eventId} path=${objectKey})`;
      setEventBannerUploadMessage(
        `Não foi possível enviar a imagem do evento. Verifique o bucket \`${EVENT_BANNERS_BUCKET}\` e políticas de acesso.${details}${debug}`,
      );
      return { ok: false as const, message: uploadResult.error.message ?? "UPLOAD_ERROR" };
    }

    setEventForm((current) => ({ ...current, cover_image_url: objectKey }));
    setEventBannerUploadStatus("success");
    setEventBannerUploadMessage("Imagem enviada.");

    return { ok: true as const, objectKey };
  }

  async function handleEventBannerChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setEventBannerFile(file);
    setEventBannerPreviewUrl(previewUrl);
    setEventBannerUploadStatus("idle");
    setEventBannerUploadMessage("");

    if (eventForm.id) {
      await uploadEventBanner(file, eventForm.id);
    }
  }

  async function handleRemoveEventBanner() {
    setEventBannerUploadStatus("loading");
    setEventBannerUploadMessage("");

    const path = eventForm.cover_image_url;
    if (path && !/^https?:\/\//i.test(path)) {
      await supabase.storage.from(EVENT_BANNERS_BUCKET).remove([path]);
    }

    if (eventForm.id) {
      await supabase.from("tenant_events").update({ cover_image_url: null, updated_at: new Date().toISOString() }).eq("id", eventForm.id);
    }

    setEventForm((current) => ({ ...current, cover_image_url: null }));
    setEventBannerFile(null);
    setEventBannerPreviewUrl(null);
    setEventBannerUploadStatus("success");
    setEventBannerUploadMessage("Imagem removida.");
  }

  function openCreateEventForm() {
    if (!canManageEvents) {
      return;
    }

    setEventForm({ ...emptyEventForm, tenant_id: clientData?.tenant.id ?? "" });
    setEventSaveStatus("idle");
    setEventSaveMessage("");
    setEventBannerFile(null);
    setEventBannerPreviewUrl(null);
    setEventBannerUploadStatus("idle");
    setEventBannerUploadMessage("");
    setIsEventFormOpen(true);
  }

  function openEditEventForm(eventRecord: EventRecord) {
    if (!canManageEvents) {
      return;
    }

    setEventForm({ ...eventRecord, tenant_id: clientData?.tenant.id ?? "" });
    setEventSaveStatus("idle");
    setEventSaveMessage("");
    setEventBannerFile(null);
    setEventBannerPreviewUrl(resolveEventBannerUrl(eventRecord.cover_image_url));
    setEventBannerUploadStatus("idle");
    setEventBannerUploadMessage("");
    setIsEventFormOpen(true);
  }

  function updateEventForm(field: keyof EventFormState, value: string) {
    setEventForm((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    if (!isEventFormOpen) return;
    const editor = eventDescriptionEditorRef.current;
    if (!editor) return;
    const initial = sanitizeRichHtml(eventForm.description_html) || (eventForm.description ? `<p>${escapePlainTextAsHtml(eventForm.description)}</p>` : "");
    editor.innerHTML = initial;
  }, [isEventFormOpen, eventForm.id]);

  async function handleEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEventSaveStatus("loading");
    setEventSaveMessage("");

    if (!canManageEvents) {
      setEventSaveStatus("error");
      setEventSaveMessage("Seu usuário não tem permissão para administrar o calendário.");
      return;
    }

    if (!eventForm.title.trim() || !eventForm.event_date.trim()) {
      setEventSaveStatus("error");
      setEventSaveMessage("Informe título e data do evento.");
      return;
    }

    const rawEditorHtml = eventDescriptionEditorRef.current?.innerHTML ?? eventForm.description_html ?? "";
    const descriptionHtml = sanitizeRichHtml(rawEditorHtml);
    const descriptionPlain = (descriptionHtml ? htmlToPlainText(descriptionHtml) : eventForm.description ?? "").trim();

    const payload = {
      tenant_id: clientData?.tenant.id,
      title: eventForm.title.trim(),
      description: descriptionPlain || null,
      description_html: descriptionHtml || null,
      location: eventForm.location?.trim() || null,
      event_date: eventForm.event_date,
      ends_at: eventForm.ends_at || null,
      event_type: eventForm.event_type || "outro",
      color: eventForm.color || "#6d28d9",
      status: eventForm.status || "publicado",
      cover_image_url: eventForm.cover_image_url || null,
      updated_at: new Date().toISOString(),
    };

    if (eventForm.id) {
      const result = await supabase.from("tenant_events").update(payload).eq("id", eventForm.id);
      if (result.error) {
        setEventSaveStatus("error");
        setEventSaveMessage("Não foi possível salvar o evento.");
        return;
      }
    } else {
      const insertResult = await supabase
        .from("tenant_events")
        .insert({ ...payload, created_by: profile?.id, cover_image_url: null })
        .select("id")
        .single<{ id: string }>();

      if (insertResult.error || !insertResult.data?.id) {
        setEventSaveStatus("error");
        setEventSaveMessage("Não foi possível salvar o evento.");
        return;
      }

      const createdEventId = insertResult.data.id;
      if (eventBannerFile) {
        const uploadResult = await uploadEventBanner(eventBannerFile, createdEventId);
        if (uploadResult.ok) {
          const updateBannerResult = await supabase
            .from("tenant_events")
            .update({ cover_image_url: uploadResult.objectKey, updated_at: new Date().toISOString() })
            .eq("id", createdEventId);
          if (updateBannerResult.error) {
            setEventSaveStatus("error");
            setEventSaveMessage("Evento criado, mas não foi possível salvar o banner.");
            setEventForm((current) => ({ ...current, id: createdEventId, cover_image_url: uploadResult.objectKey }));
            return;
          }
        } else {
          setEventSaveStatus("error");
          setEventSaveMessage(`Evento criado, mas não foi possível enviar o banner. ${uploadResult.message ?? ""}`.trim());
          setEventForm((current) => ({ ...current, id: createdEventId }));
          return;
        }
      }
    }

    setEventSaveStatus("success");
    setEventSaveMessage(eventForm.id ? "Evento atualizado." : "Evento criado.");
    setIsEventFormOpen(false);
    setEventForm({ ...emptyEventForm, tenant_id: clientData?.tenant.id ?? "" });
    setEventBannerFile(null);
    setEventBannerPreviewUrl(null);
    setEventBannerUploadStatus("idle");
    setEventBannerUploadMessage("");
    if (profile) {
      await loadClientData(profile.id);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!eventId || !profile || !canManageEvents) {
      return;
    }

    if (!confirm("Deseja excluir este evento? Esta ação não pode ser desfeita.")) return;

    const { error } = await supabase.from("tenant_events").delete().eq("id", eventId);
    if (!error) {
      await loadClientData(profile.id);
    }
  }

  function openEventNotifyModal(event: EventRecord) {
    setEventNotifyTarget(event);
    setEventNotifyStatus("idle");
    setEventNotifyMessage("");
    setEventNotifyOpen(true);
  }

  async function handleEventSendEmail() {
    if (!eventNotifyTarget || !clientData || !profile) return;
    setEventNotifyStatus("loading");
    setEventNotifyMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/send-event-emails`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ event_id: eventNotifyTarget.id }),
        },
      );

      const body = await res.json() as { sent?: number; failed?: number; error?: string };

      if (!res.ok) {
        setEventNotifyStatus("error");
        setEventNotifyMessage(body.error ?? "Erro ao enviar e-mails.");
        return;
      }

      await supabase.from("event_notifications_log").insert({
        tenant_id: clientData.tenant.id,
        event_id: eventNotifyTarget.id,
        channel: "email",
        recipient_count: body.sent ?? 0,
        sent_by: profile.id,
      });

      setEventNotifyStatus("success");
      setEventNotifyMessage(`E-mails enviados: ${body.sent ?? 0} com sucesso${body.failed ? `, ${body.failed} com falha` : ""}.`);
    } catch (err) {
      setEventNotifyStatus("error");
      setEventNotifyMessage("Erro ao chamar o serviço de e-mail.");
    }
  }

  function openEditWorshipEvent(worshipEvent: WorshipEventRecord) {
    if (!canManageWorship) return;
    setEditingWorshipEventId(worshipEvent.id);
    const toDatetimeLocal = (iso: string | null) => {
      if (!iso) return "";
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setWorshipEventForm({
      title: worshipEvent.title,
      event_type: worshipEvent.event_type,
      starts_at: toDatetimeLocal(worshipEvent.starts_at),
      ends_at: toDatetimeLocal(worshipEvent.ends_at),
      location: worshipEvent.location ?? "",
      notes: worshipEvent.notes ?? "",
      status: worshipEvent.status,
    });
    setWorshipFlowStep(1);
    setWorshipSaveStatus("idle");
    setWorshipSaveMessage("");
  }

  function cancelEditWorshipEvent() {
    setEditingWorshipEventId(null);
    setWorshipEventForm(emptyWorshipEventForm);
    setWorshipFlowStep(1);
    setWorshipSaveStatus("idle");
    setWorshipSaveMessage("");
  }

  async function handleWorshipEventSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || !clientData || !canManageWorship) {
      return;
    }

    if (!worshipEventForm.title.trim() || !worshipEventForm.starts_at) {
      setWorshipSaveStatus("error");
      setWorshipSaveMessage("Informe o nome e o inicio do evento de louvor.");
      return;
    }

    setWorshipSaveStatus("loading");
    setWorshipSaveMessage("");

    const isEditing = Boolean(editingWorshipEventId);
    const payload = {
      title: worshipEventForm.title.trim(),
      event_type: worshipEventForm.event_type,
      starts_at: new Date(worshipEventForm.starts_at).toISOString(),
      ends_at: worshipEventForm.ends_at ? new Date(worshipEventForm.ends_at).toISOString() : null,
      location: worshipEventForm.location.trim() || null,
      notes: worshipEventForm.notes.trim() || null,
      status: worshipEventForm.status,
    };

    if (demoMode) {
      if (isEditing) {
        setClientData((current) =>
          current
            ? {
                ...current,
                worshipEvents: current.worshipEvents.map((e) =>
                  e.id === editingWorshipEventId ? { ...e, ...payload } : e,
                ),
              }
            : current,
        );
        setEditingWorshipEventId(null);
        setWorshipSaveStatus("success");
        setWorshipSaveMessage("Evento atualizado.");
      } else {
        const row: WorshipEventRecord = {
          id: `worship-event-${Date.now()}`,
          tenant_id: clientData.tenant.id,
          ...payload,
          created_at: new Date().toISOString(),
        };
        setClientData((current) =>
          current ? { ...current, worshipEvents: [...current.worshipEvents, row] } : current,
        );
        setWorshipAssignmentForm((current) => ({ ...current, event_id: row.id }));
        setWorshipFlowStep(2);
        setWorshipSaveStatus("success");
        setWorshipSaveMessage("Evento criado! Agora adicione os escalados.");
      }
      setWorshipEventForm(emptyWorshipEventForm);
      return;
    }

    if (isEditing) {
      const { error } = await supabase
        .from("worship_events")
        .update(payload)
        .eq("id", editingWorshipEventId!)
        .eq("tenant_id", clientData.tenant.id);

      if (error) {
        setWorshipSaveStatus("error");
        setWorshipSaveMessage("Nao foi possivel atualizar o evento.");
        return;
      }

      setEditingWorshipEventId(null);
      setWorshipEventForm(emptyWorshipEventForm);
      setWorshipSaveStatus("success");
      setWorshipSaveMessage("Evento atualizado.");
      await loadClientData(profile.id);
      return;
    }

    const { data: newEventRow, error } = await supabase.from("worship_events").insert({
      tenant_id: clientData.tenant.id,
      ...payload,
      created_by: profile.id,
    }).select("id").single();

    if (error) {
      setWorshipSaveStatus("error");
      setWorshipSaveMessage("Nao foi possivel criar o evento de louvor.");
      return;
    }

    if (newEventRow) {
      setWorshipAssignmentForm((current) => ({ ...current, event_id: newEventRow.id }));
    }
    setWorshipFlowStep(2);
    setWorshipEventForm(emptyWorshipEventForm);
    setWorshipSaveStatus("success");
    setWorshipSaveMessage("Evento criado! Agora adicione os escalados.");
    await loadClientData(profile.id);
  }

  async function handleDeleteWorshipEvent(eventId: string) {
    if (!eventId || !profile || !clientData || !canManageWorship) return;

    if (demoMode) {
      setClientData((current) =>
        current
          ? {
              ...current,
              worshipEvents: current.worshipEvents.filter((e) => e.id !== eventId),
              worshipAssignmentsByEventId: Object.fromEntries(
                Object.entries(current.worshipAssignmentsByEventId).filter(([k]) => k !== eventId),
              ),
            }
          : current,
      );
      return;
    }

    await supabase.from("worship_events").delete().eq("id", eventId).eq("tenant_id", clientData.tenant.id);
    await loadClientData(profile.id);
  }

  async function handleDeleteWorshipAssignment(assignmentId: string, eventId: string) {
    if (!assignmentId || !profile || !clientData || !canManageWorship) return;

    if (demoMode) {
      setClientData((current) =>
        current
          ? {
              ...current,
              worshipAssignmentsByEventId: {
                ...current.worshipAssignmentsByEventId,
                [eventId]: (current.worshipAssignmentsByEventId[eventId] ?? []).filter(
                  (a) => a.id !== assignmentId,
                ),
              },
            }
          : current,
      );
      return;
    }

    await supabase.from("worship_assignments").delete().eq("id", assignmentId).eq("tenant_id", clientData.tenant.id);
    await loadClientData(profile.id);
  }

  function buildWhatsAppLink(assignment: WorshipAssignmentRecord, worshipEvent: WorshipEventRecord) {
    const name = assignment.members?.name ?? "Membro";
    const role = assignment.worship_roles?.name ?? assignment.role_name ?? "sua função";
    const date = new Date(worshipEvent.starts_at).toLocaleString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const location = worshipEvent.location ? ` em ${worshipEvent.location}` : "";
    const message = `Olá ${name}, você foi escalado(a) como ${role} para o evento "${worshipEvent.title}" no dia ${date}${location}. Acesse o portal para confirmar sua participação: ${window.location.origin}/membro`;
    const phone = assignment.members?.email ? "" : "";
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  async function handleWorshipAssignmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile || !clientData || !canManageWorship) {
      return;
    }

    const customRole = worshipAssignmentForm.role_name.trim();
    if (!worshipAssignmentForm.event_id || !worshipAssignmentForm.member_id || (!worshipAssignmentForm.role_id && !customRole)) {
      setWorshipSaveStatus("error");
      setWorshipSaveMessage("Selecione evento, membro e funcao na escala.");
      return;
    }

    if (!worshipAssignableMembers.some((member) => member.id === worshipAssignmentForm.member_id)) {
      setWorshipSaveStatus("error");
      setWorshipSaveMessage("Selecione um membro vinculado aos ministérios de arte, louvor, dança, mídia, teatro ou som.");
      return;
    }

    setWorshipSaveStatus("loading");
    setWorshipSaveMessage("");

    if (demoMode) {
      const selectedMember = clientData.members.find((item) => item.id === worshipAssignmentForm.member_id);
      const selectedRole = clientData.worshipRoles.find((item) => item.id === worshipAssignmentForm.role_id);
      const row: WorshipAssignmentRecord = {
        id: `worship-assignment-${Date.now()}`,
        tenant_id: clientData.tenant.id,
        event_id: worshipAssignmentForm.event_id,
        member_id: worshipAssignmentForm.member_id,
        role_id: worshipAssignmentForm.role_id || null,
        role_name: customRole || null,
        arrival_at: worshipAssignmentForm.arrival_at ? new Date(worshipAssignmentForm.arrival_at).toISOString() : null,
        status: "pending",
        decline_reason: null,
        notes: worshipAssignmentForm.notes.trim() || null,
        members: selectedMember ? { name: selectedMember.name, email: selectedMember.email, phone: selectedMember.phone ?? null } : null,
        worship_roles: selectedRole ? { name: selectedRole.name } : null,
      };
      setClientData((current) =>
        current
          ? {
              ...current,
              worshipAssignmentsByEventId: {
                ...current.worshipAssignmentsByEventId,
                [row.event_id]: [...(current.worshipAssignmentsByEventId[row.event_id] ?? []), row],
              },
            }
          : current,
      );
      setWorshipAssignmentForm({ ...emptyWorshipAssignmentForm, event_id: worshipAssignmentForm.event_id });
      setWorshipSaveStatus("success");
      setWorshipSaveMessage("Escalado adicionado.");
      return;
    }

    const { error } = await supabase.from("worship_assignments").insert({
      tenant_id: clientData.tenant.id,
      event_id: worshipAssignmentForm.event_id,
      member_id: worshipAssignmentForm.member_id,
      role_id: worshipAssignmentForm.role_id || null,
      role_name: customRole || null,
      arrival_at: worshipAssignmentForm.arrival_at ? new Date(worshipAssignmentForm.arrival_at).toISOString() : null,
      notes: worshipAssignmentForm.notes.trim() || null,
    });

    if (error) {
      setWorshipSaveStatus("error");
      setWorshipSaveMessage("Nao foi possivel adicionar o escalado.");
      return;
    }

    setWorshipAssignmentForm({ ...emptyWorshipAssignmentForm, event_id: worshipAssignmentForm.event_id });
    setWorshipSaveStatus("success");
    setWorshipSaveMessage("Escalado adicionado.");
    await loadClientData(profile.id);
  }

  async function openWorshipEmailModal(eventId: string) {
    setWorshipEmailModalEventId(eventId);
    setWorshipEmailFeedback("");
    if (!worshipEmailCampaignsByEventId[eventId] && !demoMode) {
      const campaigns = await getWorshipEmailCampaigns(eventId).catch(() => []);
      setWorshipEmailCampaignsByEventId((current) => ({ ...current, [eventId]: campaigns }));
    }
  }

  async function handleSendWorshipEmails() {
    const eventId = worshipEmailModalEventId;
    if (!eventId || worshipEmailSending || !clientData) return;

    setWorshipEmailSending(true);
    setWorshipEmailFeedback("");

    try {
      const event = clientData.worshipEvents.find((e) => e.id === eventId);
      const campaignId = await createWorshipEmailCampaign(eventId, `Escala - ${event?.title ?? "Louvor"}`);
      const result = await triggerWorshipEmailCampaign(eventId, campaignId);
      const updated = await getWorshipEmailCampaigns(eventId).catch(() => worshipEmailCampaignsByEventId[eventId] ?? []);
      setWorshipEmailCampaignsByEventId((current) => ({ ...current, [eventId]: updated }));
      setWorshipEmailModalEventId(null);
      setWorshipEmailFeedbackType("success");
      setWorshipEmailFeedback(
        `${result.sent} e-mail${result.sent === 1 ? "" : "s"} enviado${result.sent === 1 ? "" : "s"}${result.failed > 0 ? `, ${result.failed} falha${result.failed === 1 ? "" : "s"}` : ""}.`,
      );
    } catch (err) {
      setWorshipEmailFeedbackType("error");
      setWorshipEmailFeedback(emailErrorMessage(err));
    } finally {
      setWorshipEmailSending(false);
    }
  }

  function openCreateAnnouncementForm() {
    if (!canManageAnnouncements) return;
    setAnnouncementForm({
      ...emptyAnnouncementForm,
      tenant_id: clientData?.tenant.id ?? "",
      published_at: new Date().toISOString(),
    });
    setAnnouncementSaveStatus("idle");
    setAnnouncementSaveMessage("");
    setIsAnnouncementFormOpen(true);
    setTimeout(() => {
      if (announcementEditorRef.current) announcementEditorRef.current.innerHTML = "";
    }, 0);
  }

  function openEditAnnouncementForm(announcement: AnnouncementRecord) {
    if (!canManageAnnouncements) return;
    setAnnouncementForm({ ...announcement, tenant_id: clientData?.tenant.id ?? "" });
    setAnnouncementSaveStatus("idle");
    setAnnouncementSaveMessage("");
    setIsAnnouncementFormOpen(true);
    setTimeout(() => {
      if (announcementEditorRef.current) {
        announcementEditorRef.current.innerHTML =
          sanitizeRichHtml(announcement.message_html) ||
          (announcement.message ? `<p>${announcement.message}</p>` : "");
      }
    }, 0);
  }

  function updateAnnouncementForm(field: keyof AnnouncementFormState, value: string) {
    setAnnouncementForm((current) => ({ ...current, [field]: value }));
  }

  function syncAnnouncementFromEditor() {
    const editor = announcementEditorRef.current;
    if (!editor) return;
    const rawHtml = editor.innerHTML ?? "";
    const sanitized = sanitizeRichHtml(rawHtml);
    const plain = editor.textContent ?? "";
    setAnnouncementForm((current) => ({
      ...current,
      message_html: sanitized || null,
      message: plain.trim(),
    }));
  }

  function applyAnnouncementRichCommand(command: string, value?: string) {
    if (!announcementEditorRef.current) return;
    announcementEditorRef.current.focus();
    document.execCommand(command, false, value);
    syncAnnouncementFromEditor();
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!canManageAnnouncements) return;
    if (!window.confirm("Excluir este comunicado?")) return;
    await supabase.from("tenant_announcements").delete().eq("id", id);
    if (profile) await loadClientData(profile.id);
  }

  async function handleAnnouncementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnnouncementSaveStatus("loading");
    setAnnouncementSaveMessage("");

    if (!canManageAnnouncements) {
      setAnnouncementSaveStatus("error");
      setAnnouncementSaveMessage("Seu usuário não tem permissão para administrar comunicados.");
      return;
    }

    const title = announcementForm.title.trim();
    const message = announcementForm.message.trim();

    if (!title || !message) {
      setAnnouncementSaveStatus("error");
      setAnnouncementSaveMessage("Informe título e mensagem.");
      return;
    }

    const payload = {
      tenant_id: clientData?.tenant.id,
      title,
      message,
      message_html: announcementForm.message_html || null,
      published_at: announcementForm.published_at || new Date().toISOString(),
      expires_at: announcementForm.expires_at || null,
    };

    const result = announcementForm.id
      ? await supabase.from("tenant_announcements").update(payload).eq("id", announcementForm.id)
      : await supabase.from("tenant_announcements").insert(payload);

    if (result.error) {
      setAnnouncementSaveStatus("error");
      setAnnouncementSaveMessage("Não foi possível salvar o comunicado.");
      return;
    }

    setAnnouncementSaveStatus("success");
    setAnnouncementSaveMessage(announcementForm.id ? "Comunicado atualizado." : "Comunicado criado.");
    setIsAnnouncementFormOpen(false);
    setAnnouncementForm({ ...emptyAnnouncementForm, tenant_id: clientData?.tenant.id ?? "" });
    if (profile) await loadClientData(profile.id);
  }

  async function handleAnnouncementSendEmail() {
    if (!announcementNotifyTarget || !profile) return;
    setAnnouncementNotifyStatus("loading");
    setAnnouncementNotifyMessage("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sessão inválida.");

      const res = await fetch(`${supabaseUrl}/functions/v1/send-announcement-emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ announcement_id: announcementNotifyTarget.id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erro ao enviar.");

      await supabase.from("announcement_notifications_log").insert({
        tenant_id: clientData?.tenant.id,
        announcement_id: announcementNotifyTarget.id,
        channel: "email",
        recipient_count: json.sent ?? 0,
        sent_by: profile.id,
        notes: `${json.sent} enviados, ${json.failed} falhos`,
      });

      setAnnouncementNotifyStatus("success");
      setAnnouncementNotifyMessage(`E-mails enviados: ${json.sent}. Falhos: ${json.failed}.`);
    } catch (err) {
      setAnnouncementNotifyStatus("error");
      setAnnouncementNotifyMessage(err instanceof Error ? err.message : "Erro ao enviar e-mails.");
    }
  }

  function extractYouTubeInfo(url: string): { channelType: "channel" | "playlist"; channelId: string } | null {
    // /channel/UCxxxxx
    const channelMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
    if (channelMatch) return { channelType: "channel", channelId: channelMatch[1] };
    // /@handle ou /@handle/videos ou /@handle/playlists
    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_.%-]+)/);
    if (handleMatch) return { channelType: "channel", channelId: `@${decodeURIComponent(handleMatch[1])}` };
    // /user/username (formato antigo)
    const userMatch = url.match(/youtube\.com\/user\/([a-zA-Z0-9_-]+)/);
    if (userMatch) return { channelType: "channel", channelId: userMatch[1] };
    // ?list=PLxxxxx (playlist)
    const listMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch) return { channelType: "playlist", channelId: listMatch[1] };
    return null;
  }

  function openCreateSocialMediaForm() {
    if (!canManageSocialMedia) return;
    setSocialMediaFormMode("create");
    setSocialMediaEditTarget(null);
    setSocialMediaFormName("");
    setSocialMediaFormUrl("");
    setSocialMediaFormDescription("");
    setSocialMediaSaveStatus("idle");
    setSocialMediaSaveMessage("");
    setIsSocialMediaFormOpen(true);
  }

  function openEditSocialMediaForm(channel: SocialMediaChannelRecord) {
    if (!canManageSocialMedia) return;
    setSocialMediaFormMode("edit");
    setSocialMediaEditTarget(channel);
    setSocialMediaFormName(channel.name);
    setSocialMediaFormUrl(channel.channel_url ?? "");
    setSocialMediaFormDescription(channel.description ?? "");
    setSocialMediaSaveStatus("idle");
    setSocialMediaSaveMessage("");
    setIsSocialMediaFormOpen(true);
  }

  async function handleSaveSocialMediaChannel(e: FormEvent) {
    e.preventDefault();
    if (!canManageSocialMedia || !clientData) return;
    setSocialMediaSaveStatus("loading");
    setSocialMediaSaveMessage("");

    const name = socialMediaFormName.trim();
    const url = socialMediaFormUrl.trim();
    if (!name || !url) {
      setSocialMediaSaveStatus("error");
      setSocialMediaSaveMessage("Informe nome e URL do canal/playlist.");
      return;
    }

    const info = extractYouTubeInfo(url);
    if (!info) {
      setSocialMediaSaveStatus("error");
      setSocialMediaSaveMessage("URL inválida. Cole a URL do canal ou playlist do YouTube (ex.: youtube.com/@IgrejaXYZ ou youtube.com/playlist?list=...).");
      return;
    }

    const payload = {
      tenant_id: clientData.tenant.id,
      name,
      platform: "youtube" as const,
      channel_type: info.channelType,
      channel_id: info.channelId,
      channel_url: url,
      description: socialMediaFormDescription.trim() || null,
      is_active: true,
    };

    const result = socialMediaEditTarget
      ? await supabase.from("social_media_channels").update(payload).eq("id", socialMediaEditTarget.id)
      : await supabase.from("social_media_channels").insert({ ...payload, created_by: profile?.id ?? null });

    if (result.error) {
      setSocialMediaSaveStatus("error");
      setSocialMediaSaveMessage("Não foi possível salvar o canal.");
      return;
    }

    setSocialMediaSaveStatus("success");
    setSocialMediaSaveMessage(socialMediaEditTarget ? "Canal atualizado." : "Canal adicionado.");
    setIsSocialMediaFormOpen(false);
    if (profile) await loadClientData(profile.id);
  }

  async function handleDeleteSocialMediaChannel(id: string) {
    if (!canManageSocialMedia) return;
    if (!window.confirm("Excluir este canal?")) return;
    await supabase.from("social_media_channels").delete().eq("id", id);
    if (profile) await loadClientData(profile.id);
  }

  async function handleToggleSocialMediaChannel(channel: SocialMediaChannelRecord) {
    if (!canManageSocialMedia) return;
    await supabase.from("social_media_channels").update({ is_active: !channel.is_active }).eq("id", channel.id);
    if (profile) await loadClientData(profile.id);
  }

  function updateThemeForm(field: keyof ThemeFormState, value: string) {
    setThemeForm((current) => {
      if (field === "primary_color") {
        const shouldSyncHeader = current.header_color === current.primary_color;
        const shouldSyncSidebar = current.sidebar_color === current.primary_color;
        const shouldSyncFooter = current.footer_color === current.primary_color;
        return {
          ...current,
          primary_color: value,
          header_color: shouldSyncHeader ? value : current.header_color,
          sidebar_color: shouldSyncSidebar ? value : current.sidebar_color,
          footer_color: shouldSyncFooter ? value : current.footer_color,
        };
      }

      return { ...current, [field]: value };
    });
  }

  async function handleThemeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setThemeSaveStatus("loading");
    setThemeSaveMessage("");

    const payload = {
      logo_url: themeForm.logo_url || null,
      primary_color: themeForm.primary_color,
      accent_color: themeForm.accent_color,
      header_color: themeForm.header_color || themeForm.primary_color,
      sidebar_color: themeForm.sidebar_color || themeForm.primary_color,
      footer_color: themeForm.footer_color || themeForm.primary_color,
    };

    const result = await supabase
      .from("tenants")
      .update(payload)
      .eq("id", clientData?.tenant.id);

    if (result.error) {
      setThemeSaveStatus("error");
      setThemeSaveMessage("Não foi possível salvar o tema do cliente.");
      return;
    }

    setThemeSaveStatus("success");
    setThemeSaveMessage("Tema atualizado.");
    if (profile) {
      await loadClientData(profile.id);
    }
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !clientData?.tenant.id) {
      return;
    }

    setLogoUploadStatus("loading");
    setLogoUploadMessage("");

    const directory = `${clientData.tenant.id}`;
    const objectKey = `${directory}/logo`;
    const { error: uploadError } = await supabase.storage.from("tenant-logos").upload(objectKey, file, {
      upsert: true,
    });

    if (uploadError) {
      setLogoUploadStatus("error");
      const details = uploadError.message ? ` Detalhes: ${uploadError.message}` : "";
      setLogoUploadMessage(
        `Falha ao enviar logo. Verifique se o bucket \`tenant-logos\` existe no Supabase Storage.${details}`,
      );
      return;
    }

    const logoPreviewUrl = getTenantLogoPublicUrl(objectKey, clientData.tenant.id);
    if (!logoPreviewUrl) {
      setLogoUploadStatus("error");
      setLogoUploadMessage("Logo enviada, mas não foi possível obter a URL da imagem.");
      return;
    }

    const { data: existingFiles } = await supabase.storage.from("tenant-logos").list(directory, { limit: 100 });
    const extraPaths =
      (existingFiles ?? [])
        .map((item) => item.name)
        .filter((name) => name && name !== "logo")
        .map((name) => `${directory}/${name}`);

    if (extraPaths.length) {
      await supabase.storage.from("tenant-logos").remove(extraPaths);
    }

    setThemeForm((current) => ({ ...current, logo_url: objectKey }));
    setThemeLogoPreviewUrl(logoPreviewUrl);
    setLogoUploadStatus("success");
    setLogoUploadMessage("Logo enviada com sucesso.");
  }

  function handleUserFieldChange(userId: string, field: keyof UserEditState, value: string) {
    const user = clientData?.users.find((item) => item.id === userId);
    setUserEdits((current) => {
      const currentEdit = current[userId] ?? {
        full_name: user?.full_name ?? null,
        tenant_role: user?.tenant_role ?? "member",
        status: user?.status ?? "active",
        moduleAdminModuleIds: clientData?.moduleAdminModuleIdsByProfileId[userId] ?? [],
      };

      return {
        ...current,
        [userId]: {
          ...currentEdit,
          [field]: value,
        } as UserEditState,
      };
    });
  }

  function toggleUserModuleAdmin(userId: string, moduleId: string) {
    const user = clientData?.users.find((item) => item.id === userId);
    setUserEdits((current) => {
      const currentEdit = current[userId] ?? {
        full_name: user?.full_name ?? null,
        tenant_role: user?.tenant_role ?? "member",
        status: user?.status ?? "active",
        moduleAdminModuleIds: clientData?.moduleAdminModuleIdsByProfileId[userId] ?? [],
      };
      const exists = currentEdit.moduleAdminModuleIds.includes(moduleId);
      return {
        ...current,
        [userId]: {
          ...currentEdit,
          moduleAdminModuleIds: exists
            ? currentEdit.moduleAdminModuleIds.filter((id) => id !== moduleId)
            : [...currentEdit.moduleAdminModuleIds, moduleId],
        },
      };
    });
  }

  async function handleSaveUser(userId: string) {
    const edit = userEdits[userId];
    if (!edit || !profile || !clientData) {
      return;
    }

    setUserSaveStatus((current) => ({ ...current, [userId]: "loading" }));
    setUserSaveMessage((current) => ({ ...current, [userId]: "" }));

    const payload = {
      full_name: edit.full_name?.trim() || null,
      tenant_role: edit.tenant_role || null,
      status: edit.status,
    };

    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);

    if (error) {
      setUserSaveStatus((current) => ({ ...current, [userId]: "error" }));
      setUserSaveMessage((current) => ({
        ...current,
        [userId]: "Não foi possível atualizar o usuário.",
      }));
      return;
    }

    const deleteModuleAccessResult = await supabase
      .from("tenant_module_admins")
      .delete()
      .eq("tenant_id", clientData.tenant.id)
      .eq("profile_id", userId);

    if (deleteModuleAccessResult.error) {
      setUserSaveStatus((current) => ({ ...current, [userId]: "error" }));
      setUserSaveMessage((current) => ({
        ...current,
        [userId]: "Usuário salvo, mas não foi possível atualizar os módulos.",
      }));
      return;
    }

    const moduleRows = (edit.moduleAdminModuleIds ?? []).map((moduleId) => ({
      tenant_id: clientData.tenant.id,
      profile_id: userId,
      module_id: moduleId,
    }));

    const insertModuleAccessResult = moduleRows.length
      ? await supabase.from("tenant_module_admins").insert(moduleRows)
      : { error: null };

    if (insertModuleAccessResult.error) {
      setUserSaveStatus((current) => ({ ...current, [userId]: "error" }));
      setUserSaveMessage((current) => ({
        ...current,
        [userId]: "Usuário salvo, mas não foi possível liberar os módulos.",
      }));
      return;
    }

    setUserSaveStatus((current) => ({ ...current, [userId]: "success" }));
    setUserSaveMessage((current) => ({
      ...current,
      [userId]: "Usuário atualizado.",
    }));
    await loadClientData(profile.id);
  }

  async function handleCepLookup() {
    const raw = memberForm.address_postal_code.replace(/\D/g, "");
    if (raw.length === 0) return;
    if (raw.length !== 8) {
      setCepError("CEP deve ter 8 dígitos");
      return;
    }
    setCepError(null);
    setCepLookupStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      if (!res.ok) throw new Error("HTTP error");
      const data = (await res.json()) as {
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
        erro?: boolean;
      };
      if (data.erro) {
        setCepLookupStatus("notfound");
        setCepError("CEP não encontrado");
        return;
      }
      const line1Parts = [data.logradouro, data.bairro].filter(Boolean);
      setMemberForm((current) => ({
        ...current,
        address_line1: current.address_line1 || line1Parts.join(", "),
        address_city: current.address_city || (data.localidade ?? ""),
        address_state: current.address_state || (data.uf ?? ""),
      }));
      setCepLookupStatus("idle");
    } catch {
      setCepLookupStatus("error");
      setCepError("Falha na consulta ao ViaCEP");
    }
  }

  async function handleFinancialTransactionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !clientData || !canManageFinancial) return;

    const amount = parseFloat(financialTransactionForm.amount.replace(",", "."));
    if (!financialTransactionForm.description.trim() || !financialTransactionForm.date || isNaN(amount) || amount <= 0) {
      setFinancialSaveStatus("error");
      setFinancialSaveMessage("Informe descrição, data e valor válido.");
      return;
    }

    setFinancialSaveStatus("loading");
    setFinancialSaveMessage("");

    const payload = {
      tenant_id: clientData.tenant.id,
      type: financialTransactionForm.type,
      amount,
      description: financialTransactionForm.description.trim(),
      date: financialTransactionForm.date,
      payment_method: financialTransactionForm.payment_method,
      category_id: financialTransactionForm.category_id || null,
      member_id: financialTransactionForm.member_id || null,
      notes: financialTransactionForm.notes.trim() || null,
    };

    const isEditing = Boolean(financialTransactionForm.id);

    if (demoMode) {
      const cat = clientData.financialCategories.find((c) => c.id === payload.category_id);
      const mem = clientData.members.find((m) => m.id === payload.member_id);
      const row: FinancialTransactionRecord = {
        id: financialTransactionForm.id || `fin-tx-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
        financial_categories: cat ? { name: cat.name, color: cat.color } : null,
        members: mem ? { name: mem.name } : null,
      };
      setClientData((current) =>
        current
          ? {
              ...current,
              financialTransactions: isEditing
                ? current.financialTransactions.map((t) => (t.id === row.id ? row : t))
                : [row, ...current.financialTransactions],
            }
          : current,
      );
      setFinancialSaveStatus("success");
      setFinancialSaveMessage(isEditing ? "Lançamento atualizado." : "Lançamento registrado.");
      setIsFinancialTransactionFormOpen(false);
      setFinancialTransactionForm({ ...emptyFinancialTransactionForm, date: new Date().toISOString().slice(0, 10) });
      setFinancialFilterMonth(payload.date.slice(0, 7));
      return;
    }

    const result = isEditing
      ? await supabase.from("financial_transactions").update(payload).eq("id", financialTransactionForm.id).select("id").single<{ id: string }>()
      : await supabase.from("financial_transactions").insert({ ...payload, created_by: profile.id }).select("id").single<{ id: string }>();

    if (result.error || !result.data) {
      setFinancialSaveStatus("error");
      setFinancialSaveMessage("Não foi possível salvar o lançamento.");
      return;
    }

    setFinancialSaveStatus("success");
    setFinancialSaveMessage(isEditing ? "Lançamento atualizado." : "Lançamento registrado.");
    setIsFinancialTransactionFormOpen(false);
    setFinancialTransactionForm({ ...emptyFinancialTransactionForm, date: new Date().toISOString().slice(0, 10) });
    setFinancialFilterMonth(payload.date.slice(0, 7));
    await loadClientData(profile.id);
  }

  async function handleDeleteFinancialTransaction(transactionId: string) {
    if (!transactionId || !profile || !canManageFinancial) return;

    if (demoMode) {
      setClientData((current) =>
        current
          ? { ...current, financialTransactions: current.financialTransactions.filter((t) => t.id !== transactionId) }
          : current,
      );
      return;
    }

    const { error } = await supabase.from("financial_transactions").delete().eq("id", transactionId);
    if (!error) {
      await loadClientData(profile.id);
    }
  }

  function openEditFinancialTransaction(tx: FinancialTransactionRecord) {
    if (!canManageFinancial) return;
    setFinancialTransactionForm({
      id: tx.id,
      type: tx.type,
      amount: String(tx.amount),
      description: tx.description,
      date: tx.date,
      payment_method: tx.payment_method,
      category_id: tx.category_id ?? "",
      member_id: tx.member_id ?? "",
      notes: tx.notes ?? "",
    });
    setFinancialSaveStatus("idle");
    setFinancialSaveMessage("");
    setIsFinancialTransactionFormOpen(true);
  }

  async function handleFinancialCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !clientData || !canManageFinancial) return;

    const name = financialCategoryForm.name.trim();
    if (name.length < 2) {
      setFinancialSaveStatus("error");
      setFinancialSaveMessage("Informe um nome válido para a categoria.");
      return;
    }

    setFinancialSaveStatus("loading");
    setFinancialSaveMessage("");

    const isEditing = Boolean(financialCategoryForm.id);

    if (demoMode) {
      const row: FinancialCategoryRecord = {
        id: financialCategoryForm.id || `fin-cat-${Date.now()}`,
        tenant_id: clientData.tenant.id,
        name,
        type: financialCategoryForm.type,
        color: financialCategoryForm.color || null,
        is_system: false,
        sort_order: 200,
      };
      setClientData((current) =>
        current
          ? {
              ...current,
              financialCategories: isEditing
                ? current.financialCategories.map((c) => (c.id === row.id ? row : c))
                : [...current.financialCategories, row],
            }
          : current,
      );
      setFinancialSaveStatus("success");
      setFinancialSaveMessage(isEditing ? "Categoria atualizada." : "Categoria criada.");
      setFinancialCategoryForm(emptyFinancialCategoryForm);
      return;
    }

    const payload = {
      tenant_id: clientData.tenant.id,
      name,
      type: financialCategoryForm.type,
      color: financialCategoryForm.color || null,
    };

    const result = isEditing
      ? await supabase.from("financial_categories").update(payload).eq("id", financialCategoryForm.id)
      : await supabase.from("financial_categories").insert(payload);

    if (result.error) {
      setFinancialSaveStatus("error");
      setFinancialSaveMessage("Não foi possível salvar a categoria.");
      return;
    }

    setFinancialSaveStatus("success");
    setFinancialSaveMessage(isEditing ? "Categoria atualizada." : "Categoria criada.");
    setFinancialCategoryForm(emptyFinancialCategoryForm);
    await loadClientData(profile.id);
  }

  async function handleDeleteFinancialCategory(categoryId: string) {
    if (!categoryId || !profile || !canManageFinancial) return;

    if (demoMode) {
      setClientData((current) =>
        current
          ? { ...current, financialCategories: current.financialCategories.filter((c) => c.id !== categoryId) }
          : current,
      );
      return;
    }

    const { error } = await supabase.from("financial_categories").delete().eq("id", categoryId);
    if (!error) {
      await loadClientData(profile.id);
    }
  }

  async function handleKidsGroupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !profile || !canManageKids) return;
    const tenantId = clientData.tenant.id;
    const form = kidsGroupForm;
    const isEditing = Boolean(form.id);
    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    if (demoMode) {
      const record: KidsGroupRecord = {
        id: form.id || `kids-group-${Date.now()}`,
        tenant_id: tenantId,
        name: form.name,
        description: form.description || null,
        age_min: form.age_min ? Number(form.age_min) : null,
        age_max: form.age_max ? Number(form.age_max) : null,
        color: form.color || null,
        is_active: form.is_active,
        sort_order: 100,
        created_at: new Date().toISOString(),
      };
      setClientData((c) => {
        if (!c) return c;
        const groups = isEditing ? c.kidsGroups.map((g) => (g.id === record.id ? record : g)) : [...c.kidsGroups, record];
        return { ...c, kidsGroups: groups };
      });
      setKidsSaveStatus("success");
      setKidsSaveMessage(isEditing ? "Turma atualizada." : "Turma criada.");
      setKidsGroupForm(emptyKidsGroupForm);
      setIsKidsGroupFormOpen(false);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      name: form.name,
      description: form.description || null,
      age_min: form.age_min ? Number(form.age_min) : null,
      age_max: form.age_max ? Number(form.age_max) : null,
      color: form.color || null,
      is_active: form.is_active,
    };

    const result = isEditing
      ? await supabase.from("kids_groups").update(payload).eq("id", form.id)
      : await supabase.from("kids_groups").insert(payload);

    if (result.error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Não foi possível salvar a turma.");
      return;
    }
    setKidsSaveStatus("success");
    setKidsSaveMessage(isEditing ? "Turma atualizada." : "Turma criada.");
    setKidsGroupForm(emptyKidsGroupForm);
    setIsKidsGroupFormOpen(false);
    await loadClientData(profile.id);
  }

  async function handleKidsChildSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !profile || !canManageKids) return;
    const tenantId = clientData.tenant.id;
    const form = kidsChildForm;
    const isEditing = Boolean(form.id);
    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    if (demoMode) {
      const grp = clientData.kidsGroups.find((g) => g.id === form.group_id);
      const record: KidsChildRecord = {
        id: form.id || `kids-child-${Date.now()}`,
        tenant_id: tenantId,
        name: form.name,
        date_of_birth: form.date_of_birth || null,
        group_id: form.group_id || null,
        member_id: form.member_id || null,
        allergies: form.allergies || null,
        special_needs: form.special_needs || null,
        notes: form.notes || null,
        is_active: true,
        created_at: new Date().toISOString(),
        kids_groups: grp ? { name: grp.name } : null,
      };
      setClientData((c) => {
        if (!c) return c;
        const children = isEditing ? c.kidsChildren.map((ch) => (ch.id === record.id ? record : ch)) : [...c.kidsChildren, record];
        return { ...c, kidsChildren: children };
      });
      setKidsSaveStatus("success");
      setKidsSaveMessage(isEditing ? "Criança atualizada." : "Criança cadastrada.");
      setKidsChildForm(emptyKidsChildForm);
      setKidsChildSearch("");
      setIsKidsChildFormOpen(false);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      name: form.name,
      date_of_birth: form.date_of_birth || null,
      group_id: form.group_id || null,
      member_id: form.member_id || null,
      allergies: form.allergies || null,
      special_needs: form.special_needs || null,
      notes: form.notes || null,
    };

    const result = isEditing
      ? await supabase.from("kids_children").update(payload).eq("id", form.id)
      : await supabase.from("kids_children").insert(payload);

    if (result.error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Não foi possível salvar o cadastro.");
      return;
    }
    setKidsSaveStatus("success");
    setKidsSaveMessage(isEditing ? "Criança atualizada." : "Criança cadastrada.");
    setKidsChildForm(emptyKidsChildForm);
    setKidsChildSearch("");
    setIsKidsChildFormOpen(false);
    await loadClientData(profile.id);
  }

  async function handleKidsGuardianSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !profile || !canManageKids) return;
    const tenantId = clientData.tenant.id;
    const form = kidsGuardianForm;
    const isEditing = Boolean(form.id);
    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    if (demoMode) {
      const child = clientData.kidsChildren.find((c) => c.id === form.child_id);
      const record: KidsGuardianRecord = {
        id: form.id || `kids-guard-${Date.now()}`,
        tenant_id: tenantId,
        child_id: form.child_id,
        name: form.name,
        phone: form.phone || null,
        relationship: form.relationship,
        member_id: form.member_id || null,
        is_primary: form.is_primary,
        created_at: new Date().toISOString(),
        kids_children: child ? { name: child.name } : null,
      };
      setClientData((c) => {
        if (!c) return c;
        const prev = c.kidsGuardiansByChildId[form.child_id] ?? [];
        const next = isEditing ? prev.map((g) => (g.id === record.id ? record : g)) : [...prev, record];
        return { ...c, kidsGuardiansByChildId: { ...c.kidsGuardiansByChildId, [form.child_id]: next } };
      });
      setKidsSaveStatus("success");
      setKidsSaveMessage(isEditing ? "Responsável atualizado." : "Responsável adicionado.");
      setKidsGuardianForm(emptyKidsGuardianForm);
      setIsKidsGuardianFormOpen(false);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      child_id: form.child_id,
      name: form.name,
      phone: form.phone || null,
      relationship: form.relationship,
      member_id: form.member_id || null,
      is_primary: form.is_primary,
    };

    const result = isEditing
      ? await supabase.from("kids_guardians").update(payload).eq("id", form.id)
      : await supabase.from("kids_guardians").insert(payload);

    if (result.error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Não foi possível salvar o responsável.");
      return;
    }
    setKidsSaveStatus("success");
    setKidsSaveMessage(isEditing ? "Responsável atualizado." : "Responsável adicionado.");
    setKidsGuardianForm(emptyKidsGuardianForm);
    setIsKidsGuardianFormOpen(false);
    await loadClientData(profile.id);
  }

  async function handleKidsTeacherScheduleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !profile || !canManageKids) return;
    const tenantId = clientData.tenant.id;
    const form = kidsTeacherScheduleForm;
    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    if (demoMode) {
      const member = clientData.members.find((m) => m.id === form.member_id);
      const grp = clientData.kidsGroups.find((g) => g.id === form.group_id);
      const record: KidsTeacherScheduleRecord = {
        id: `kids-sched-${Date.now()}`,
        tenant_id: tenantId,
        schedule_date: form.schedule_date,
        group_id: form.group_id || null,
        member_id: form.member_id,
        role_label: form.role_label || null,
        notes: form.notes || null,
        created_at: new Date().toISOString(),
        members: member ? { name: member.name, phone: member.phone } : null,
        kids_groups: grp ? { name: grp.name } : null,
      };
      setClientData((c) => c ? { ...c, kidsTeacherSchedule: [record, ...c.kidsTeacherSchedule] } : c);
      setKidsSaveStatus("success");
      setKidsSaveMessage("Professor(a) escalado(a).");
      setKidsTeacherScheduleForm(emptyKidsTeacherScheduleForm);
      setIsKidsTeacherScheduleFormOpen(false);
      return;
    }

    const { error } = await supabase.from("kids_teacher_schedule").insert({
      tenant_id: tenantId,
      schedule_date: form.schedule_date,
      group_id: form.group_id || null,
      member_id: form.member_id,
      role_label: form.role_label || null,
      notes: form.notes || null,
    });

    if (error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Não foi possível salvar a escala.");
      return;
    }
    setKidsSaveStatus("success");
    setKidsSaveMessage("Professor(a) escalado(a).");
    setKidsTeacherScheduleForm(emptyKidsTeacherScheduleForm);
    setIsKidsTeacherScheduleFormOpen(false);
    await loadClientData(profile.id);
  }

  async function handleKidsAttendanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !profile || !canManageKids) return;
    const tenantId = clientData.tenant.id;
    const form = kidsAttendanceForm;
    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    if (demoMode) {
      const child = clientData.kidsChildren.find((c) => c.id === form.child_id);
      const grp = clientData.kidsGroups.find((g) => g.id === form.group_id);
      const record: KidsAttendanceRecord = {
        id: `kids-att-${Date.now()}`,
        tenant_id: tenantId,
        child_id: form.child_id,
        group_id: form.group_id || null,
        attendance_date: form.attendance_date,
        checked_in_at: new Date().toISOString(),
        checked_out_at: null,
        guardian_name: form.guardian_name || null,
        notes: form.notes || null,
        created_at: new Date().toISOString(),
        kids_children: child ? { name: child.name } : null,
        kids_groups: grp ? { name: grp.name } : null,
      };
      setClientData((c) => c ? { ...c, kidsAttendance: [record, ...c.kidsAttendance] } : c);
      setKidsSaveStatus("success");
      setKidsSaveMessage("Presença registrada.");
      setKidsAttendanceForm(emptyKidsAttendanceForm);
      setIsKidsAttendanceFormOpen(false);
      return;
    }

    const { error } = await supabase.from("kids_attendance").insert({
      tenant_id: tenantId,
      child_id: form.child_id,
      group_id: form.group_id || null,
      attendance_date: form.attendance_date,
      checked_in_at: new Date().toISOString(),
      guardian_name: form.guardian_name || null,
      notes: form.notes || null,
    });

    if (error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage(error.code === "23505" ? "Criança já registrada nesta data." : "Não foi possível registrar a presença.");
      return;
    }
    setKidsSaveStatus("success");
    setKidsSaveMessage("Presença registrada.");
    setKidsAttendanceForm(emptyKidsAttendanceForm);
    setIsKidsAttendanceFormOpen(false);
    await loadClientData(profile.id);
  }

  async function handleKidsAttendanceCheckout(attendanceId: string) {
    if (!attendanceId || !clientData || !profile || !canManageKids) return;

    const checkedOutAt = new Date().toISOString();
    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    if (demoMode) {
      setClientData((current) =>
        current
          ? {
              ...current,
              kidsAttendance: current.kidsAttendance.map((item) =>
                item.id === attendanceId ? { ...item, checked_out_at: checkedOutAt } : item,
              ),
            }
          : current,
      );
      setKidsSaveStatus("success");
      setKidsSaveMessage("Check-out registrado.");
      return;
    }

    const { error } = await supabase
      .from("kids_attendance")
      .update({ checked_out_at: checkedOutAt })
      .eq("id", attendanceId)
      .eq("tenant_id", clientData.tenant.id);

    if (error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Não foi possível registrar o check-out.");
      return;
    }

    setKidsSaveStatus("success");
    setKidsSaveMessage("Check-out registrado.");
    await loadClientData(profile.id);
  }

  function stopKidsQrScanner() {
    if (kidsQrScanTimerRef.current) {
      window.clearTimeout(kidsQrScanTimerRef.current);
      kidsQrScanTimerRef.current = null;
    }

    kidsQrStreamRef.current?.getTracks().forEach((track) => track.stop());
    kidsQrStreamRef.current = null;

    if (kidsQrVideoRef.current) {
      kidsQrVideoRef.current.srcObject = null;
    }

    setIsKidsQrScannerOpen(false);
  }

  async function startKidsQrScanner() {
    const BarcodeDetectorCtor = (window as typeof window & {
      BarcodeDetector?: new (options: { formats: string[] }) => {
        detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;

    if (!BarcodeDetectorCtor) {
      setKidsQrScannerMessage("Leitura por câmera não está disponível neste navegador. Use o campo de token.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setKidsQrScannerMessage("Este navegador não liberou acesso à câmera. Use o campo de token.");
      return;
    }

    setKidsQrScannerMessage("");
    setIsKidsQrScannerOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      kidsQrStreamRef.current = stream;
      if (kidsQrVideoRef.current) {
        kidsQrVideoRef.current.srcObject = stream;
        await kidsQrVideoRef.current.play();
      }

      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      const scan = async () => {
        const video = kidsQrVideoRef.current;
        if (!video || !kidsQrStreamRef.current) return;

        try {
          const codes = await detector.detect(video);
          const rawValue = codes[0]?.rawValue?.trim();
          if (rawValue) {
            setKidsQrToken(rawValue);
            stopKidsQrScanner();
            setKidsQrScannerMessage("QR lido. Confirme o check-in.");
            return;
          }
        } catch {
          setKidsQrScannerMessage("Não foi possível ler o QR. Ajuste o enquadramento ou use o token manual.");
        }

        kidsQrScanTimerRef.current = window.setTimeout(scan, 650);
      };

      kidsQrScanTimerRef.current = window.setTimeout(scan, 650);
    } catch {
      setKidsQrScannerMessage("Permissão de câmera negada ou indisponível.");
      stopKidsQrScanner();
    }
  }

  async function handleKidsQrCheckin() {
    if (!clientData || !profile || !canManageKids) return;
    const raw = kidsQrToken.trim();
    if (!raw) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Informe ou escaneie o QR token.");
      return;
    }

    const normalizedToken = raw.startsWith("kids-pass:") ? raw.slice("kids-pass:".length) : raw;
    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    const { data, error } = await supabase.rpc("consume_kids_checkin_pass", {
      in_pass_token: normalizedToken,
      in_guardian_name: null,
      in_notes: "Check-in via QR",
    });

    if (error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage(error.message || "QR inválido, expirado ou já utilizado.");
      return;
    }

    const result = ((data as KidsQrConsumeResult[] | null) ?? [])[0];
    if (!result) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Não foi possível processar o QR.");
      return;
    }

    setKidsSaveStatus("success");
    setKidsSaveMessage(`Check-in confirmado para ${result.child_name}.`);
    setKidsQrToken("");
    await loadClientData(profile.id);
  }

  async function handleDeleteKidsTeacherSchedule(scheduleId: string) {
    if (!scheduleId || !clientData || !profile || !canManageKids) return;

    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    if (demoMode) {
      setClientData((current) =>
        current
          ? {
              ...current,
              kidsTeacherSchedule: current.kidsTeacherSchedule.filter((item) => item.id !== scheduleId),
            }
          : current,
      );
      setKidsSaveStatus("success");
      setKidsSaveMessage("Escala removida.");
      return;
    }

    const { error } = await supabase
      .from("kids_teacher_schedule")
      .delete()
      .eq("id", scheduleId)
      .eq("tenant_id", clientData.tenant.id);

    if (error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Não foi possível remover a escala.");
      return;
    }

    setKidsSaveStatus("success");
    setKidsSaveMessage("Escala removida.");
    await loadClientData(profile.id);
  }

  async function handleKidsActivitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !profile || !canManageKids) return;
    const tenantId = clientData.tenant.id;
    const form = kidsActivityForm;
    const isEditing = Boolean(form.id);
    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    if (demoMode) {
      const grp = clientData.kidsGroups.find((g) => g.id === form.group_id);
      const record: KidsActivityRecord = {
        id: form.id || `kids-act-${Date.now()}`,
        tenant_id: tenantId,
        group_id: form.group_id || null,
        title: form.title,
        description: form.description || null,
        activity_date: form.activity_date,
        created_at: new Date().toISOString(),
        kids_groups: grp ? { name: grp.name } : null,
      };
      setClientData((c) => {
        if (!c) return c;
        const acts = isEditing ? c.kidsActivities.map((a) => (a.id === record.id ? record : a)) : [record, ...c.kidsActivities];
        return { ...c, kidsActivities: acts };
      });
      setKidsSaveStatus("success");
      setKidsSaveMessage(isEditing ? "Atividade atualizada." : "Atividade criada.");
      setKidsActivityForm(emptyKidsActivityForm);
      setIsKidsActivityFormOpen(false);
      return;
    }

    const payload = {
      tenant_id: tenantId,
      group_id: form.group_id || null,
      title: form.title,
      description: form.description || null,
      activity_date: form.activity_date,
    };

    const result = isEditing
      ? await supabase.from("kids_activities").update(payload).eq("id", form.id)
      : await supabase.from("kids_activities").insert(payload);

    if (result.error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Não foi possível salvar a atividade.");
      return;
    }
    setKidsSaveStatus("success");
    setKidsSaveMessage(isEditing ? "Atividade atualizada." : "Atividade criada.");
    setKidsActivityForm(emptyKidsActivityForm);
    setIsKidsActivityFormOpen(false);
    await loadClientData(profile.id);
  }

  async function handleKidsCommunicationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientData || !profile || !canManageKids) return;
    const tenantId = clientData.tenant.id;
    const form = kidsCommunicationForm;
    setKidsSaveStatus("loading");
    setKidsSaveMessage("");

    if (demoMode) {
      const child = form.child_id ? clientData.kidsChildren.find((c) => c.id === form.child_id) : null;
      const record: KidsCommunicationRecord = {
        id: `kids-comm-${Date.now()}`,
        tenant_id: tenantId,
        child_id: form.child_id || null,
        title: form.title,
        message: form.message,
        sent_via: form.sent_via,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        kids_children: child ? { name: child.name } : null,
      };
      setClientData((c) => c ? { ...c, kidsCommunications: [record, ...c.kidsCommunications] } : c);
      setKidsSaveStatus("success");
      setKidsSaveMessage("Comunicado enviado.");
      setKidsCommunicationForm(emptyKidsCommunicationForm);
      setIsKidsCommunicationFormOpen(false);
      return;
    }

    const { error } = await supabase.from("kids_communications").insert({
      tenant_id: tenantId,
      child_id: form.child_id || null,
      title: form.title,
      message: form.message,
      sent_via: form.sent_via,
      created_by: profile.id,
    });

    if (error) {
      setKidsSaveStatus("error");
      setKidsSaveMessage("Não foi possível enviar o comunicado.");
      return;
    }
    setKidsSaveStatus("success");
    setKidsSaveMessage("Comunicado enviado.");
    setKidsCommunicationForm(emptyKidsCommunicationForm);
    setIsKidsCommunicationFormOpen(false);
    await loadClientData(profile.id);
  }

  const tenant = clientData?.tenant;

  if (!tenant || dataStatus === "error") {
    return (
      <main>
        <section className="admin-auth-page">
          <div className="admin-auth-brand">
            <a className="brand-mark" href="/" aria-label="SirvaOS">
              <img src="/img/logo-horizontal-sirvaos.svg" alt="SirvaOS" />
            </a>
            <div className="admin-auth-copy">
              <span className="eyebrow">
                <ShieldCheck size={18} />
                Admin Cliente / Igreja
              </span>
              <h1>Acesso ao painel da igreja</h1>
              <p>Faça login com seu usuário para acessar a área de gestão</p>
            </div>
          </div>

          <section className="admin-auth-panel">
            <form className="login-form" onSubmit={handleClientLogin}>
              <TextField
                autoComplete="email"
                icon={<Mail size={18} />}
                label="E-mail"
                name="email"
                placeholder="admin@igreja.org"
                type="email"
              />
              <TextField
                autoComplete="current-password"
                endIcon={
                  <button type="button" aria-label="Mostrar senha">
                    <Eye size={18} />
                  </button>
                }
                icon={<LockKeyhole size={18} />}
                label="Senha"
                name="password"
                placeholder="Sua senha"
                type="password"
              />
              {loginMessage ? <p className={`login-feedback ${loginStatus}`}>{loginMessage}</p> : null}
              <Button type="submit" disabled={loginStatus === "loading"} icon={<ArrowRight size={18} />}>
                {loginStatus === "loading" ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`client-admin-page ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${
        isMobileSidebarOpen ? "sidebar-mobile-open" : ""
      }`}
    >
      <button
        className="sidebar-mobile-toggle"
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>
      {isMobileSidebarOpen ? (
        <button
          className="sidebar-backdrop"
          type="button"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}
      {mustChangePassword ? (
        <div className="modal-overlay" aria-label="Troca de senha obrigatória">
          <section className="modal-card">
            <div className="modal-header">
              <div>
                <span>Segurança</span>
                <h2>Trocar senha no primeiro acesso</h2>
              </div>
            </div>

            <form className="modal-body" onSubmit={handleForcePasswordChangeSubmit}>
              <div className="modal-grid">
                <label>
                  <span>Nova senha</span>
                  <input
                    value={passwordDraft}
                    onChange={(event) => setPasswordDraft(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Crie uma senha forte"
                  />
                </label>
                <label>
                  <span>Confirmar nova senha</span>
                  <input
                    value={passwordDraftConfirm}
                    onChange={(event) => setPasswordDraftConfirm(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                  />
                </label>
              </div>

              {passwordChangeMessage ? (
                <p className={`login-feedback ${passwordChangeStatus}`}>{passwordChangeMessage}</p>
              ) : null}

              <div className="modal-actions">
                <Button
                  type="submit"
                  disabled={passwordChangeStatus === "loading"}
                  icon={<ArrowRight size={18} />}
                >
                  {passwordChangeStatus === "loading" ? "Salvando..." : "Atualizar senha"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <aside className="client-admin-sidebar" aria-label="Navegação do Admin Cliente">
        <div className="sidebar-top-row">
          <div className="client-brand">
            <div className="tenant-sidebar-logo" aria-label="Logo do tenant">
              {resolvedTenantLogoUrl ? (
                <img
                  src={resolvedTenantLogoUrl}
                  alt={`Logo ${tenant.name}`}
                  onError={() => setResolvedTenantLogoUrl(null)}
                />
              ) : (
                <span className="tenant-sidebar-logo-fallback">{tenant.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="sidebar-label">
              <strong>{tenant.name}</strong>
              <small>{tenant.slug}</small>
            </div>
          </div>
          <button
            className="sidebar-collapse-button"
            type="button"
            onClick={() => {
              if (isMobileSidebarOpen) {
                setIsMobileSidebarOpen(false);
                return;
              }
              setIsSidebarCollapsed((current) => !current);
            }}
            aria-label={isMobileSidebarOpen ? "Fechar menu" : isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav>
          {visibleClientTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              className={activeTab === key ? "active" : undefined}
              onClick={() => {
                setActiveTab(key);
                setIsMobileSidebarOpen(false);
              }}
            >
              <Icon size={18} />
              <span className="sidebar-label">{label}</span>
            </button>
          ))}
        </nav>

        <div className="client-admin-userbox">
          <span className="sidebar-label">Logado como</span>
          <strong className="sidebar-label">{profile?.full_name ?? profile?.email}</strong>
          <small className="sidebar-label">{profile?.email}</small>
        </div>

        {profile?.member_id ? (
          <a className="client-admin-portal-link" href="/membro">
            <Users2 size={18} />
            <span className="sidebar-label">Portal do membro</span>
          </a>
        ) : null}

        <button className="global-admin-logout" type="button" onClick={handleSignOut}>
          <LogOut size={18} />
          <span className="sidebar-label">Sair</span>
        </button>
      </aside>

      <section className="global-admin-content">
        <header className="global-admin-header">
          <div className="client-header-brand">
            <div className="client-header-logo" aria-label={`Logo ${tenant.name}`}>
              {resolvedTenantLogoUrl ? (
                <img src={resolvedTenantLogoUrl} alt="" onError={() => setResolvedTenantLogoUrl(null)} />
              ) : (
                <span>{tenant.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <span>
                {activeTab === "overview"
                  ? "Ambiente administrativo"
                  : activeTab === "members"
                  ? "Gestão de membros"
                  : activeTab === "families"
                  ? "Famílias e dependentes"
                  : activeTab === "events"
                  ? "Módulo de Eventos"
                  : activeTab === "worship"
                  ? "Módulo de Louvor"
                  : activeTab === "financial"
                  ? "Módulo Financeiro"
                  : activeTab === "kids"
                  ? "Módulo Kids"
                  : activeTab === "notices"
                  ? "Comunicados gerais"
                  : activeTab === "social-media"
                  ? "Mídias Sociais"
                  : activeTab === "intercession"
                  ? "Módulo de Intercessão"
                  : activeTab === "lists"
                  ? "Cargos e ministérios"
                  : activeTab === "theme"
                  ? "Identidade visual"
                  : activeTab === "policies"
                  ? "Política & LGPD"
                  : "Gestão de usuários"}
              </span>
              <h1>{tenant.name}</h1>
              <p>
                {activeTab === "overview"
                  ? "Acompanhe membros, eventos, módulos ativos e a identidade visual da igreja."
                  : activeTab === "members"
                  ? "Gerencie o cadastro básico dos membros da igreja."
                  : activeTab === "families"
                  ? "Organize famílias, dependentes e vínculos principais para atendimento e acompanhamento."
                  : activeTab === "events"
                  ? "Agenda institucional da igreja visível para todos os membros."
                  : activeTab === "worship"
                  ? "Gerencie escalas, integrantes e confirmações de presença."
                  : activeTab === "financial"
                  ? "Registre dízimos, ofertas, receitas e despesas da igreja."
                  : activeTab === "kids"
                  ? "Gerencie crianças, turmas, presença, professores e comunicados aos responsáveis."
                  : activeTab === "notices"
                  ? "Publique comunicados gerais para a comunidade."
                  : activeTab === "social-media"
                  ? "Vincule canais e playlists do YouTube para os membros assistirem dentro do sistema."
                  : activeTab === "intercession"
                  ? "Gerencie pedidos de oração, distribua para intercessores e acompanhe cada pedido até a conclusão."
                  : activeTab === "lists"
                  ? "Gerencie cargos e ministérios visíveis neste ambiente."
                  : activeTab === "theme"
                  ? "Atualize logo, cores e visual usado nas páginas da igreja."
                  : activeTab === "policies"
                  ? "Configure termos de uso, política de privacidade e acompanhe consentimentos LGPD."
                  : "Gerencie usuários e permissões do ambiente da igreja."}
              </p>
            </div>
          </div>
          <div className="client-header-actions">
            {profile ? (
              <div className="client-header-user" aria-label="Usuário logado">
                <div className="client-header-avatar" aria-label="Foto do perfil">
                  {profile.avatar_url && profile.avatar_url !== avatarErrorUrl ? (
                    <img
                      src={profile.avatar_url}
                      alt={`Foto de ${(profile.full_name ?? profile.email ?? "usuário").trim()}`}
                      onError={() => setAvatarErrorUrl(profile.avatar_url)}
                    />
                  ) : (
                    <span>{(profile.full_name ?? profile.email ?? "?").trim().charAt(0).toUpperCase() || "?"}</span>
                  )}
                </div>
                <div className="client-header-user-meta">
                  <strong>{profile.full_name ?? profile.email}</strong>
                  <small>{profile.email}</small>
                </div>
              </div>
            ) : null}
            <div className="client-header-actions-buttons">
              {activeTab === "financial" && canManageFinancial ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setFinancialTransactionForm({ ...emptyFinancialTransactionForm, date: new Date().toISOString().slice(0, 10) });
                    setFinancialSaveStatus("idle");
                    setFinancialSaveMessage("");
                    setIsFinancialTransactionFormOpen(true);
                    setFinancialView("transactions");
                  }}
                >
                  <Plus size={16} /> Novo lançamento
                </button>
              ) : null}
              {activeTab === "members" || activeTab === "families" || activeTab === "events" || activeTab === "notices" ? (
                <Button
                  icon={<Plus size={18} />}
                  onClick={() => {
                    if (activeTab === "members") openCreateMemberForm();
                    if (activeTab === "families") openCreateFamilyForm();
                    if (activeTab === "events") openCreateEventForm();
                    if (activeTab === "notices") openCreateAnnouncementForm();
                  }}
                  disabled={
                    activeTab === "members" || activeTab === "families"
                      ? !canManageMembers
                      : activeTab === "events"
                      ? !canManageEvents
                      : !canManageAnnouncements
                  }
                >
                  {activeTab === "members"
                    ? "Novo membro"
                    : activeTab === "families"
                    ? "Nova família"
                    : activeTab === "events"
                    ? "Novo evento"
                    : "Novo comunicado"}
                </Button>
              ) : null}
              {activeTab === "social-media" && canManageSocialMedia ? (
                <Button icon={<Plus size={18} />} onClick={openCreateSocialMediaForm}>
                  Novo canal
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="client-stats">
          <article>
            <span>Membros</span>
            <strong>{memberCount}</strong>
            <small>Membros ativos e cadastrados</small>
          </article>
          <article>
            <span>Eventos</span>
            <strong>{eventCount}</strong>
            <small>Próximos itens no calendário</small>
          </article>
          <article>
            <span>Comunicados</span>
            <strong>{announcementCount}</strong>
            <small>Mensagens para o tenant</small>
          </article>
          <article>
            <span>Módulos ativos</span>
            <strong>{activeModules.length}</strong>
            <small>Funcionalidades disponíveis</small>
          </article>
        </div>

        <div className="dashboard-grid">
          {activeTab === "overview" ? (
            <>
              <article className="panel members-panel">
                <div className="panel-heading">
                  <div>
                    <span>Membros</span>
                    <h4>Visão rápida</h4>
                  </div>
                  <button type="button" onClick={() => setActiveTab("members")}>Ver todos</button>
                </div>

                <div className="member-list">
                  {clientData.members.slice(0, 4).map((member) => (
                    <div key={member.id} className="member-row">
                      <span>{member.name.slice(0, 1)}</span>
                      <div>
                        <strong>{member.name}</strong>
                        <small>{memberSummaryById[member.id] ?? member.email ?? "Sem vínculos"}</small>
                      </div>
                      <em className={member.status === "active" ? "success" : "warning"}>{member.status}</em>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <span>Calendário central</span>
                    <h4>Próximos eventos</h4>
                  </div>
                  <CalendarCheck size={20} />
                </div>

                <div className="event-list">
                  {clientData.events.slice(0, 4).map((item) => (
                    <div key={item.id}>
                      <time>{new Date(item.event_date).toLocaleDateString("pt-BR")}</time>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.location || item.description || "Sem local definido"}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <span>Notificações</span>
                    <h4>Últimos comunicados</h4>
                  </div>
                  <Bell size={20} />
                </div>

                <div className="notification-list">
                  {clientData.announcements.slice(0, 4).map((item) => (
                    <div key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{new Date(item.published_at).toLocaleDateString("pt-BR")}</small>
                      </div>
                      <em>Publicado</em>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel theme-panel">
                <div className="panel-heading">
                  <div>
                    <span>Design</span>
                    <h4>Visual selecionado para a igreja</h4>
                  </div>
                  <Palette size={20} />
                </div>

                <div className="theme-preview">
                  <span className="church-logo">{tenant.name.slice(0, 2).toUpperCase()}</span>
                  <div className="theme-swatches" aria-label="Cores do cliente">
                    <span style={{ background: themeForm.primary_color }} />
                    <span style={{ background: themeForm.accent_color }} />
                    <span style={{ background: themeForm.logo_url ? "#333" : "#ddd" }} />
                  </div>
                </div>
              </article>
            </>
          ) : null}

          {activeTab === "reports" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Relatórios</span>
                  <h4>Dashboard analítico</h4>
                </div>
                <Receipt size={20} />
              </div>

              {(() => {
                const now = new Date();
                const thisMonth = now.toISOString().slice(0, 7);

                // ── Status membros ──────────────────────────────────────────
                const statusCounts = { active: 0, visitor: 0, inactive: 0, in_process: 0 };
                for (const m of clientData.members) {
                  const s = (m.status_v2 ?? m.status) as keyof typeof statusCounts;
                  if (s in statusCounts) statusCounts[s]++;
                }
                const totalMembers = clientData.members.length;

                // ── Age calc ────────────────────────────────────────────────
                const calcAgeR = (dob: string | null) => {
                  if (!dob) return null;
                  const birth = new Date(dob + "T12:00:00");
                  let age = now.getFullYear() - birth.getFullYear();
                  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
                  return age;
                };

                // ── Age distribution ────────────────────────────────────────
                const ageBuckets = { kids: 0, youth: 0, adult: 0, senior: 0, unknown: 0 };
                for (const m of clientData.members) {
                  const age = calcAgeR(m.date_of_birth ?? null);
                  if (age === null) ageBuckets.unknown++;
                  else if (age < 13) ageBuckets.kids++;
                  else if (age < 26) ageBuckets.youth++;
                  else if (age < 61) ageBuckets.adult++;
                  else ageBuckets.senior++;
                }
                for (const deps of Object.values(clientData.familyMembersByFamilyId)) {
                  for (const dep of deps) {
                    if (dep.member_id) continue;
                    const age = calcAgeR(dep.date_of_birth);
                    if (age === null) continue;
                    if (age < 13) ageBuckets.kids++;
                    else if (age < 26) ageBuckets.youth++;
                    else if (age < 61) ageBuckets.adult++;
                    else ageBuckets.senior++;
                  }
                }

                // ── Financial last 6 months ─────────────────────────────────
                const last6Months = Array.from({ length: 6 }, (_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                  return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") };
                });
                const financialByMonth = last6Months.map(({ key, label }) => ({
                  label,
                  income: clientData.financialTransactions.filter((t) => t.date.slice(0, 7) === key && t.type === "income").reduce((s, t) => s + t.amount, 0),
                  expense: clientData.financialTransactions.filter((t) => t.date.slice(0, 7) === key && t.type === "expense").reduce((s, t) => s + t.amount, 0),
                }));
                const maxFinancial = Math.max(...financialByMonth.flatMap((m) => [m.income, m.expense]), 1);

                // ── Ministries ──────────────────────────────────────────────
                const ministryCounts: Record<string, number> = {};
                for (const mins of Object.values(clientData.memberMinistriesByMemberId)) {
                  for (const min of mins) { ministryCounts[min.name] = (ministryCounts[min.name] ?? 0) + 1; }
                }
                const topMinistries = Object.entries(ministryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const maxMinistry = Math.max(...topMinistries.map((m) => m[1]), 1);

                // ── KPIs ────────────────────────────────────────────────────
                const allAssignments = Object.values(clientData.worshipAssignmentsByEventId).flat();
                const worshipConfirmed = allAssignments.filter((a) => a.status === "confirmed").length;
                const worshipResponded = allAssignments.filter((a) => a.status === "confirmed" || a.status === "declined").length;
                const worshipRate = worshipResponded > 0 ? Math.round((worshipConfirmed / worshipResponded) * 100) : 0;
                const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
                const eventsNext30 = clientData.events.filter((e) => { const d = new Date(e.event_date); return d >= now && d <= in30 && e.status === "publicado"; }).length;
                const incomeThisMonth = clientData.financialTransactions.filter((t) => t.date.slice(0, 7) === thisMonth && t.type === "income").reduce((s, t) => s + t.amount, 0);
                const expenseThisMonth = clientData.financialTransactions.filter((t) => t.date.slice(0, 7) === thisMonth && t.type === "expense").reduce((s, t) => s + t.amount, 0);
                const balance = incomeThisMonth - expenseThisMonth;
                const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                const kidsActive = clientData.kidsChildren.filter((c) => c.is_active).length;

                // ── Donut segments ──────────────────────────────────────────
                const donutSegs = [
                  { label: "Ativos", count: statusCounts.active, color: "#22c55e" },
                  { label: "Visitantes", count: statusCounts.visitor, color: "#3b82f6" },
                  { label: "Inativos", count: statusCounts.inactive, color: "#f59e0b" },
                  { label: "Em processo", count: statusCounts.in_process, color: "#a855f7" },
                ].filter((s) => s.count > 0);
                const R = 54, CX = 76, CY = 76, circ = 2 * Math.PI * R;
                let off = 0;
                const donutPaths = donutSegs.map((seg) => {
                  const dash = totalMembers > 0 ? (seg.count / totalMembers) * circ : 0;
                  const p = { ...seg, dash, gap: circ - dash, offset: off };
                  off += dash; return p;
                });

                // ── Age rows ────────────────────────────────────────────────
                const ageRows = [
                  { label: "Kids (< 13)", count: ageBuckets.kids, color: "#f59e0b" },
                  { label: "Jovens (13–25)", count: ageBuckets.youth, color: "#22c55e" },
                  { label: "Adultos (26–60)", count: ageBuckets.adult, color: "#3b82f6" },
                  { label: "Sênior (60+)", count: ageBuckets.senior, color: "#a855f7" },
                  { label: "Sem data", count: ageBuckets.unknown, color: "#94a3b8" },
                ].filter((r) => r.count > 0);
                const maxAge = Math.max(...ageRows.map((r) => r.count), 1);

                return (
                  <div className="reports-dashboard">
                    {/* ── KPI strip ── */}
                    <div className="reports-kpis">
                      {[
                        { label: "Membros ativos", value: String(statusCounts.active), sub: `de ${totalMembers} cadastros`, color: "#22c55e" },
                        { label: "Próx. 30 dias", value: String(eventsNext30), sub: "eventos publicados", color: "#3b82f6" },
                        { label: "Louvor", value: `${worshipRate}%`, sub: "taxa de confirmação", color: "#a855f7" },
                        { label: "Saldo do mês", value: fmt(balance), sub: balance >= 0 ? "superávit" : "déficit", color: balance >= 0 ? "#22c55e" : "#ef4444" },
                        { label: "Kids", value: String(kidsActive), sub: "crianças ativas", color: "#f59e0b" },
                      ].map(({ label, value, sub, color }) => (
                        <div key={label} className="reports-kpi">
                          <span>{label}</span>
                          <strong style={{ color }}>{value}</strong>
                          <small>{sub}</small>
                        </div>
                      ))}
                    </div>

                    {/* ── Charts row 1 ── */}
                    <div className="reports-charts-row">
                      {/* Donut — status */}
                      <div className="reports-chart-card">
                        <div className="reports-chart-title">
                          <strong>Distribuição de membros</strong>
                          <small>por status atual</small>
                        </div>
                        <div className="reports-donut-wrap">
                          <svg viewBox="0 0 152 152" width="152" height="152">
                            {totalMembers === 0
                              ? <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e2e8f0" strokeWidth={18} />
                              : donutPaths.map((seg) => (
                                <circle key={seg.label} cx={CX} cy={CY} r={R} fill="none" stroke={seg.color} strokeWidth={18}
                                  strokeDasharray={`${seg.dash} ${seg.gap}`}
                                  strokeDashoffset={circ / 4 - seg.offset}
                                />
                              ))}
                            <text x={CX} y={CY - 7} textAnchor="middle" fontSize="24" fontWeight="700" fill="#1e293b">{totalMembers}</text>
                            <text x={CX} y={CY + 11} textAnchor="middle" fontSize="10" fill="#64748b">membros</text>
                          </svg>
                          <div className="reports-donut-legend">
                            {donutSegs.map((seg) => (
                              <div key={seg.label} className="reports-legend-item">
                                <span style={{ background: seg.color }} />
                                <div><strong>{seg.count}</strong><small>{seg.label}</small></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bar chart — financial */}
                      <div className="reports-chart-card reports-chart-card--wide">
                        <div className="reports-chart-title">
                          <strong>Financeiro — últimos 6 meses</strong>
                          <div className="reports-legend-inline">
                            <span><em style={{ background: "#22c55e" }} />Receita</span>
                            <span><em style={{ background: "#ef4444" }} />Despesa</span>
                          </div>
                        </div>
                        <div className="reports-bar-wrap">
                          <svg viewBox="0 0 480 150" width="100%" height="150" preserveAspectRatio="xMidYMid meet">
                            {financialByMonth.map((m, i) => {
                              const bW = 26, maxH = 110, x = 30 + i * 74;
                              const incH = (m.income / maxFinancial) * maxH;
                              const expH = (m.expense / maxFinancial) * maxH;
                              return (
                                <g key={m.label}>
                                  <rect x={x} y={120 - incH} width={bW} height={Math.max(incH, 2)} fill="#22c55e" rx={3} opacity={0.85} />
                                  <rect x={x + bW + 4} y={120 - expH} width={bW} height={Math.max(expH, 2)} fill="#ef4444" rx={3} opacity={0.85} />
                                  <text x={x + bW} y={136} textAnchor="middle" fontSize="11" fill="#64748b">{m.label}</text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* ── Charts row 2 ── */}
                    <div className="reports-charts-row">
                      {/* Horizontal bar — age */}
                      <div className="reports-chart-card">
                        <div className="reports-chart-title">
                          <strong>Faixa etária</strong>
                          <small>membros e dependentes</small>
                        </div>
                        <div className="reports-hbar-list">
                          {ageRows.length > 0 ? ageRows.map((row) => (
                            <div key={row.label} className="reports-hbar-row">
                              <span>{row.label}</span>
                              <div className="reports-hbar-track">
                                <div className="reports-hbar-fill" style={{ width: `${(row.count / maxAge) * 100}%`, background: row.color }} />
                              </div>
                              <strong>{row.count}</strong>
                            </div>
                          )) : <div className="catalog-empty">Cadastre datas de nascimento para visualizar.</div>}
                        </div>
                      </div>

                      {/* Horizontal bar — ministries */}
                      <div className="reports-chart-card">
                        <div className="reports-chart-title">
                          <strong>Ministérios</strong>
                          <small>membros por ministério</small>
                        </div>
                        <div className="reports-hbar-list">
                          {topMinistries.length > 0 ? topMinistries.map(([name, count], idx) => {
                            const colors = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444"];
                            return (
                              <div key={name} className="reports-hbar-row">
                                <span>{name}</span>
                                <div className="reports-hbar-track">
                                  <div className="reports-hbar-fill" style={{ width: `${(count / maxMinistry) * 100}%`, background: colors[idx % colors.length] }} />
                                </div>
                                <strong>{count}</strong>
                              </div>
                            );
                          }) : <div className="catalog-empty">Nenhum ministério com membros.</div>}
                        </div>
                      </div>
                    </div>

                    {/* ── Export ── */}
                    <div className="reports-export-card">
                      <div className="reports-chart-title">
                        <strong>Exportação CSV</strong>
                        <small>Dados completos para análise externa</small>
                      </div>
                      <div className="reports-export-btns">
                        <Button type="button" variant="secondary" onClick={() => {
                          const rows: Record<string, unknown>[] = [];
                          for (const m of clientData.members) {
                            const family = clientData.families.find((f) => clientData.familyMembersByFamilyId[f.id]?.some((fm) => fm.member_id === m.id));
                            const deps = family ? (clientData.familyMembersByFamilyId[family.id] ?? []).filter((fm) => fm.member_id !== m.id) : [];
                            rows.push({ tipo: "membro", membro_responsavel: "", nome: m.name, email: m.email ?? "", telefone: m.phone ?? "", status: m.status_v2 ?? m.status, data_nascimento: m.date_of_birth ?? "", cpf_rg: m.document_number ?? "", cidade: m.address_city ?? "", estado: m.address_state ?? "", familia: family?.name ?? "", dependentes: deps.map((d) => d.name).join("; "), criado_em: m.created_at });
                            for (const dep of deps) {
                              rows.push({ tipo: "dependente", membro_responsavel: m.name, nome: dep.name, email: "", telefone: "", status: "", data_nascimento: dep.date_of_birth ?? "", cpf_rg: "", cidade: "", estado: "", familia: family?.name ?? "", dependentes: "", criado_em: "" });
                            }
                          }
                          downloadCsv(`membros-dependentes-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
                        }}>
                          Membros e dependentes
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => downloadCsv(`eventos-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.csv`, clientData.events.map((e) => ({ id: e.id, title: e.title, location: e.location, event_date: e.event_date, created_at: e.created_at })))}>
                          Eventos
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => downloadCsv(`financeiro-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.csv`, clientData.financialTransactions.map((t) => ({ id: t.id, type: t.type, amount: t.amount, description: t.description, date: t.date, payment_method: t.payment_method, category: t.financial_categories?.name ?? null, member: t.members?.name ?? null, notes: t.notes, created_at: t.created_at })))}>
                          Financeiro
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => downloadCsv(`kids-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.csv`, clientData.kidsChildren.map((c) => ({ id: c.id, name: c.name, date_of_birth: c.date_of_birth, group: c.kids_groups?.name ?? "", allergies: c.allergies ?? "", special_needs: c.special_needs ?? "", notes: c.notes ?? "", created_at: c.created_at })))}>
                          Kids
                        </Button>
                      </div>
                    </div>

                    {/* ── Audit ── */}
                    <div className="reports-export-card">
                      <div className="reports-audit-head">
                        <button
                          className="reports-audit-toggle"
                          type="button"
                          onClick={() => setIsTenantAuditOpen((current) => !current)}
                          aria-expanded={isTenantAuditOpen}
                          aria-controls="tenant-audit-panel"
                        >
                          <div className="reports-audit-left">
                            <strong>Auditoria</strong>
                            <small>Atividades recentes do sistema</small>
                            <div className="reports-audit-summary">
                              <span>
                                {tenantAuditStatus === "loading"
                                  ? "Carregando..."
                                  : `${tenantAuditLogs.length} registro${tenantAuditLogs.length === 1 ? "" : "s"}`}
                              </span>
                              {tenantAuditLogs[0]?.created_at ? (
                                <span title={new Date(tenantAuditLogs[0].created_at).toLocaleString("pt-BR")}>
                                  Último: {formatRelativeTimePtBR(tenantAuditLogs[0].created_at)}
                                </span>
                              ) : null}
                              <span className="reports-audit-hint">
                                {isTenantAuditOpen ? "Clique para recolher" : "Clique para expandir"}
                              </span>
                            </div>
                          </div>

                          <span className="reports-audit-toggle-right" aria-hidden="true">
                            <span className="reports-audit-toggle-label">{isTenantAuditOpen ? "Recolher" : "Expandir"}</span>
                            {isTenantAuditOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </span>
                        </button>

                        <div className="reports-audit-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => { if (clientData?.tenant.id) void loadTenantAuditLogs(clientData.tenant.id); }}
                            disabled={tenantAuditStatus === "loading"}
                          >
                            {tenantAuditStatus === "loading" ? "Carregando..." : "Recarregar"}
                          </Button>
                          {isTenantAuditOpen ? (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => downloadCsv(
                                  `auditoria-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.csv`,
                                  tenantAuditLogs.map((log) => ({ id: log.id, action: log.action, entity_type: log.entity_type, entity_id: log.entity_id, created_at: log.created_at })),
                                )}
                                disabled={tenantAuditLogs.length === 0}
                              >
                                Exportar
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => openPrintableTable(
                                  `Auditoria · ${tenant.name}`,
                                  ["Data", "Ação", "Entidade", "ID"],
                                  tenantAuditLogs.slice(0, 80).map((log) => [new Date(log.created_at).toLocaleString("pt-BR"), log.action, log.entity_type, log.entity_id ?? ""]),
                                )}
                                disabled={tenantAuditLogs.length === 0}
                              >
                                Imprimir
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {tenantAuditMessage ? <p className={`login-feedback ${tenantAuditStatus === "error" ? "error" : "success"}`}>{tenantAuditMessage}</p> : null}

                      {isTenantAuditOpen ? (
                        tenantAuditLogs.length === 0 ? (
                          <div id="tenant-audit-panel" className="catalog-empty">Nenhum evento registrado ainda.</div>
                        ) : (
                          <div id="tenant-audit-panel" className="reports-audit-list" style={{ marginTop: 8 }}>
                            {tenantAuditLogs.slice(0, 25).map((log) => {
                              const ui = formatTenantAuditLogUi(log);
                              return (
                                <div key={log.id} className="catalog-row reports-audit-row">
                                  <div style={{ display: "grid", gap: 4 }}>
                                    <strong style={{ fontSize: "0.95rem" }}>{ui.title}</strong>
                                    <small style={{ color: "var(--color-neutral-500)" }}>{ui.subtitle}</small>
                                  </div>
                                  <span title={ui.whenTitle} style={{ color: "var(--color-neutral-600)", fontSize: "0.9rem" }}>
                                    {ui.whenLabel || ui.whenTitle}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })()}
            </article>
          ) : null}

          {activeTab === "members" ? (
            <article className="panel members-panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Membros</span>
                  <h4>Lista de membros cadastrados</h4>
                </div>
                {canManageMembers ? (
                  <button type="button" onClick={openCreateMemberForm}>Novo membro</button>
                ) : null}
              </div>

              <div className="member-list">
                <div className="member-filters">
                  <input
                    className="catalog-input"
                    placeholder="Buscar por nome, e-mail ou telefone"
                    value={memberSearchTerm}
                    onChange={(event) => setMemberSearchTerm(event.target.value)}
                  />
                  <select
                    className="catalog-input"
                    value={memberStatusFilter}
                    onChange={(event) => setMemberStatusFilter(event.target.value as typeof memberStatusFilter)}
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="visitor">Visitante</option>
                    <option value="in_process">Em processo</option>
                  </select>
                </div>

                {filteredMembers.length === 0 ? (
                  <div className="catalog-empty">Nenhum membro encontrado para os filtros informados.</div>
                ) : null}

                {filteredMembers.map((member) => {
                  const status = (member.status_v2 ?? member.status) as MemberFormState["status"];
                  const memberFamily = clientData.families.find((f) =>
                    clientData.familyMembersByFamilyId[f.id]?.some((fm) => fm.member_id === member.id),
                  );
                  const memberDependents = memberFamily
                    ? (clientData.familyMembersByFamilyId[memberFamily.id] ?? []).filter((fm) => fm.member_id !== member.id)
                    : [];
                  return (
                    <div key={member.id} className="member-row">
                      <span>{member.name.slice(0, 1)}</span>
                      <div>
                        <strong>{member.name}</strong>
                        <small>{memberSummaryById[member.id] ?? member.email ?? "Sem vínculos"}</small>
                        {memberDependents.length > 0 ? (
                          <div className="member-deps-chips">
                            {memberDependents.map((dep) => (
                              <span key={dep.member_id} className="member-dep-chip">{dep.name}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <em className={status === "active" ? "success" : status === "inactive" ? "warning" : "info"}>
                        {status === "active" ? "Ativo" : status === "inactive" ? "Inativo" : status === "visitor" ? "Visitante" : status === "in_process" ? "Em processo" : status}
                      </em>
                      {canManageMembers ? (
                        <div className="member-actions">
                          <button type="button" onClick={() => openEditMemberForm(member)}>
                            <Edit3 size={16} />
                          </button>
                          <button type="button" onClick={() => handleDeleteMember(member.id)}>
                            <X size={16} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ) : null}

          {activeTab === "families" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Famílias</span>
                  <h4>Família e dependentes</h4>
                </div>
                {canManageMembers ? <button type="button" onClick={openCreateFamilyForm}>Nova família</button> : null}
              </div>

              <div className="member-list">
                {clientData.families.length === 0 ? (
                  <div className="catalog-empty">Nenhuma família cadastrada ainda.</div>
                ) : null}

                {clientData.families.map((family) => {
                  const familyMembers = clientData.familyMembersByFamilyId[family.id] ?? [];
                  const primary = familyMembers.find((item) => item.is_primary);
                  const familyMemberIds = new Set(familyMembers.map((fm) => fm.member_id));
                  const linkedKids = clientData.kidsChildren.filter((ch) => ch.member_id && familyMemberIds.has(ch.member_id));
                  const subtitleParts = [
                    primary ? `Principal: ${primary.name}` : null,
                    familyMembers.length ? `${familyMembers.length} pessoas` : "Sem dependentes",
                    linkedKids.length ? `${linkedKids.length} criança${linkedKids.length > 1 ? "s" : ""} no Kids` : null,
                  ].filter(Boolean);

                  return (
                    <div key={family.id} className="member-row family-row-expandable">
                      <span>{family.name.slice(0, 1)}</span>
                      <div>
                        <strong>{family.name}</strong>
                        <small>{subtitleParts.join(" · ")}</small>
                        {linkedKids.length > 0 ? (
                          <div className="family-kids-chips">
                            {linkedKids.map((ch) => (
                              <span key={ch.id} className="family-kid-chip">
                                <Baby size={11} />
                                {ch.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <em className={familyMembers.length > 0 ? "success" : "warning"}>
                        {familyMembers.length > 0 ? "com vínculos" : "pendente"}
                      </em>
                      {canManageMembers ? (
                        <div className="member-actions">
                          <button type="button" onClick={() => openEditFamilyForm(family)}>
                            <Edit3 size={16} />
                          </button>
                          <button type="button" onClick={() => handleDeleteFamily(family.id)}>
                            <X size={16} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ) : null}

          {activeTab === "events" ? (
            <article className="panel full-width worship-panel">
              <div className="panel-heading">
                <div>
                  <span>Agenda institucional</span>
                  <h4>Eventos da igreja</h4>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div className="worship-view-toggle">
                    <button
                      type="button"
                      className={eventViewMode === "list" ? "active" : ""}
                      onClick={() => setEventViewMode("list")}
                    >
                      Lista
                    </button>
                    <button
                      type="button"
                      className={eventViewMode === "calendar" ? "active" : ""}
                      onClick={() => setEventViewMode("calendar")}
                    >
                      Calendário
                    </button>
                  </div>
                </div>
              </div>

              {/* Resumo */}
              <div className="worship-summary">
                <article>
                  <span>Total de eventos</span>
                  <strong>{clientData.events.length}</strong>
                  <small>Todos os status</small>
                </article>
                <article>
                  <span>Publicados</span>
                  <strong>{clientData.events.filter((e) => e.status === "publicado").length}</strong>
                  <small>Visíveis para membros</small>
                </article>
                <article>
                  <span>Próximos 30 dias</span>
                  <strong>{clientData.events.filter((e) => {
                    const d = new Date(e.event_date);
                    const now = new Date();
                    const in30 = new Date();
                    in30.setDate(in30.getDate() + 30);
                    return d >= now && d <= in30 && e.status === "publicado";
                  }).length}</strong>
                  <small>Eventos agendados</small>
                </article>
              </div>

              {/* Visão calendário */}
              {eventViewMode === "calendar" ? (
                (() => {
                  const year = eventCalendarMonth.getFullYear();
                  const month = eventCalendarMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const monthName = eventCalendarMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" });
                  const eventsByDay: Record<number, EventRecord[]> = {};
                  for (const evt of clientData.events) {
                    const d = new Date(evt.event_date);
                    if (d.getFullYear() === year && d.getMonth() === month) {
                      const day = d.getDate();
                      if (!eventsByDay[day]) eventsByDay[day] = [];
                      eventsByDay[day].push(evt);
                    }
                  }
                  const cells: (number | null)[] = [
                    ...Array(firstDay === 0 ? 6 : firstDay - 1).fill(null),
                    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                  ];
                  while (cells.length % 7 !== 0) cells.push(null);
                  const today = new Date();
                  return (
                    <div className="worship-calendar">
                      <div className="worship-calendar-nav">
                        <button type="button" onClick={() => setEventCalendarMonth(new Date(year, month - 1, 1))}>‹</button>
                        <strong>{monthName}</strong>
                        <button type="button" onClick={() => setEventCalendarMonth(new Date(year, month + 1, 1))}>›</button>
                      </div>
                      <div className="worship-calendar-grid">
                        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                          <div key={d} className="worship-calendar-weekday">{d}</div>
                        ))}
                        {cells.map((day, i) => {
                          const isToday =
                            day !== null &&
                            today.getFullYear() === year &&
                            today.getMonth() === month &&
                            today.getDate() === day;
                          const dayEvents = day !== null ? (eventsByDay[day] ?? []) : [];
                          return (
                            <div key={i} className={`worship-calendar-cell${day === null ? " empty" : ""}${isToday ? " today" : ""}`}>
                              {day !== null ? (
                                <>
                                  <span className="worship-calendar-day">{day}</span>
                                  {dayEvents.map((evt) => (
                                    <div
                                      key={evt.id}
                                      className="worship-calendar-event"
                                      style={{ backgroundColor: evt.color ?? "#6d28d9", opacity: evt.status === "cancelado" ? 0.45 : 1 }}
                                      title={`${evt.title}${evt.status === "cancelado" ? " (cancelado)" : ""}`}
                                      onClick={() => canManageEvents && openEditEventForm(evt)}
                                    >
                                      {evt.title}
                                    </div>
                                  ))}
                                </>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Visão lista */
                <div className="worship-event-list">
                  {clientData.events.length === 0 ? (
                    <div className="catalog-empty">Nenhum evento cadastrado. Clique em "Novo evento" para começar.</div>
                  ) : null}

                  {clientData.events.map((item) => {
                    const eventDate = new Date(item.event_date);
                    const isPast = eventDate < new Date();
                    const typeLabels: Record<string, string> = {
                      culto: "Culto", conferencia: "Conferência", retiro: "Retiro",
                      jovens: "Jovens", infantil: "Infantil", social: "Social", outro: "Outro",
                    };
                    return (
                      <section key={item.id} className="worship-event-card" style={{ opacity: item.status === "cancelado" || isPast ? 0.7 : 1 }}>
                        <header>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                            <span
                              style={{
                                width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                                backgroundColor: item.color ?? "#6d28d9",
                                display: "inline-block",
                              }}
                            />
                            <div>
                              <strong>{item.title}</strong>
                              <small>
                                {eventDate.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                {item.ends_at ? ` até ${new Date(item.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                                {item.location ? ` · ${item.location}` : ""}
                              </small>
                            </div>
                          </div>
                          <div className="worship-event-actions">
                            <em
                              className={
                                item.status === "publicado" ? "success"
                                : item.status === "cancelado" ? "error"
                                : "warning"
                              }
                            >
                              {item.status === "publicado" ? "Publicado" : item.status === "cancelado" ? "Cancelado" : "Rascunho"}
                            </em>
                            <em style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)", padding: "2px 6px", borderRadius: 4 }}>
                              {typeLabels[item.event_type] ?? item.event_type}
                            </em>
                            <button
                              type="button"
                              className="worship-action-btn"
                              onClick={() => { setEventPreviewTarget(item); setEventPreviewOpen(true); }}
                              title="Visualizar como membro"
                            >
                              <Eye size={14} />
                            </button>
                            {canManageEvents && item.status === "publicado" ? (
                              <button
                                type="button"
                                className="worship-email-btn"
                                onClick={() => openEventNotifyModal(item)}
                                title="Notificar membros"
                              >
                                <Send size={15} />
                                <span>Notificar</span>
                              </button>
                            ) : null}
                            {canManageEvents ? (
                              <>
                                <button type="button" className="worship-action-btn" onClick={() => openEditEventForm(item)} title="Editar">
                                  <Edit3 size={14} />
                                </button>
                                <button type="button" className="worship-action-btn danger" onClick={() => handleDeleteEvent(item.id)} title="Excluir">
                                  <X size={14} />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </header>
                        {item.description ? (
                          <p style={{ margin: "8px 0 0", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                            {item.description}
                          </p>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              )}
            </article>
          ) : null}

          {activeTab === "worship" ? (
            <article className="panel full-width worship-panel">
              <div className="panel-heading">
                <div>
                  <span>Louvor</span>
                  <h4>Escalas de culto e ensaio</h4>
                </div>
                {canManageWorship ? (
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<Bell size={16} />}
                    onClick={() => openPushComposer("worship")}
                  >
                    Enviar push
                  </Button>
                ) : null}
              </div>

              {worshipSaveMessage ? (
                <p className={`login-feedback ${worshipSaveStatus}`}>{worshipSaveMessage}</p>
              ) : null}

              {worshipEmailFeedback ? (
                <p className={`login-feedback ${worshipEmailFeedbackType}`}>{worshipEmailFeedback}</p>
              ) : null}

              <div className="worship-summary">
                <article>
                  <span>Eventos</span>
                  <strong>{worshipEventCount}</strong>
                  <small>Cultos, ensaios e encontros do louvor</small>
                </article>
                <article>
                  <span>Escalados</span>
                  <strong>{worshipAssignmentCount}</strong>
                  <small>Participações planejadas</small>
                </article>
                <article>
                  <span>Funções</span>
                  <strong>{clientData.worshipRoles.length}</strong>
                  <small>Instrumentos e responsabilidades ativas</small>
                </article>
              </div>

              {(() => {
                const allAssignments = Object.values(clientData.worshipAssignmentsByEventId).flat();
                if (allAssignments.length === 0) return null;
                const statsByMember: Record<string, { name: string; total: number; confirmed: number; declined: number; pending: number }> = {};
                for (const a of allAssignments) {
                  const name = a.members?.name ?? "Desconhecido";
                  if (!statsByMember[a.member_id]) {
                    statsByMember[a.member_id] = { name, total: 0, confirmed: 0, declined: 0, pending: 0 };
                  }
                  statsByMember[a.member_id].total++;
                  if (a.status === "confirmed") statsByMember[a.member_id].confirmed++;
                  else if (a.status === "declined") statsByMember[a.member_id].declined++;
                  else statsByMember[a.member_id].pending++;
                }
                const sorted = Object.values(statsByMember).sort((a, b) => b.total - a.total);
                return (
                  <div className="worship-member-stats">
                    <div className="worship-member-stats-header">
                      <strong>Indicadores por integrante</strong>
                      <small>{sorted.length} integrante{sorted.length === 1 ? "" : "s"} escalado{sorted.length === 1 ? "" : "s"}</small>
                    </div>
                    <div className="worship-member-stats-grid">
                      {sorted.map((s) => {
                        const rate = s.total > 0 ? Math.round((s.confirmed / s.total) * 100) : 0;
                        return (
                          <div key={s.name} className="worship-member-stat-row">
                            <div className="worship-member-stat-name">
                              <span className="worship-member-avatar">{s.name.charAt(0).toUpperCase()}</span>
                              <strong>{s.name}</strong>
                            </div>
                            <div className="worship-member-stat-counts">
                              <span title="Confirmações" className="success">{s.confirmed}</span>
                              <span title="Recusas" className="danger">{s.declined}</span>
                              <span title="Pendentes" className="warning">{s.pending}</span>
                            </div>
                            <div className="worship-member-stat-bar">
                              <div style={{ width: `${rate}%` }} />
                            </div>
                            <small>{rate}%</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="worship-flow-layout">
                {canManageWorship ? (
                  <div className="worship-flow-form-col">
                    <div className="worship-steps">
                      <button
                        type="button"
                        className={`worship-step-btn${worshipFlowStep === 1 ? " active" : ""}`}
                        onClick={() => setWorshipFlowStep(1)}
                      >
                        <span className="worship-step-num">1</span>
                        <div>
                          <strong>Criar evento</strong>
                          <small>Culto, ensaio ou reunião</small>
                        </div>
                      </button>
                      <div className="worship-step-connector" />
                      <button
                        type="button"
                        className={`worship-step-btn${worshipFlowStep === 2 ? " active" : ""}${clientData.worshipEvents.length === 0 ? " locked" : ""}`}
                        onClick={() => { if (clientData.worshipEvents.length > 0) setWorshipFlowStep(2); }}
                      >
                        <span className="worship-step-num">2</span>
                        <div>
                          <strong>Adicionar escalados</strong>
                          <small>Funções e horários</small>
                        </div>
                      </button>
                    </div>

                    {worshipFlowStep === 1 ? (
                      <form className="worship-form" onSubmit={handleWorshipEventSubmit}>
                        <div className="worship-form-header">
                          <span className="worship-form-icon"><Music size={16} /></span>
                          <div>
                            <strong>{editingWorshipEventId ? "Editar evento" : "Novo evento de louvor"}</strong>
                            <small>{editingWorshipEventId ? "Atualize os dados do evento." : "Preencha e avance para escalar membros."}</small>
                          </div>
                        </div>
                        <div className="worship-field">
                          <label>Nome do evento</label>
                          <input
                            className="catalog-input"
                            placeholder="Ex: Culto domingo manhã"
                            value={worshipEventForm.title}
                            onChange={(event) => setWorshipEventForm((current) => ({ ...current, title: event.target.value }))}
                          />
                        </div>
                        <div className="modal-grid">
                          <div className="worship-field">
                            <label>Tipo</label>
                            <select
                              className="catalog-input"
                              value={worshipEventForm.event_type}
                              onChange={(event) =>
                                setWorshipEventForm((current) => ({
                                  ...current,
                                  event_type: event.target.value as WorshipEventFormState["event_type"],
                                }))
                              }
                            >
                              <option value="service">Culto</option>
                              <option value="rehearsal">Ensaio</option>
                              <option value="meeting">Reuniao</option>
                              <option value="other">Outro</option>
                            </select>
                          </div>
                          <div className="worship-field">
                            <label>Status</label>
                            <select
                              className="catalog-input"
                              value={worshipEventForm.status}
                              onChange={(event) =>
                                setWorshipEventForm((current) => ({
                                  ...current,
                                  status: event.target.value as WorshipEventFormState["status"],
                                }))
                              }
                            >
                              <option value="published">Publicado</option>
                              <option value="draft">Rascunho</option>
                              <option value="completed">Concluido</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                          </div>
                        </div>
                        <div className="modal-grid">
                          <div className="worship-field">
                            <label>Início</label>
                            <input
                              className="catalog-input"
                              type="datetime-local"
                              value={worshipEventForm.starts_at}
                              onChange={(event) => setWorshipEventForm((current) => ({ ...current, starts_at: event.target.value }))}
                            />
                          </div>
                          <div className="worship-field">
                            <label>Término</label>
                            <input
                              className="catalog-input"
                              type="datetime-local"
                              value={worshipEventForm.ends_at}
                              onChange={(event) => setWorshipEventForm((current) => ({ ...current, ends_at: event.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="worship-field">
                          <label>Local</label>
                          <input
                            className="catalog-input"
                            placeholder="Ex: Auditório principal"
                            value={worshipEventForm.location}
                            onChange={(event) => setWorshipEventForm((current) => ({ ...current, location: event.target.value }))}
                          />
                        </div>
                        <div className="worship-field">
                          <label>Observações</label>
                          <textarea
                            className="catalog-input catalog-textarea"
                            placeholder="Informações adicionais sobre a escala..."
                            value={worshipEventForm.notes}
                            onChange={(event) => setWorshipEventForm((current) => ({ ...current, notes: event.target.value }))}
                            rows={3}
                          />
                        </div>
                        <div className="worship-form-actions">
                          <Button type="submit" disabled={worshipSaveStatus === "loading"} icon={<Plus size={18} />}>
                            {editingWorshipEventId ? "Salvar alterações" : "Criar e escalar membros →"}
                          </Button>
                          {editingWorshipEventId ? (
                            <Button type="button" variant="secondary" onClick={cancelEditWorshipEvent}>
                              Cancelar
                            </Button>
                          ) : null}
                        </div>
                      </form>
                    ) : (
                      <form className="worship-form" onSubmit={handleWorshipAssignmentSubmit}>
                        <div className="worship-form-header">
                          <span className="worship-form-icon"><UserPlus size={16} /></span>
                          <div>
                            <strong>Adicionar escalado</strong>
                            <small>Membros de arte, louvor, dança, mídia, teatro e som.</small>
                          </div>
                        </div>
                        <div className="worship-field">
                          <label>Evento</label>
                          <select
                            className="catalog-input"
                            value={worshipAssignmentForm.event_id}
                            onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, event_id: event.target.value }))}
                          >
                            <option value="">Selecionar evento</option>
                            {clientData.worshipEvents.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="worship-field">
                          <label>Membro</label>
                          <select
                            className="catalog-input"
                            value={worshipAssignmentForm.member_id}
                            onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, member_id: event.target.value }))}
                          >
                            <option value="">Selecionar membro</option>
                            {worshipAssignableMembers.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name} - {memberSummaryById[member.id] ?? "Vínculo artístico"}
                              </option>
                            ))}
                            {worshipAssignableMembers.length === 0 ? (
                              <option value="" disabled>
                                Nenhum membro elegível encontrado
                              </option>
                            ) : null}
                          </select>
                        </div>
                        <div className="worship-field">
                          <label>Função</label>
                          <div className="modal-grid">
                            <select
                              className="catalog-input"
                              value={worshipAssignmentForm.role_id}
                              onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, role_id: event.target.value, role_name: "" }))}
                            >
                              <option value="">Função cadastrada</option>
                              {clientData.worshipRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                            <input
                              className="catalog-input"
                              placeholder="Ou função manual"
                              value={worshipAssignmentForm.role_name}
                              onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, role_name: event.target.value, role_id: "" }))}
                            />
                          </div>
                        </div>
                        <div className="worship-field">
                          <label>Horário de chegada</label>
                          <input
                            className="catalog-input"
                            type="datetime-local"
                            value={worshipAssignmentForm.arrival_at}
                            onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, arrival_at: event.target.value }))}
                          />
                        </div>
                        <div className="worship-field">
                          <label>Observações</label>
                          <textarea
                            className="catalog-input catalog-textarea"
                            placeholder="Instruções ou informações para este escalado..."
                            value={worshipAssignmentForm.notes}
                            onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, notes: event.target.value }))}
                            rows={3}
                          />
                        </div>
                        <div className="worship-form-actions">
                          <Button type="submit" disabled={worshipSaveStatus === "loading"} icon={<UserPlus size={18} />}>
                            Adicionar escalado
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => setWorshipFlowStep(1)}>
                            ← Novo evento
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : null}

                <div className="worship-flow-list-col">
                  <div className="worship-flow-list-head">
                    <strong>Escalas criadas</strong>
                    <div className="worship-view-toggle">
                      <button
                        type="button"
                        className={worshipViewMode === "list" ? "active" : ""}
                        onClick={() => setWorshipViewMode("list")}
                      >
                        Lista
                      </button>
                      <button
                        type="button"
                        className={worshipViewMode === "calendar" ? "active" : ""}
                        onClick={() => setWorshipViewMode("calendar")}
                      >
                        Calendário
                      </button>
                    </div>
                  </div>

              {worshipEmailModalEventId ? (() => {
                const modalEvent = clientData.worshipEvents.find((e) => e.id === worshipEmailModalEventId);
                const modalAssignments = clientData.worshipAssignmentsByEventId[worshipEmailModalEventId] ?? [];
                const withEmail = modalAssignments.filter((a) => a.members?.email).length;
                const lastCampaigns = worshipEmailCampaignsByEventId[worshipEmailModalEventId];
                const lastCampaign = lastCampaigns?.[0];
                return (
                  <div className="modal-backdrop">
                    <section className="modal-sheet worship-email-modal">
                      <div className="modal-section-header">
                        <Send size={20} />
                        <div>
                          <strong>Enviar escala por e-mail</strong>
                          <small>{modalEvent?.title ?? "Evento"}</small>
                        </div>
                      </div>

                      <div className="worship-email-summary">
                        <div><span>Escalados</span><strong>{modalAssignments.length}</strong></div>
                        <div><span>Com e-mail</span><strong>{withEmail}</strong></div>
                        {lastCampaign ? (
                          <div>
                            <span>Último envio</span>
                            <strong>{new Date(lastCampaign.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</strong>
                          </div>
                        ) : null}
                      </div>

                      <p className="worship-email-hint">
                        Cada escalado com e-mail cadastrado receberá uma mensagem com os dados do evento e sua função.
                      </p>

                      {modalAssignments.length > 0 && modalEvent ? (
                        <div className="worship-whatsapp-list">
                          <span className="worship-whatsapp-list-title">Links WhatsApp por escalado</span>
                          {modalAssignments.map((a) => {
                            const cleanPhone = (a.members?.phone ?? "").replace(/\D/g, "");
                            const waLink = buildWhatsAppLink(a, modalEvent);
                            const waLinkWithPhone = cleanPhone
                              ? waLink.replace("https://wa.me/?text=", `https://wa.me/55${cleanPhone}?text=`)
                              : waLink;
                            return (
                              <div key={a.id} className="worship-whatsapp-row">
                                <div>
                                  <strong>{a.members?.name ?? "Membro"}</strong>
                                  <small>{a.worship_roles?.name ?? a.role_name ?? "Função"}</small>
                                </div>
                                <a
                                  href={waLinkWithPhone}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="worship-whatsapp-btn"
                                >
                                  WhatsApp
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {worshipEmailFeedback && worshipEmailFeedbackType === "error" ? (
                        <p className="login-feedback error">{worshipEmailFeedback}</p>
                      ) : null}

                      <div className="modal-actions">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setWorshipEmailModalEventId(null)}
                          disabled={worshipEmailSending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          icon={<Send size={16} />}
                          onClick={handleSendWorshipEmails}
                          disabled={worshipEmailSending || withEmail === 0}
                        >
                          {worshipEmailSending ? "Enviando..." : "Enviar"}
                        </Button>
                      </div>
                    </section>
                  </div>
                );
              })() : null}

              {worshipViewMode === "calendar" ? (
                (() => {
                  const year = worshipCalendarMonth.getFullYear();
                  const month = worshipCalendarMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const monthName = worshipCalendarMonth.toLocaleString("pt-BR", { month: "long", year: "numeric" });
                  const eventsByDay: Record<number, WorshipEventRecord[]> = {};
                  for (const evt of clientData.worshipEvents) {
                    const d = new Date(evt.starts_at);
                    if (d.getFullYear() === year && d.getMonth() === month) {
                      const day = d.getDate();
                      if (!eventsByDay[day]) eventsByDay[day] = [];
                      eventsByDay[day].push(evt);
                    }
                  }
                  const cells: (number | null)[] = [
                    ...Array(firstDay === 0 ? 6 : firstDay - 1).fill(null),
                    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                  ];
                  while (cells.length % 7 !== 0) cells.push(null);
                  const today = new Date();
                  return (
                    <div className="worship-calendar">
                      <div className="worship-calendar-nav">
                        <button
                          type="button"
                          onClick={() => setWorshipCalendarMonth(new Date(year, month - 1, 1))}
                        >
                          ‹
                        </button>
                        <strong>{monthName}</strong>
                        <button
                          type="button"
                          onClick={() => setWorshipCalendarMonth(new Date(year, month + 1, 1))}
                        >
                          ›
                        </button>
                      </div>
                      <div className="worship-calendar-grid">
                        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                          <div key={d} className="worship-calendar-weekday">{d}</div>
                        ))}
                        {cells.map((day, i) => {
                          const isToday =
                            day !== null &&
                            today.getFullYear() === year &&
                            today.getMonth() === month &&
                            today.getDate() === day;
                          const dayEvents = day !== null ? (eventsByDay[day] ?? []) : [];
                          return (
                            <div
                              key={i}
                              className={`worship-calendar-cell${day === null ? " empty" : ""}${isToday ? " today" : ""}`}
                            >
                              {day !== null ? (
                                <>
                                  <span className="worship-calendar-day">{day}</span>
                                  {dayEvents.map((evt) => (
                                    <div
                                      key={evt.id}
                                      className={`worship-calendar-event ${evt.event_type}`}
                                      title={evt.title}
                                      onClick={() => canManageWorship && openEditWorshipEvent(evt)}
                                    >
                                      {evt.title}
                                    </div>
                                  ))}
                                </>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="worship-event-list">
                  {clientData.worshipEvents.length === 0 ? (
                    <div className="catalog-empty">Nenhuma escala de louvor criada ainda.</div>
                  ) : null}

                  {clientData.worshipEvents.map((item) => {
                    const assignments = clientData.worshipAssignmentsByEventId[item.id] ?? [];
                    return (
                      <section key={item.id} className="worship-event-card">
                        <header>
                          <div>
                            <strong>{item.title}</strong>
                            <small>
                              {new Date(item.starts_at).toLocaleString("pt-BR")} {item.location ? `- ${item.location}` : ""}
                            </small>
                          </div>
                          <div className="worship-event-actions">
                            <em className={item.status === "published" ? "success" : "warning"}>{worshipStatusLabel(item.status)}</em>
                            {canManageWorship && assignments.length > 0 ? (
                              <button
                                type="button"
                                className="worship-email-btn"
                                onClick={() => openWorshipEmailModal(item.id)}
                                title="Enviar escala por e-mail"
                              >
                                <Mail size={15} />
                                <span>E-mails</span>
                              </button>
                            ) : null}
                            {canManageWorship ? (
                              <>
                                <button
                                  type="button"
                                  className="worship-action-btn"
                                  onClick={() => openEditWorshipEvent(item)}
                                  title="Editar evento"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="worship-action-btn danger"
                                  onClick={() => {
                                    if (window.confirm(`Excluir "${item.title}" e todos os escalados?`)) {
                                      void handleDeleteWorshipEvent(item.id);
                                    }
                                  }}
                                  title="Excluir evento"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </header>

                        {(() => {
                          const campaigns = worshipEmailCampaignsByEventId[item.id];
                          const last = campaigns?.[0];
                          if (!last) return null;
                          return (
                            <div className="worship-email-last-campaign">
                              <Mail size={13} />
                              <span>
                                Último envio: {last.sent_count} enviado{last.sent_count === 1 ? "" : "s"}
                                {last.failed_count > 0 ? `, ${last.failed_count} falha${last.failed_count === 1 ? "" : "s"}` : ""}
                                {" · "}{emailCampaignStatusLabel(last.status)}
                              </span>
                            </div>
                          );
                        })()}

                        <div className="worship-assignment-list">
                          {assignments.length === 0 ? (
                            <span className="catalog-empty compact">Nenhum escalado neste evento.</span>
                          ) : null}
                          {assignments.map((assignment) => (
                            <div key={assignment.id} className="worship-assignment-row">
                              <div>
                                <strong>{assignment.members?.name ?? "Membro"}</strong>
                                <small>{assignment.worship_roles?.name ?? assignment.role_name ?? "Funcao"}</small>
                              </div>
                              <div className="worship-assignment-row-actions">
                                <em className={assignment.status === "confirmed" ? "success" : assignment.status === "declined" ? "danger" : "warning"}>
                                  {worshipAssignmentStatusLabel(assignment.status)}
                                </em>
                                {assignment.decline_reason ? (
                                  <small className="worship-decline-reason" title={assignment.decline_reason}>
                                    Motivo: {assignment.decline_reason}
                                  </small>
                                ) : null}
                                {canManageWorship ? (
                                  <button
                                    type="button"
                                    className="worship-action-btn danger small"
                                    onClick={() => {
                                      if (window.confirm(`Remover ${assignment.members?.name ?? "escalado"} da escala?`)) {
                                        void handleDeleteWorshipAssignment(assignment.id, item.id);
                                      }
                                    }}
                                    title="Remover escalado"
                                  >
                                    <X size={13} />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
                </div>
              </div>
            </article>
          ) : null}

          {activeTab === "financial" ? (() => {
            const allTx = clientData.financialTransactions;
            const thisMonth = financialFilterMonth;
            const normalizeTxDate = (raw: unknown) => {
              const s = typeof raw === "string" ? raw : String(raw ?? "");
              const base = s.includes("T") ? s.split("T")[0] : s;
              return base.slice(0, 10);
            };
            const txMonthKey = (t: FinancialTransactionRecord) => normalizeTxDate(t.date).slice(0, 7);
            const txAmount = (t: FinancialTransactionRecord) => {
              const raw = (t as unknown as { amount?: unknown }).amount;
              if (typeof raw === "number") return raw;
              const n = Number(String(raw ?? "").replace(",", "."));
              return Number.isFinite(n) ? n : 0;
            };

            const txThisMonth = allTx.filter((t) => txMonthKey(t) === thisMonth);
            const incomeThisMonth = txThisMonth.filter((t) => t.type === "income").reduce((s, t) => s + txAmount(t), 0);
            const expenseThisMonth = txThisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + txAmount(t), 0);
            const netThisMonth = incomeThisMonth - expenseThisMonth;

            const filteredTx = allTx.filter((t) => {
              if (financialFilterType !== "all" && t.type !== financialFilterType) return false;
              if (financialFilterCategoryId && t.category_id !== financialFilterCategoryId) return false;
              if (financialView === "transactions" && txMonthKey(t) !== financialFilterMonth) return false;
              return true;
            });

            const fmtCurrency = (v: number) =>
              v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

            const paymentLabel = (m: FinancialTransactionRecord["payment_method"]) => {
              const map: Record<string, string> = { cash: "Dinheiro", pix: "Pix", transfer: "Transferência", card: "Cartão", check: "Cheque", other: "Outro" };
              return map[m] ?? m;
            };

            const categoryById = (clientData.financialCategories ?? []).reduce<Record<string, FinancialCategoryRecord>>(
              (acc, c) => { acc[c.id] = c; return acc; }, {}
            );

            const reportByCategory = (() => {
              const grouped: Record<string, { name: string; color: string | null; income: number; expense: number }> = {};
              const reportTx = allTx.filter((t) => txMonthKey(t) === financialFilterMonth);
              for (const t of reportTx) {
                const catId = t.category_id ?? "__uncategorized__";
                const catName = t.financial_categories?.name ?? "Sem categoria";
                const catColor = t.financial_categories?.color ?? null;
                if (!grouped[catId]) grouped[catId] = { name: catName, color: catColor, income: 0, expense: 0 };
                if (t.type === "income") grouped[catId].income += txAmount(t);
                else grouped[catId].expense += txAmount(t);
              }
              return Object.values(grouped).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
            })();

            const last6Months = Array.from({ length: 6 }, (_, i) => {
              const base = new Date();
              const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1);
              const key = d.toISOString().slice(0, 7);
              const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
              return { key, label, title: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
            });

            const financialByMonth = last6Months.map((m) => {
              const txM = allTx.filter((t) => txMonthKey(t) === m.key);
              return {
                ...m,
                income: txM.filter((t) => t.type === "income").reduce((s, t) => s + txAmount(t), 0),
                expense: txM.filter((t) => t.type === "expense").reduce((s, t) => s + txAmount(t), 0),
              };
            });
            const maxFinancial = Math.max(...financialByMonth.flatMap((m) => [m.income, m.expense]), 1);

            const donutRows = (() => {
              const targetType = financialDashboardDonutType;
              const grouped = txThisMonth
                .filter((t) => t.type === targetType)
                .reduce<Record<string, { id: string; name: string; color: string | null; amount: number }>>((acc, t) => {
                  const id = t.category_id ?? "__uncategorized__";
                  const name = t.financial_categories?.name ?? "Sem categoria";
                  const color = t.financial_categories?.color ?? null;
                  acc[id] = acc[id] ?? { id, name, color, amount: 0 };
                  acc[id].amount += txAmount(t);
                  return acc;
                }, {});

              const rows = Object.values(grouped).sort((a, b) => b.amount - a.amount);
              const top = rows.slice(0, 5);
              const rest = rows.slice(5);
              const restTotal = rest.reduce((s, r) => s + r.amount, 0);
              return restTotal > 0
                ? top.concat({ id: "__other__", name: "Outros", color: "#94a3b8", amount: restTotal })
                : top;
            })();

            const donutTotal = donutRows.reduce((s, r) => s + r.amount, 0);
            const donutSegs = donutRows.map((row, idx) => {
              const fallback = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#94a3b8"];
              return { ...row, color: row.color ?? fallback[idx % fallback.length] };
            });

            const R = 54, CX = 76, CY = 76, circ = 2 * Math.PI * R;
            let off = 0;
            const donutPaths = donutSegs.map((seg) => {
              const dash = donutTotal > 0 ? (seg.amount / donutTotal) * circ : 0;
              const p = { ...seg, dash, gap: circ - dash, offset: off };
              off += dash;
              return p;
            });

            const receiptTx = financialReceiptTransactionId
              ? allTx.find((t) => t.id === financialReceiptTransactionId)
              : null;

            return (
              <article className="panel full-width financial-panel">
                <div className="panel-heading">
                  <div>
                    <span>Financeiro</span>
                    <h4>Gestão financeira da igreja</h4>
                  </div>
                  <div className="worship-view-toggle">
                    {(["dashboard", "transactions", "categories", "reports"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={financialView === v ? "active" : ""}
                        onClick={() => setFinancialView(v)}
                      >
                        {v === "dashboard" ? "Dashboard" : v === "transactions" ? "Lançamentos" : v === "categories" ? "Categorias" : "Relatórios"}
                      </button>
                    ))}
                  </div>
                </div>

                {financialSaveMessage ? (
                  <p className={`login-feedback ${financialSaveStatus}`}>{financialSaveMessage}</p>
                ) : null}

                {/* ── Modal: comprovante ── */}
                {receiptTx ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet worship-email-modal">
                      <div className="modal-section-header">
                        <Receipt size={20} />
                        <div>
                          <strong>Comprovante de lançamento</strong>
                          <small>{receiptTx.description}</small>
                        </div>
                      </div>
                      <div className="worship-email-summary">
                        <div><span>Tipo</span><strong>{receiptTx.type === "income" ? "Receita" : "Despesa"}</strong></div>
                        <div><span>Valor</span><strong style={{ color: receiptTx.type === "income" ? "var(--color-success)" : "var(--color-danger)" }}>{fmtCurrency(receiptTx.amount)}</strong></div>
                        <div><span>Data</span><strong>{new Date(receiptTx.date + "T12:00:00").toLocaleDateString("pt-BR")}</strong></div>
                        <div><span>Forma</span><strong>{paymentLabel(receiptTx.payment_method)}</strong></div>
                      </div>
                      {receiptTx.financial_categories?.name ? (
                        <p style={{ fontSize: "0.85rem", color: "var(--color-neutral-500)" }}>Categoria: {receiptTx.financial_categories.name}</p>
                      ) : null}
                      {receiptTx.members?.name ? (
                        <p style={{ fontSize: "0.85rem", color: "var(--color-neutral-500)" }}>Membro: {receiptTx.members.name}</p>
                      ) : null}
                      {receiptTx.notes ? (
                        <p style={{ fontSize: "0.85rem", color: "var(--color-neutral-500)" }}>Obs: {receiptTx.notes}</p>
                      ) : null}
                      <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setFinancialReceiptTransactionId(null)}>
                          Fechar
                        </button>
                      </div>
                    </section>
                  </div>
                ) : null}

                {/* ── Modal: novo / editar lançamento ── */}
                {isFinancialTransactionFormOpen ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet">
                      <div className="modal-section-header">
                        <DollarSign size={20} />
                        <div>
                          <strong>{financialTransactionForm.id ? "Editar lançamento" : "Novo lançamento"}</strong>
                          <small>Registre uma receita ou despesa da igreja.</small>
                        </div>
                      </div>
                      <form className="modal-body" onSubmit={handleFinancialTransactionSubmit}>
                        <div className="modal-grid">
                          <label>
                            <span>Tipo</span>
                            <select
                              className="catalog-input"
                              value={financialTransactionForm.type}
                              onChange={(e) => setFinancialTransactionForm((c) => ({ ...c, type: e.target.value as "income" | "expense", category_id: "" }))}
                            >
                              <option value="income">Receita</option>
                              <option value="expense">Despesa</option>
                            </select>
                          </label>
                          <label>
                            <span>Valor (R$)</span>
                            <input
                              className="catalog-input"
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="0,00"
                              value={financialTransactionForm.amount}
                              onChange={(e) => setFinancialTransactionForm((c) => ({ ...c, amount: e.target.value }))}
                            />
                          </label>
                        </div>
                        <label>
                          <span>Descrição</span>
                          <input
                            className="catalog-input"
                            placeholder="Ex.: Dízimos - Culto Dominical"
                            value={financialTransactionForm.description}
                            onChange={(e) => setFinancialTransactionForm((c) => ({ ...c, description: e.target.value }))}
                          />
                        </label>
                        <div className="modal-grid">
                          <label>
                            <span>Data</span>
                            <input
                              className="catalog-input"
                              type="date"
                              value={financialTransactionForm.date}
                              onChange={(e) => setFinancialTransactionForm((c) => ({ ...c, date: e.target.value }))}
                            />
                          </label>
                          <label>
                            <span>Forma de pagamento</span>
                            <select
                              className="catalog-input"
                              value={financialTransactionForm.payment_method}
                              onChange={(e) => setFinancialTransactionForm((c) => ({ ...c, payment_method: e.target.value as FinancialTransactionRecord["payment_method"] }))}
                            >
                              <option value="pix">Pix</option>
                              <option value="cash">Dinheiro</option>
                              <option value="transfer">Transferência</option>
                              <option value="card">Cartão</option>
                              <option value="check">Cheque</option>
                              <option value="other">Outro</option>
                            </select>
                          </label>
                        </div>
                        <div className="modal-grid">
                          <label>
                            <span>Categoria</span>
                            <select
                              className="catalog-input"
                              value={financialTransactionForm.category_id}
                              onChange={(e) => setFinancialTransactionForm((c) => ({ ...c, category_id: e.target.value }))}
                            >
                              <option value="">Sem categoria</option>
                              {clientData.financialCategories
                                .filter((cat) => cat.type === financialTransactionForm.type || cat.type === "both")
                                .map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                          </label>
                          <label>
                            <span>Membro (opcional)</span>
                            <select
                              className="catalog-input"
                              value={financialTransactionForm.member_id}
                              onChange={(e) => setFinancialTransactionForm((c) => ({ ...c, member_id: e.target.value }))}
                            >
                              <option value="">Nenhum</option>
                              {clientData.members.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label>
                          <span>Observações</span>
                          <textarea
                            className="catalog-input catalog-textarea"
                            placeholder="Observações opcionais"
                            rows={2}
                            value={financialTransactionForm.notes}
                            onChange={(e) => setFinancialTransactionForm((c) => ({ ...c, notes: e.target.value }))}
                          />
                        </label>
                        <div className="modal-actions">
                          <Button type="button" variant="secondary" onClick={() => setIsFinancialTransactionFormOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={financialSaveStatus === "loading"} icon={<Plus size={16} />}>
                            {financialSaveStatus === "loading" ? "Salvando..." : financialTransactionForm.id ? "Salvar alterações" : "Registrar"}
                          </Button>
                        </div>
                      </form>
                    </section>
                  </div>
                ) : null}

                {/* ── Filtro de período (visível em todas as views) ── */}
                <div className="financial-period-bar">
                  <label>
                    <span>Mês de referência</span>
                    <input
                      className="catalog-input"
                      type="month"
                      value={financialFilterMonth}
                      onChange={(e) => setFinancialFilterMonth(e.target.value)}
                    />
                  </label>
                </div>

                {/* ── DASHBOARD ── */}
                {financialView === "dashboard" ? (
                  <>
                    <div className="reports-kpis reports-kpis--4">
                      {[
                        {
                          label: "Receitas",
                          value: fmtCurrency(incomeThisMonth),
                          sub: `${txThisMonth.filter((t) => t.type === "income").length} lançamento(s)`,
                          color: "#22c55e",
                        },
                        {
                          label: "Despesas",
                          value: fmtCurrency(expenseThisMonth),
                          sub: `${txThisMonth.filter((t) => t.type === "expense").length} lançamento(s)`,
                          color: "#ef4444",
                        },
                        {
                          label: "Saldo",
                          value: fmtCurrency(netThisMonth),
                          sub: netThisMonth >= 0 ? "superávit" : "déficit",
                          color: netThisMonth >= 0 ? "#22c55e" : "#ef4444",
                        },
                        {
                          label: "Total",
                          value: String(txThisMonth.length),
                          sub: "lançamentos no mês",
                          color: "#3b82f6",
                        },
                      ].map(({ label, value, sub, color }) => (
                        <div key={label} className="reports-kpi">
                          <span>{label}</span>
                          <strong style={{ color }}>{value}</strong>
                          <small>{sub}</small>
                        </div>
                      ))}
                    </div>

                    <div className="reports-charts-row" style={{ marginTop: 16 }}>
                      <div className="reports-chart-card">
                        <div className="reports-chart-title">
                          <strong>Por categoria</strong>
                          <div className="financial-donut-toggle">
                            <button
                              type="button"
                              className={financialDashboardDonutType === "income" ? "active" : ""}
                              onClick={() => setFinancialDashboardDonutType("income")}
                            >
                              Receitas
                            </button>
                            <button
                              type="button"
                              className={financialDashboardDonutType === "expense" ? "active" : ""}
                              onClick={() => setFinancialDashboardDonutType("expense")}
                            >
                              Despesas
                            </button>
                          </div>
                        </div>
                        <div className="reports-donut-wrap">
                          <svg viewBox="0 0 152 152" width="152" height="152">
                            {donutTotal === 0
                              ? <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e2e8f0" strokeWidth={18} />
                              : donutPaths.map((seg) => (
                                <circle
                                  key={seg.id}
                                  cx={CX}
                                  cy={CY}
                                  r={R}
                                  fill="none"
                                  stroke={seg.color}
                                  strokeWidth={18}
                                  strokeDasharray={`${seg.dash} ${seg.gap}`}
                                  strokeDashoffset={circ / 4 - seg.offset}
                                  opacity={financialDashboardHoverCategory && financialDashboardHoverCategory !== seg.id ? 0.35 : 1}
                                  onMouseEnter={() => setFinancialDashboardHoverCategory(seg.id)}
                                  onMouseLeave={() => setFinancialDashboardHoverCategory(null)}
                                  onClick={() => {
                                    if (seg.id === "__other__") return;
                                    setFinancialFilterCategoryId(seg.id === "__uncategorized__" ? "" : seg.id);
                                    setFinancialFilterType(financialDashboardDonutType);
                                    setFinancialView("transactions");
                                  }}
                                  style={{ cursor: seg.id === "__other__" ? "default" : "pointer", transition: "opacity .2s ease" }}
                                />
                              ))}
                            <text x={CX} y={CY - 6} textAnchor="middle" fontSize="14" fontWeight="800" fill="#1e293b">
                              {donutTotal > 0 ? fmtCurrency(donutTotal) : "R$ 0,00"}
                            </text>
                            <text x={CX} y={CY + 12} textAnchor="middle" fontSize="10" fill="#64748b">
                              {financialDashboardDonutType === "income" ? "receitas" : "despesas"}
                            </text>
                          </svg>
                          <div className="reports-donut-legend">
                            {donutSegs.length > 0 ? donutSegs.map((seg) => (
                              <button
                                key={seg.id}
                                type="button"
                                className={`reports-legend-item financial-legend-btn ${financialDashboardHoverCategory === seg.id ? "active" : ""}`}
                                onMouseEnter={() => setFinancialDashboardHoverCategory(seg.id)}
                                onMouseLeave={() => setFinancialDashboardHoverCategory(null)}
                                onClick={() => {
                                  if (seg.id === "__other__") return;
                                  setFinancialFilterCategoryId(seg.id === "__uncategorized__" ? "" : seg.id);
                                  setFinancialFilterType(financialDashboardDonutType);
                                  setFinancialView("transactions");
                                }}
                                disabled={seg.id === "__other__"}
                              >
                                <span style={{ background: seg.color }} />
                                <div>
                                  <strong>{fmtCurrency(seg.amount)}</strong>
                                  <small>{seg.name}</small>
                                </div>
                              </button>
                            )) : (
                              <div className="catalog-empty">Sem dados no período.</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="reports-chart-card reports-chart-card--wide">
                        <div className="reports-chart-title">
                          <strong>Evolução — últimos 6 meses</strong>
                          <div className="reports-legend-inline">
                            <span><em style={{ background: "#22c55e" }} />Receita</span>
                            <span><em style={{ background: "#ef4444" }} />Despesa</span>
                          </div>
                        </div>
                        <div className="reports-bar-wrap">
                          <svg viewBox="0 0 480 150" width="100%" height="150" preserveAspectRatio="xMidYMid meet">
                            {financialByMonth.map((m, i) => {
                              const bW = 26, maxH = 110, x = 30 + i * 74;
                              const incH = (m.income / maxFinancial) * maxH;
                              const expH = (m.expense / maxFinancial) * maxH;
                              const isHover = financialDashboardHoverMonth === m.key;
                              const dim = financialDashboardHoverMonth && !isHover;
                              return (
                                <g
                                  key={m.key}
                                  onMouseEnter={() => setFinancialDashboardHoverMonth(m.key)}
                                  onMouseLeave={() => setFinancialDashboardHoverMonth(null)}
                                  onClick={() => setFinancialFilterMonth(m.key)}
                                  style={{ cursor: "pointer" }}
                                >
                                  <rect x={x} y={120 - incH} width={bW} height={Math.max(incH, 2)} fill="#22c55e" rx={3} opacity={dim ? 0.35 : 0.85} style={{ transition: "opacity .2s ease" }} />
                                  <rect x={x + bW + 4} y={120 - expH} width={bW} height={Math.max(expH, 2)} fill="#ef4444" rx={3} opacity={dim ? 0.35 : 0.85} style={{ transition: "opacity .2s ease" }} />
                                  <text x={x + bW} y={136} textAnchor="middle" fontSize="11" fill={isHover ? "#0f172a" : "#64748b"} style={{ transition: "fill .2s ease" }}>{m.label}</text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                        {financialDashboardHoverMonth ? (() => {
                          const m = financialByMonth.find((row) => row.key === financialDashboardHoverMonth) ?? null;
                          if (!m) return null;
                          return (
                            <div className="financial-hover-summary">
                              <span>{m.title}</span>
                              <strong style={{ color: "#22c55e" }}>{fmtCurrency(m.income)}</strong>
                              <strong style={{ color: "#ef4444" }}>{fmtCurrency(m.expense)}</strong>
                            </div>
                          );
                        })() : (
                          <div className="financial-hover-summary">
                            <span>{new Date(financialFilterMonth + "-01").toLocaleString("pt-BR", { month: "long", year: "numeric" })}</span>
                            <strong style={{ color: "#22c55e" }}>{fmtCurrency(incomeThisMonth)}</strong>
                            <strong style={{ color: "#ef4444" }}>{fmtCurrency(expenseThisMonth)}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="panel-heading" style={{ marginTop: "1.5rem" }}>
                      <div><strong>Últimos lançamentos</strong></div>
                      <button type="button" onClick={() => setFinancialView("transactions")}>Ver todos</button>
                    </div>
                    <div className="financial-tx-list">
                      {txThisMonth.length === 0 ? (
                        <div className="catalog-empty">Nenhum lançamento registrado ainda.</div>
                      ) : null}
                      {txThisMonth.slice(0, 10).map((tx) => (
                        <div key={tx.id} className="financial-tx-row">
                          <div className={`financial-tx-type-badge ${tx.type}`}>
                            {tx.type === "income" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          </div>
                          <div className="financial-tx-info">
                            <strong>{tx.description}</strong>
                            <small>
                              {new Date(normalizeTxDate(tx.date) + "T12:00:00").toLocaleDateString("pt-BR")}
                              {tx.financial_categories?.name ? ` · ${tx.financial_categories.name}` : ""}
                              {tx.members?.name ? ` · ${tx.members.name}` : ""}
                            </small>
                          </div>
                          <span className={`financial-tx-amount ${tx.type}`}>
                            {tx.type === "income" ? "+" : "-"}{fmtCurrency(txAmount(tx))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                {/* ── LANÇAMENTOS ── */}
                {financialView === "transactions" ? (
                  <>
                    <div className="member-filters" style={{ marginTop: "1rem" }}>
                      <select
                        className="catalog-input"
                        value={financialFilterType}
                        onChange={(e) => setFinancialFilterType(e.target.value as typeof financialFilterType)}
                      >
                        <option value="all">Receitas e despesas</option>
                        <option value="income">Apenas receitas</option>
                        <option value="expense">Apenas despesas</option>
                      </select>
                      <select
                        className="catalog-input"
                        value={financialFilterCategoryId}
                        onChange={(e) => setFinancialFilterCategoryId(e.target.value)}
                      >
                        <option value="">Todas as categorias</option>
                        {clientData.financialCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="financial-tx-list" style={{ marginTop: "0.5rem" }}>
                      {filteredTx.length === 0 ? (
                        <div className="catalog-empty">Nenhum lançamento encontrado para os filtros informados.</div>
                      ) : null}
                      {filteredTx.map((tx) => (
                        <div key={tx.id} className="financial-tx-row">
                          <div className={`financial-tx-type-badge ${tx.type}`}>
                            {tx.type === "income" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          </div>
                          <div className="financial-tx-info">
                            <strong>{tx.description}</strong>
                            <small>
                              {new Date(normalizeTxDate(tx.date) + "T12:00:00").toLocaleDateString("pt-BR")}
                              {" · "}{paymentLabel(tx.payment_method)}
                              {tx.financial_categories?.name ? ` · ${tx.financial_categories.name}` : ""}
                              {tx.members?.name ? ` · ${tx.members.name}` : ""}
                            </small>
                          </div>
                          <span className={`financial-tx-amount ${tx.type}`}>
                            {tx.type === "income" ? "+" : "-"}{fmtCurrency(txAmount(tx))}
                          </span>
                          {canManageFinancial ? (
                            <div className="member-actions">
                              <button type="button" title="Comprovante" onClick={() => setFinancialReceiptTransactionId(tx.id)}>
                                <Receipt size={14} />
                              </button>
                              <button type="button" title="Editar" onClick={() => openEditFinancialTransaction(tx)}>
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                title="Excluir"
                                onClick={() => {
                                  if (window.confirm(`Excluir "${tx.description}"?`)) void handleDeleteFinancialTransaction(tx.id);
                                }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                {/* ── CATEGORIAS ── */}
                {financialView === "categories" ? (
                  <div className="catalog-grid" style={{ marginTop: "1rem" }}>
                    <section className="catalog-panel">
                      <div className="catalog-header">
                        <strong>Categorias do sistema</strong>
                        <small>Categorias padrão disponíveis para todos os tenants.</small>
                      </div>
                      <div className="catalog-list">
                        {clientData.financialCategories.filter((c) => c.tenant_id === null).map((cat) => (
                          <div key={cat.id} className="catalog-row system">
                            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {cat.color ? <span style={{ width: 12, height: 12, borderRadius: "50%", background: cat.color, display: "inline-block", flexShrink: 0 }} /> : null}
                              {cat.name}
                            </span>
                            <em style={{ fontSize: "0.75rem", color: "var(--color-neutral-500)" }}>
                              {cat.type === "income" ? "Receita" : cat.type === "expense" ? "Despesa" : "Ambos"}
                            </em>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="catalog-panel">
                      <div className="catalog-header">
                        <strong>Categorias do tenant</strong>
                        <small>Categorias personalizadas criadas pela sua igreja.</small>
                      </div>

                      {canManageFinancial ? (
                        <form className="worship-form" onSubmit={handleFinancialCategorySubmit} style={{ marginBottom: "1rem" }}>
                          <div className="modal-grid">
                            <input
                              className="catalog-input"
                              placeholder="Nome da categoria"
                              value={financialCategoryForm.name}
                              onChange={(e) => setFinancialCategoryForm((c) => ({ ...c, name: e.target.value }))}
                            />
                            <select
                              className="catalog-input"
                              value={financialCategoryForm.type}
                              onChange={(e) => setFinancialCategoryForm((c) => ({ ...c, type: e.target.value as FinancialCategoryRecord["type"] }))}
                            >
                              <option value="income">Receita</option>
                              <option value="expense">Despesa</option>
                              <option value="both">Ambos</option>
                            </select>
                          </div>
                          <div className="modal-grid">
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                              Cor:
                              <input
                                type="color"
                                value={financialCategoryForm.color}
                                onChange={(e) => setFinancialCategoryForm((c) => ({ ...c, color: e.target.value }))}
                                style={{ width: 40, height: 32, padding: 2, border: "1px solid var(--color-neutral-200)", borderRadius: 6, cursor: "pointer" }}
                              />
                            </label>
                          </div>
                          <Button type="submit" disabled={financialSaveStatus === "loading"} icon={<Plus size={16} />}>
                            {financialCategoryForm.id ? "Salvar alterações" : "Adicionar categoria"}
                          </Button>
                          {financialCategoryForm.id ? (
                            <Button type="button" variant="secondary" onClick={() => setFinancialCategoryForm(emptyFinancialCategoryForm)}>
                              Cancelar
                            </Button>
                          ) : null}
                        </form>
                      ) : null}

                      <div className="catalog-list">
                        {clientData.financialCategories.filter((c) => c.tenant_id !== null).length === 0 ? (
                          <div className="catalog-empty">Nenhuma categoria personalizada ainda.</div>
                        ) : null}
                        {clientData.financialCategories.filter((c) => c.tenant_id !== null).map((cat) => (
                          <div key={cat.id} className="catalog-row">
                            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {cat.color ? <span style={{ width: 12, height: 12, borderRadius: "50%", background: cat.color, display: "inline-block", flexShrink: 0 }} /> : null}
                              {cat.name}
                            </span>
                            <em style={{ fontSize: "0.75rem", color: "var(--color-neutral-500)" }}>
                              {cat.type === "income" ? "Receita" : cat.type === "expense" ? "Despesa" : "Ambos"}
                            </em>
                            {canManageFinancial ? (
                              <div className="member-actions">
                                <button
                                  type="button"
                                  onClick={() => setFinancialCategoryForm({ id: cat.id, name: cat.name, type: cat.type, color: cat.color ?? "#087C7A" })}
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Excluir categoria "${cat.name}"?`)) void handleDeleteFinancialCategory(cat.id);
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : null}

                {/* ── RELATÓRIOS ── */}
                {financialView === "reports" ? (
                  <div style={{ marginTop: "1rem" }}>
                    <div className="worship-summary financial-summary">
                      <article className="financial-stat income">
                        <TrendingUp size={20} />
                        <div>
                          <span>Total receitas</span>
                          <strong>{fmtCurrency(incomeThisMonth)}</strong>
                        </div>
                      </article>
                      <article className="financial-stat expense">
                        <TrendingDown size={20} />
                        <div>
                          <span>Total despesas</span>
                          <strong>{fmtCurrency(expenseThisMonth)}</strong>
                        </div>
                      </article>
                      <article className={`financial-stat ${netThisMonth >= 0 ? "income" : "expense"}`}>
                        <DollarSign size={20} />
                        <div>
                          <span>Saldo</span>
                          <strong>{fmtCurrency(netThisMonth)}</strong>
                        </div>
                      </article>
                    </div>

                    <div className="panel-heading" style={{ marginTop: "1.5rem" }}>
                      <strong>Por categoria — {new Date(financialFilterMonth + "-01").toLocaleString("pt-BR", { month: "long", year: "numeric" })}</strong>
                      <Button
                        type="button"
                        variant="secondary"
                        icon={<FileText size={15} />}
                        onClick={() =>
                          exportFinancialPdf(
                            tenant.name,
                            new Date(financialFilterMonth + "-01").toLocaleString("pt-BR", { month: "long", year: "numeric" }),
                            incomeThisMonth,
                            expenseThisMonth,
                            netThisMonth,
                            reportByCategory,
                            txThisMonth,
                          )
                        }
                      >
                        Exportar PDF
                      </Button>
                    </div>

                    {reportByCategory.length === 0 ? (
                      <div className="catalog-empty" style={{ marginTop: "1rem" }}>Nenhum lançamento no período selecionado.</div>
                    ) : null}

                    <div className="financial-report-table" style={{ marginTop: "0.75rem" }}>
                      {reportByCategory.map((row) => {
                        const total = row.income + row.expense;
                        const maxAmount = Math.max(...reportByCategory.map((r) => r.income + r.expense), 1);
                        return (
                          <div key={row.name} className="financial-report-row">
                            <div className="financial-report-name">
                              {row.color ? <span className="financial-cat-dot" style={{ background: row.color }} /> : null}
                              <span>{row.name}</span>
                            </div>
                            <div className="financial-report-bar-wrap">
                              <div
                                className="financial-report-bar"
                                style={{ width: `${Math.round((total / maxAmount) * 100)}%`, background: row.color ?? "var(--color-brand-primary)" }}
                              />
                            </div>
                            <div className="financial-report-amounts">
                              {row.income > 0 ? <span className="income">+{fmtCurrency(row.income)}</span> : null}
                              {row.expense > 0 ? <span className="expense">-{fmtCurrency(row.expense)}</span> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })() : null}

          {activeTab === "bible-school" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Escola Bíblica</span>
                  <h4>Turmas, aulas, presença e materiais</h4>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {canManageBibleSchool ? (
                    <>
                      <Button type="button" variant="secondary" onClick={openBibleSchoolCreateClassForm} icon={<Plus size={16} />}>
                        Nova turma
                      </Button>
                      <Button type="button" variant="secondary" onClick={openBibleSchoolStudentForm} icon={<UserPlus size={16} />}>
                        Matricular aluno
                      </Button>
                      <Button type="button" variant="secondary" onClick={openBibleSchoolSessionForm} icon={<CalendarCheck size={16} />}>
                        Nova aula
                      </Button>
                      <Button type="button" variant="secondary" onClick={openBibleSchoolMaterialForm} icon={<Plus size={16} />}>
                        Novo material
                      </Button>
                      <Button type="button" variant="secondary" onClick={openBibleSchoolGradeForm} icon={<Plus size={16} />}>
                        Nova nota
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => openPushComposer("bible-school")} icon={<Bell size={16} />}>
                        Enviar push
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {bibleSchoolMessage ? <p className={`login-feedback ${bibleSchoolStatus === "error" ? "error" : "success"}`}>{bibleSchoolMessage}</p> : null}

              {bibleSchoolStatus === "loading" ? (
                <div className="catalog-empty" style={{ marginTop: 12 }}>
                  Carregando Escola Bíblica...
                </div>
              ) : null}

              <div className="modal-grid" style={{ marginTop: 12 }}>
                <label>
                  <span>Turma selecionada</span>
                  <select
                    value={selectedBibleSchoolClassId ?? ""}
                    onChange={(e) => setSelectedBibleSchoolClassId(e.target.value || null)}
                  >
                    <option value="">Selecione</option>
                    {bibleSchoolClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedBibleSchoolClassId ? (
                <div className="dashboard-grid" style={{ marginTop: 16, gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)" }}>
                  <article className="panel" style={{ padding: 16 }}>
                    <div className="panel-heading">
                      <div>
                        <span>Turmas</span>
                        <h4>Cadastro e professores</h4>
                      </div>
                    </div>

                    {bibleSchoolClasses.length === 0 ? (
                      <div className="catalog-empty">Nenhuma turma cadastrada.</div>
                    ) : (
                      <div className="catalog-list" style={{ marginTop: 12 }}>
                        {bibleSchoolClasses.map((cls) => {
                          const isSelected = cls.id === selectedBibleSchoolClassId;
                          const teacherNames = bibleSchoolClassTeachers
                            .filter((row) => row.class_id === cls.id)
                            .map((row) => row.bible_school_teachers?.members?.name)
                            .filter(Boolean)
                            .slice(0, 3)
                            .join(", ");
                          return (
                            <div
                              key={cls.id}
                              className="catalog-row"
                              style={{ cursor: "pointer", borderColor: isSelected ? "var(--color-brand-accent)" : undefined }}
                              onClick={() => setSelectedBibleSchoolClassId(cls.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") setSelectedBibleSchoolClassId(cls.id);
                              }}
                            >
                              <div style={{ display: "grid", gap: 4 }}>
                                <strong style={{ fontSize: "0.95rem" }}>{cls.name}</strong>
                                <small style={{ color: "var(--color-neutral-500)" }}>
                                  {teacherNames ? `Professores: ${teacherNames}` : "Sem professores vinculados"}
                                </small>
                              </div>
                              <div className="member-actions">
                                {canManageBibleSchool ? (
                                  <button type="button" onClick={() => openBibleSchoolEditClassForm(cls)} aria-label="Editar turma">
                                    <Edit3 size={14} />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>

                  <article className="panel" style={{ padding: 16 }}>
                    <div className="panel-heading">
                      <div>
                        <span>Matrículas</span>
                        <h4>Alunos da turma</h4>
                      </div>
                    </div>

                    {bibleSchoolEnrollments.length === 0 ? (
                      <div className="catalog-empty" style={{ marginTop: 12 }}>
                        Nenhum aluno matriculado ainda.
                      </div>
                    ) : (
                      <div className="member-list" style={{ marginTop: 12 }}>
                        {bibleSchoolEnrollments.map((row) => (
                          <div key={row.id} className="member-row">
                            <span>{(row.bible_school_students?.name ?? "A").slice(0, 1).toUpperCase()}</span>
                            <div>
                              <strong>{row.bible_school_students?.name ?? "Aluno"}</strong>
                              <small style={{ color: "var(--color-neutral-500)" }}>
                                {row.bible_school_students?.member_id ? "Vinculado ao cadastro de membro" : "Cadastro avulso"}
                              </small>
                            </div>
                            <em className={row.status === "active" ? "success" : "warning"}>{row.status}</em>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className="panel full-width" style={{ padding: 16 }}>
                    <div className="panel-heading">
                      <div>
                        <span>Aulas e presença</span>
                        <h4>Registro por data</h4>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: "0.78rem", color: "var(--color-neutral-600)" }}>Aula</span>
                          <select
                            value={selectedBibleSchoolSessionId ?? ""}
                            onChange={(e) => setSelectedBibleSchoolSessionId(e.target.value || null)}
                          >
                            <option value="">Selecione</option>
                            {bibleSchoolSessions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {new Date(`${s.session_date}T12:00:00`).toLocaleDateString("pt-BR")} {s.topic ? `· ${s.topic}` : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>

                    {bibleSchoolSessions.length === 0 ? (
                      <div className="catalog-empty" style={{ marginTop: 12 }}>
                        Nenhuma aula cadastrada.
                      </div>
                    ) : null}

                    {selectedBibleSchoolSessionId ? (
                      <div className="catalog-list" style={{ marginTop: 12 }}>
                        {bibleSchoolEnrollments.map((enrollment) => {
                          const studentName = enrollment.bible_school_students?.name ?? "Aluno";
                          const attendance = bibleSchoolAttendance.find((a) => a.enrollment_id === enrollment.id) ?? null;
                          const value = attendance?.status ?? "present";
                          return (
                            <div key={enrollment.id} className="catalog-row">
                              <div style={{ display: "grid", gap: 4 }}>
                                <strong style={{ fontSize: "0.95rem" }}>{studentName}</strong>
                                <small style={{ color: "var(--color-neutral-500)" }}>{attendance ? "Registrado" : "Sem registro"}</small>
                              </div>
                              <select
                                value={value}
                                onChange={(e) => void upsertBibleSchoolAttendance(enrollment.id, e.target.value as BibleSchoolAttendanceRecord["status"])}
                                disabled={!canManageBibleSchool || bibleSchoolStatus === "loading"}
                              >
                                <option value="present">Presente</option>
                                <option value="absent">Faltou</option>
                                <option value="excused">Justificado</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>

                  <article className="panel full-width" style={{ padding: 16 }}>
                    <div className="panel-heading">
                      <div>
                        <span>Materiais</span>
                        <h4>Links e conteúdos</h4>
                      </div>
                    </div>

                    {bibleSchoolMaterials.length === 0 ? (
                      <div className="catalog-empty" style={{ marginTop: 12 }}>
                        Nenhum material cadastrado.
                      </div>
                    ) : (
                      <div className="catalog-list" style={{ marginTop: 12 }}>
                        {bibleSchoolMaterials.map((mat) => (
                          <div key={mat.id} className="catalog-row">
                            <div style={{ display: "grid", gap: 4 }}>
                              <strong style={{ fontSize: "0.95rem" }}>{mat.title}</strong>
                              <small style={{ color: "var(--color-neutral-500)" }}>
                                {mat.kind === "link" ? "Link" : mat.kind === "file" ? "Arquivo" : "Texto"}
                                {mat.url ? ` · ${mat.url}` : ""}
                              </small>
                            </div>
                            {mat.kind === "link" && mat.url ? (
                              <a className="preview-link" href={mat.url} target="_blank" rel="noreferrer">
                                Abrir
                              </a>
                            ) : mat.kind === "file" && mat.url ? (
                              <button type="button" className="preview-link" onClick={() => void openBibleSchoolMaterial(mat)}>
                                Baixar
                              </button>
                            ) : (
                              <span style={{ color: "var(--color-neutral-500)", fontSize: "0.85rem" }}>—</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className="panel full-width" style={{ padding: 16 }}>
                    <div className="panel-heading">
                      <div>
                        <span>Notas</span>
                        <h4>Avaliações e lançamentos</h4>
                      </div>
                      {bibleSchoolGrades.length > 0 || bibleSchoolAttendance.length > 0 ? (
                        <Button
                          type="button"
                          variant="secondary"
                          icon={<FileText size={15} />}
                          onClick={() => {
                            const cls = bibleSchoolClasses.find((c) => c.id === selectedBibleSchoolClassId);
                            exportBibleSchoolPdf(
                              tenant.name,
                              cls?.name ?? "Turma",
                              bibleSchoolEnrollments,
                              bibleSchoolSessions,
                              bibleSchoolAttendance,
                              bibleSchoolGrades,
                            );
                          }}
                        >
                          Exportar PDF
                        </Button>
                      ) : null}
                    </div>

                    {bibleSchoolGrades.length === 0 ? (
                      <div className="catalog-empty" style={{ marginTop: 12 }}>
                        Nenhuma nota lançada ainda.
                      </div>
                    ) : (
                      <div className="catalog-list" style={{ marginTop: 12 }}>
                        {bibleSchoolGrades.slice(0, 20).map((grade) => {
                          const enrollment = bibleSchoolEnrollments.find((row) => row.id === grade.enrollment_id) ?? null;
                          const studentName = enrollment?.bible_school_students?.name ?? "Aluno";
                          const scoreLabel =
                            grade.score === null && grade.max_score === null
                              ? "—"
                              : grade.max_score === null
                                ? `${grade.score ?? "—"}`
                                : `${grade.score ?? "—"} / ${grade.max_score ?? "—"}`;
                          return (
                            <div key={grade.id} className="catalog-row">
                              <div style={{ display: "grid", gap: 4 }}>
                                <strong style={{ fontSize: "0.95rem" }}>{grade.title}</strong>
                                <small style={{ color: "var(--color-neutral-500)" }}>
                                  {studentName} · {new Date(grade.created_at).toLocaleString("pt-BR")}
                                </small>
                              </div>
                              <span style={{ fontWeight: 700 }}>{scoreLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </article>
                </div>
              ) : (
                <div className="catalog-empty" style={{ marginTop: 12 }}>
                  Selecione uma turma para ver detalhes.
                </div>
              )}

              {isBibleSchoolClassFormOpen ? (
                <div className="modal-backdrop">
                  <section className="modal-sheet">
                    <div className="modal-section-header">
                      <strong>{bibleSchoolClassForm.id ? "Editar turma" : "Nova turma"}</strong>
                      <button type="button" onClick={() => setIsBibleSchoolClassFormOpen(false)} aria-label="Fechar">
                        <X size={18} />
                      </button>
                    </div>
                    <form className="tenant-form" onSubmit={handleBibleSchoolClassSubmit}>
                      <label>
                        <span>Nome</span>
                        <input
                          value={bibleSchoolClassForm.name}
                          onChange={(e) => setBibleSchoolClassForm((c) => ({ ...c, name: e.target.value }))}
                          placeholder="Ex.: 1º Trimestre 2026"
                        />
                      </label>
                      <label>
                        <span>Descrição</span>
                        <input
                          value={bibleSchoolClassForm.description}
                          onChange={(e) => setBibleSchoolClassForm((c) => ({ ...c, description: e.target.value }))}
                          placeholder="Opcional"
                        />
                      </label>
                      <label>
                        <span>Início</span>
                        <input
                          type="date"
                          value={bibleSchoolClassForm.starts_at}
                          onChange={(e) => setBibleSchoolClassForm((c) => ({ ...c, starts_at: e.target.value }))}
                        />
                      </label>
                      <label>
                        <span>Fim</span>
                        <input
                          type="date"
                          value={bibleSchoolClassForm.ends_at}
                          onChange={(e) => setBibleSchoolClassForm((c) => ({ ...c, ends_at: e.target.value }))}
                        />
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                        <input
                          type="checkbox"
                          checked={bibleSchoolClassForm.is_active}
                          onChange={(e) => setBibleSchoolClassForm((c) => ({ ...c, is_active: e.target.checked }))}
                        />
                        <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Turma ativa</span>
                      </label>
                      <label style={{ gridColumn: "span 2" }}>
                        <span>Professores (membros)</span>
                        <select
                          multiple
                          value={bibleSchoolClassForm.teacherMemberIds}
                          onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                            setBibleSchoolClassForm((c) => ({ ...c, teacherMemberIds: values }));
                          }}
                          style={{ minHeight: 140 }}
                        >
                          {clientData.members
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="tenant-form-actions">
                        <Button type="submit" disabled={bibleSchoolStatus === "loading"} icon={<Plus size={16} />}>
                          {bibleSchoolStatus === "loading" ? "Salvando..." : "Salvar"}
                        </Button>
                        <button className="secondary-action" type="button" onClick={() => setIsBibleSchoolClassFormOpen(false)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              ) : null}

              {isBibleSchoolStudentFormOpen ? (
                <div className="modal-backdrop">
                  <section className="modal-sheet">
                    <div className="modal-section-header">
                      <strong>Matricular aluno</strong>
                      <button type="button" onClick={() => setIsBibleSchoolStudentFormOpen(false)} aria-label="Fechar">
                        <X size={18} />
                      </button>
                    </div>
                    <form className="tenant-form" onSubmit={handleBibleSchoolStudentSubmit}>
                      <label>
                        <span>Vincular a membro (opcional)</span>
                        <select
                          value={bibleSchoolStudentForm.member_id}
                          onChange={(e) => setBibleSchoolStudentForm((c) => ({ ...c, member_id: e.target.value }))}
                        >
                          <option value="">Sem vínculo</option>
                          {clientData.members
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        <span>Nome</span>
                        <input
                          value={bibleSchoolStudentForm.name}
                          onChange={(e) => setBibleSchoolStudentForm((c) => ({ ...c, name: e.target.value }))}
                          placeholder="Obrigatório se não vincular"
                        />
                      </label>
                      <label>
                        <span>E-mail</span>
                        <input
                          value={bibleSchoolStudentForm.email}
                          onChange={(e) => setBibleSchoolStudentForm((c) => ({ ...c, email: e.target.value }))}
                          placeholder="Opcional"
                        />
                      </label>
                      <label>
                        <span>Telefone</span>
                        <input
                          value={bibleSchoolStudentForm.phone}
                          onChange={(e) => setBibleSchoolStudentForm((c) => ({ ...c, phone: e.target.value }))}
                          placeholder="Opcional"
                        />
                      </label>
                      <label style={{ gridColumn: "span 2" }}>
                        <span>Observações</span>
                        <input
                          value={bibleSchoolStudentForm.notes}
                          onChange={(e) => setBibleSchoolStudentForm((c) => ({ ...c, notes: e.target.value }))}
                          placeholder="Opcional"
                        />
                      </label>
                      <div className="tenant-form-actions">
                        <Button type="submit" disabled={bibleSchoolStatus === "loading"} icon={<Plus size={16} />}>
                          {bibleSchoolStatus === "loading" ? "Salvando..." : "Matricular"}
                        </Button>
                        <button className="secondary-action" type="button" onClick={() => setIsBibleSchoolStudentFormOpen(false)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              ) : null}

              {isBibleSchoolSessionFormOpen ? (
                <div className="modal-backdrop">
                  <section className="modal-sheet">
                    <div className="modal-section-header">
                      <strong>Nova aula</strong>
                      <button type="button" onClick={() => setIsBibleSchoolSessionFormOpen(false)} aria-label="Fechar">
                        <X size={18} />
                      </button>
                    </div>
                    <form className="tenant-form" onSubmit={handleBibleSchoolSessionSubmit}>
                      <label>
                        <span>Data</span>
                        <input
                          type="date"
                          value={bibleSchoolSessionForm.session_date}
                          onChange={(e) => setBibleSchoolSessionForm((c) => ({ ...c, session_date: e.target.value }))}
                        />
                      </label>
                      <label>
                        <span>Tema</span>
                        <input
                          value={bibleSchoolSessionForm.topic}
                          onChange={(e) => setBibleSchoolSessionForm((c) => ({ ...c, topic: e.target.value }))}
                          placeholder="Opcional"
                        />
                      </label>
                      <label style={{ gridColumn: "span 2" }}>
                        <span>Notas</span>
                        <input
                          value={bibleSchoolSessionForm.notes}
                          onChange={(e) => setBibleSchoolSessionForm((c) => ({ ...c, notes: e.target.value }))}
                          placeholder="Opcional"
                        />
                      </label>
                      <div className="tenant-form-actions">
                        <Button type="submit" disabled={bibleSchoolStatus === "loading"} icon={<Plus size={16} />}>
                          {bibleSchoolStatus === "loading" ? "Salvando..." : "Salvar"}
                        </Button>
                        <button className="secondary-action" type="button" onClick={() => setIsBibleSchoolSessionFormOpen(false)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              ) : null}

              {isBibleSchoolMaterialFormOpen ? (
                <div className="modal-backdrop">
                  <section className="modal-sheet">
                    <div className="modal-section-header">
                      <strong>Novo material</strong>
                      <button type="button" onClick={() => setIsBibleSchoolMaterialFormOpen(false)} aria-label="Fechar">
                        <X size={18} />
                      </button>
                    </div>
                    <form className="tenant-form" onSubmit={handleBibleSchoolMaterialSubmit}>
                      <label>
                        <span>Título</span>
                        <input
                          value={bibleSchoolMaterialForm.title}
                          onChange={(e) => setBibleSchoolMaterialForm((c) => ({ ...c, title: e.target.value }))}
                          placeholder="Ex.: Apostila aula 1"
                        />
                      </label>
                      <label>
                        <span>Tipo</span>
                        <select
                          value={bibleSchoolMaterialForm.kind}
                          onChange={(e) => setBibleSchoolMaterialForm((c) => ({ ...c, kind: e.target.value as BibleSchoolMaterialFormState["kind"] }))}
                        >
                          <option value="link">Link</option>
                          <option value="text">Texto</option>
                          <option value="file">Arquivo</option>
                        </select>
                      </label>
                      {bibleSchoolMaterialForm.kind === "link" ? (
                        <label style={{ gridColumn: "span 2" }}>
                          <span>URL</span>
                          <input
                            value={bibleSchoolMaterialForm.url}
                            onChange={(e) => setBibleSchoolMaterialForm((c) => ({ ...c, url: e.target.value }))}
                            placeholder="https://..."
                          />
                        </label>
                      ) : bibleSchoolMaterialForm.kind === "file" ? (
                        <label style={{ gridColumn: "span 2" }}>
                          <span>Arquivo</span>
                          <input
                            type="file"
                            onChange={(e) => setBibleSchoolMaterialForm((c) => ({ ...c, file: e.target.files?.[0] ?? null }))}
                            required
                          />
                        </label>
                      ) : (
                        <label style={{ gridColumn: "span 2" }}>
                          <span>Conteúdo</span>
                          <input
                            value={bibleSchoolMaterialForm.content}
                            onChange={(e) => setBibleSchoolMaterialForm((c) => ({ ...c, content: e.target.value }))}
                            placeholder="Texto do material"
                          />
                        </label>
                      )}
                      <div className="tenant-form-actions">
                        <Button type="submit" disabled={bibleSchoolStatus === "loading"} icon={<Plus size={16} />}>
                          {bibleSchoolStatus === "loading" ? "Salvando..." : "Salvar"}
                        </Button>
                        <button className="secondary-action" type="button" onClick={() => setIsBibleSchoolMaterialFormOpen(false)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              ) : null}

              {isBibleSchoolGradeFormOpen ? (
                <div className="modal-backdrop">
                  <section className="modal-sheet">
                    <div className="modal-section-header">
                      <strong>Nova nota</strong>
                      <button type="button" onClick={() => setIsBibleSchoolGradeFormOpen(false)} aria-label="Fechar">
                        <X size={18} />
                      </button>
                    </div>
                    <form className="tenant-form" onSubmit={handleBibleSchoolGradeSubmit}>
                      <label style={{ gridColumn: "span 2" }}>
                        <span>Aluno (matrícula)</span>
                        <select
                          value={bibleSchoolGradeForm.enrollment_id}
                          onChange={(e) => setBibleSchoolGradeForm((c) => ({ ...c, enrollment_id: e.target.value }))}
                        >
                          <option value="">Selecione</option>
                          {bibleSchoolEnrollments.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.bible_school_students?.name ?? "Aluno"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ gridColumn: "span 2" }}>
                        <span>Título</span>
                        <input
                          value={bibleSchoolGradeForm.title}
                          onChange={(e) => setBibleSchoolGradeForm((c) => ({ ...c, title: e.target.value }))}
                          placeholder="Ex.: Prova 1"
                        />
                      </label>
                      <label>
                        <span>Nota</span>
                        <input
                          value={bibleSchoolGradeForm.score}
                          onChange={(e) => setBibleSchoolGradeForm((c) => ({ ...c, score: e.target.value }))}
                          placeholder="Ex.: 8,5"
                        />
                      </label>
                      <label>
                        <span>Nota máxima</span>
                        <input
                          value={bibleSchoolGradeForm.max_score}
                          onChange={(e) => setBibleSchoolGradeForm((c) => ({ ...c, max_score: e.target.value }))}
                          placeholder="Ex.: 10"
                        />
                      </label>
                      <label style={{ gridColumn: "span 2" }}>
                        <span>Observações</span>
                        <input
                          value={bibleSchoolGradeForm.notes}
                          onChange={(e) => setBibleSchoolGradeForm((c) => ({ ...c, notes: e.target.value }))}
                          placeholder="Opcional"
                        />
                      </label>
                      <div className="tenant-form-actions">
                        <Button type="submit" disabled={bibleSchoolStatus === "loading"} icon={<Plus size={16} />}>
                          {bibleSchoolStatus === "loading" ? "Salvando..." : "Salvar"}
                        </Button>
                        <button className="secondary-action" type="button" onClick={() => setIsBibleSchoolGradeFormOpen(false)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              ) : null}
            </article>
          ) : null}

          {activeTab === "kids" ? (() => {
            const allChildren = clientData.kidsChildren;
            const allGroups = clientData.kidsGroups;
            const allSchedule = clientData.kidsTeacherSchedule;
            const allAttendance = clientData.kidsAttendance;
            const allActivities = clientData.kidsActivities;
            const allComms = clientData.kidsCommunications;

            const filteredChildren = kidsFilterGroupId
              ? allChildren.filter((c) => c.group_id === kidsFilterGroupId)
              : allChildren;

            const todaySchedule = allSchedule.filter((s) => s.schedule_date === kidsAttendanceDate);
            const todayAttendance = allAttendance.filter((a) => a.attendance_date === kidsAttendanceDate);

            const groupNameById = allGroups.reduce<Record<string, string>>((acc, g) => { acc[g.id] = g.name; return acc; }, {});

            const relationshipLabel = (r: KidsGuardianRecord["relationship"]) => {
              const map: Record<string, string> = { parent: "Pai/Mãe", grandparent: "Avô/Avó", sibling: "Irmão/Irmã", guardian: "Responsável", other: "Outro" };
              return map[r] ?? r;
            };

            const sentViaLabel = (v: KidsCommunicationRecord["sent_via"]) => {
              const map: Record<string, string> = { system: "Sistema", whatsapp: "WhatsApp", both: "Sistema + WhatsApp" };
              return map[v] ?? v;
            };

            const normalizeWhatsappPhone = (phone: string | null) => {
              const digits = phone?.replace(/\D/g, "") ?? "";
              if (!digits) return "";
              return digits.startsWith("55") ? digits : `55${digits}`;
            };

            const communicationWhatsappLinks = (comm: KidsCommunicationRecord) => {
              if (comm.sent_via === "system") return [];
              const guardians = comm.child_id
                ? clientData.kidsGuardiansByChildId[comm.child_id] ?? []
                : Object.values(clientData.kidsGuardiansByChildId).flat();
              const message = encodeURIComponent(comm.message);
              return guardians
                .map((guardian) => ({ guardian, phone: normalizeWhatsappPhone(guardian.phone) }))
                .filter((item) => item.phone)
                .map((item) => ({
                  id: item.guardian.id,
                  name: item.guardian.name,
                  href: `https://wa.me/${item.phone}?text=${message}`,
                }));
            };

            const calcAge = (dob: string | null) => {
              if (!dob) return null;
              const birth = new Date(dob + "T12:00:00");
              const now = new Date();
              let age = now.getFullYear() - birth.getFullYear();
              if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
              return age;
            };

            const selectedChild = kidsSelectedChildId ? allChildren.find((c) => c.id === kidsSelectedChildId) : null;
            const selectedChildGuardians = kidsSelectedChildId ? (clientData.kidsGuardiansByChildId[kidsSelectedChildId] ?? []) : [];

            return (
              <article className="panel full-width financial-panel">
                <div className="panel-heading">
                  <div>
                    <span>Kids / Infantil</span>
                    <h4>Gestão do ministério infantil</h4>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <div className="worship-view-toggle">
                      {(["dashboard", "children", "schedule", "attendance", "activities", "communications"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          className={kidsView === v ? "active" : ""}
                          onClick={() => setKidsView(v)}
                        >
                          {v === "dashboard" ? "Visão geral" : v === "children" ? "Crianças" : v === "schedule" ? "Escala" : v === "attendance" ? "Presença" : v === "activities" ? "Atividades" : "Comunicados"}
                        </button>
                      ))}
                    </div>
                    {canManageKids ? (
                      <Button type="button" variant="secondary" icon={<Bell size={16} />} onClick={() => openPushComposer("kids")}>
                        Enviar push
                      </Button>
                    ) : null}
                  </div>
                </div>

                {kidsSaveMessage ? (
                  <p className={`login-feedback ${kidsSaveStatus}`}>{kidsSaveMessage}</p>
                ) : null}

                {/* ── Modal: turma ── */}
                {isKidsGroupFormOpen ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet">
                      <div className="modal-section-header">
                        <Baby size={20} />
                        <div>
                          <strong>{kidsGroupForm.id ? "Editar turma" : "Nova turma"}</strong>
                          <small>Defina nome, faixa etária e cor da turma.</small>
                        </div>
                      </div>
                      <form className="modal-body" onSubmit={handleKidsGroupSubmit}>
                        <label>
                          <span>Nome da turma</span>
                          <input className="catalog-input" required placeholder="Ex.: Berçário, Maternal, Primários" value={kidsGroupForm.name} onChange={(e) => setKidsGroupForm((c) => ({ ...c, name: e.target.value }))} />
                        </label>
                        <label>
                          <span>Descrição</span>
                          <input className="catalog-input" placeholder="Descrição opcional" value={kidsGroupForm.description} onChange={(e) => setKidsGroupForm((c) => ({ ...c, description: e.target.value }))} />
                        </label>
                        <div className="modal-grid">
                          <label>
                            <span>Idade mínima</span>
                            <input className="catalog-input" type="number" min="0" max="18" placeholder="0" value={kidsGroupForm.age_min} onChange={(e) => setKidsGroupForm((c) => ({ ...c, age_min: e.target.value }))} />
                          </label>
                          <label>
                            <span>Idade máxima</span>
                            <input className="catalog-input" type="number" min="0" max="18" placeholder="12" value={kidsGroupForm.age_max} onChange={(e) => setKidsGroupForm((c) => ({ ...c, age_max: e.target.value }))} />
                          </label>
                        </div>
                        <label>
                          <span>Cor da turma</span>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <input type="color" value={kidsGroupForm.color} onChange={(e) => setKidsGroupForm((c) => ({ ...c, color: e.target.value }))} style={{ width: 40, height: 32, border: "none", cursor: "pointer", borderRadius: 4 }} />
                            <input className="catalog-input" value={kidsGroupForm.color} onChange={(e) => setKidsGroupForm((c) => ({ ...c, color: e.target.value }))} style={{ flex: 1 }} />
                          </div>
                        </label>
                        <div className="modal-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => { setIsKidsGroupFormOpen(false); setKidsGroupForm(emptyKidsGroupForm); }}>Cancelar</button>
                          <Button type="submit" disabled={kidsSaveStatus === "loading"} icon={<Plus size={16} />}>{kidsSaveStatus === "loading" ? "Salvando..." : kidsGroupForm.id ? "Salvar" : "Criar turma"}</Button>
                        </div>
                      </form>
                    </section>
                  </div>
                ) : null}

                {/* ── Modal: criança ── */}
                {isKidsChildFormOpen ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet">
                      <div className="modal-section-header">
                        <Baby size={20} />
                        <div>
                          <strong>{kidsChildForm.id ? "Editar criança" : "Cadastrar criança"}</strong>
                          <small>
                            Dica: se os pais já são membros, você pode vincular o cadastro da criança ao membro responsável usando o campo abaixo.
                          </small>
                        </div>
                      </div>
                      <form className="modal-body" onSubmit={handleKidsChildSubmit}>
                        {(() => {
                          const calcAgeLocal = (dob: string | null) => {
                            if (!dob) return null;
                            const birth = new Date(dob + "T12:00:00");
                            const now = new Date();
                            let age = now.getFullYear() - birth.getFullYear();
                            if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
                            return age;
                          };
                          const alreadyKidsIds = new Set(clientData.kidsChildren.map((ch) => ch.member_id).filter(Boolean));
                          // Members under 13
                          const memberCandidates = clientData.members
                            .filter((m) => {
                              if (!m.date_of_birth) return false;
                              const age = calcAgeLocal(m.date_of_birth);
                              return age !== null && age < 13;
                            })
                            .map((m) => ({ id: m.id, name: m.name, date_of_birth: m.date_of_birth!, member_id: m.id as string | null, source: "member" as const }));
                          // Build a lookup: dep.id → family's primary member_id
                          const depIdToFamilyPrimaryMemberId: Record<string, string | null> = {};
                          Object.values(clientData.familyMembersByFamilyId).forEach((members) => {
                            const primary = members.find((m) => m.is_primary && m.member_id) ?? members.find((m) => m.member_id);
                            members.forEach((dep) => {
                              if (!dep.member_id) {
                                depIdToFamilyPrimaryMemberId[dep.id] = primary?.member_id ?? null;
                              }
                            });
                          });
                          // Family dependents under 13 (no member account)
                          const familyDepCandidates = Object.values(clientData.familyMembersByFamilyId)
                            .flat()
                            .filter((dep) => {
                              if (!dep.date_of_birth) return false;
                              if (dep.member_id) return false; // already covered by memberCandidates
                              const age = calcAgeLocal(dep.date_of_birth);
                              return age !== null && age < 13;
                            })
                            .map((dep) => ({
                              id: dep.id,
                              name: dep.name,
                              date_of_birth: dep.date_of_birth!,
                              member_id: depIdToFamilyPrimaryMemberId[dep.id] ?? null,
                              source: "family" as const,
                            }));
                          // Merge, deduplicate by name+dob
                          const seenKeys = new Set<string>();
                          const childCandidates = [...memberCandidates, ...familyDepCandidates].filter((c) => {
                            const key = `${c.name}|${c.date_of_birth}`;
                            if (seenKeys.has(key)) return false;
                            seenKeys.add(key);
                            return true;
                          });
                          const searchLower = kidsChildSearch.toLowerCase();
                          const filtered = kidsChildSearch
                            ? childCandidates.filter((m) => m.name.toLowerCase().includes(searchLower))
                            : childCandidates;
                          return (
                            <div className="kids-picker-section">
                              <div className="kids-picker-header">
                                <strong>Buscar da lista</strong>
                                <small>Membros e dependentes com menos de 13 anos</small>
                              </div>
                              <input
                                className="catalog-input"
                                placeholder="Pesquisar por nome..."
                                value={kidsChildSearch}
                                onChange={(e) => setKidsChildSearch(e.target.value)}
                              />
                              {filtered.length > 0 ? (
                                <div className="kids-picker-list">
                                  {filtered.map((cand) => {
                                    const age = calcAgeLocal(cand.date_of_birth);
                                    const registered = cand.member_id ? alreadyKidsIds.has(cand.member_id) : false;
                                    return (
                                      <button
                                        key={cand.id}
                                        type="button"
                                        className={`kids-picker-item${registered ? " registered" : ""}`}
                                        onClick={() => {
                                          setKidsChildForm((c) => ({
                                            ...c,
                                            name: cand.name,
                                            date_of_birth: cand.date_of_birth,
                                            member_id: cand.member_id ?? "",
                                          }));
                                          setKidsChildSearch("");
                                        }}
                                      >
                                        <span>{cand.name}</span>
                                        <small>
                                          {age !== null ? `${age} ano${age !== 1 ? "s" : ""}` : ""}
                                          {cand.source === "family" ? " · familiar" : ""}
                                          {registered ? " · já cadastrado" : ""}
                                        </small>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : kidsChildSearch ? (
                                <p className="kids-picker-empty">Nenhum resultado para "{kidsChildSearch}"</p>
                              ) : (
                                <p className="kids-picker-empty">Nenhum dependente com menos de 13 anos cadastrado.</p>
                              )}
                            </div>
                          );
                        })()}
                        <label>
                          <span>Nome completo</span>
                          <input className="catalog-input" required placeholder="Nome da criança" value={kidsChildForm.name} onChange={(e) => setKidsChildForm((c) => ({ ...c, name: e.target.value }))} />
                        </label>
                        <div className="modal-grid">
                          <label>
                            <span>Data de nascimento</span>
                            <input className="catalog-input" type="date" value={kidsChildForm.date_of_birth} onChange={(e) => setKidsChildForm((c) => ({ ...c, date_of_birth: e.target.value }))} />
                          </label>
                          <label>
                            <span>Turma</span>
                            <select className="catalog-input" value={kidsChildForm.group_id} onChange={(e) => setKidsChildForm((c) => ({ ...c, group_id: e.target.value }))}>
                              <option value="">Sem turma</option>
                              {allGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          </label>
                        </div>
                        <label>
                          <span>Vincular a membro (opcional)</span>
                          <select className="catalog-input" value={kidsChildForm.member_id} onChange={(e) => setKidsChildForm((c) => ({ ...c, member_id: e.target.value }))}>
                            <option value="">Nenhum vínculo</option>
                            {clientData.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>Alergias</span>
                          <input className="catalog-input" placeholder="Ex.: amendoim, látex" value={kidsChildForm.allergies} onChange={(e) => setKidsChildForm((c) => ({ ...c, allergies: e.target.value }))} />
                        </label>
                        <label>
                          <span>Necessidades especiais</span>
                          <input className="catalog-input" placeholder="Descreva se houver" value={kidsChildForm.special_needs} onChange={(e) => setKidsChildForm((c) => ({ ...c, special_needs: e.target.value }))} />
                        </label>
                        <label>
                          <span>Observações</span>
                          <textarea className="catalog-input catalog-textarea" rows={2} value={kidsChildForm.notes} onChange={(e) => setKidsChildForm((c) => ({ ...c, notes: e.target.value }))} />
                        </label>
                        <div className="modal-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => { setIsKidsChildFormOpen(false); setKidsChildForm(emptyKidsChildForm); setKidsChildSearch(""); }}>Cancelar</button>
                          <Button type="submit" disabled={kidsSaveStatus === "loading"} icon={<Plus size={16} />}>{kidsSaveStatus === "loading" ? "Salvando..." : kidsChildForm.id ? "Salvar" : "Cadastrar"}</Button>
                        </div>
                      </form>
                    </section>
                  </div>
                ) : null}

                {/* ── Modal: responsável ── */}
                {isKidsGuardianFormOpen ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet">
                      <div className="modal-section-header">
                        <Users2 size={20} />
                        <div>
                          <strong>{kidsGuardianForm.id ? "Editar responsável" : "Adicionar responsável"}</strong>
                          <small>Informe os dados de quem irá buscar ou deixar a criança.</small>
                        </div>
                      </div>
                      <form className="modal-body" onSubmit={handleKidsGuardianSubmit}>
                        <label>
                          <span>Criança</span>
                          <select className="catalog-input" required value={kidsGuardianForm.child_id} onChange={(e) => setKidsGuardianForm((c) => ({ ...c, child_id: e.target.value }))}>
                            <option value="">Selecione</option>
                            {allChildren.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                          </select>
                        </label>
                        <div className="modal-grid">
                          <label>
                            <span>Nome do responsável</span>
                            <input className="catalog-input" required placeholder="Nome completo" value={kidsGuardianForm.name} onChange={(e) => setKidsGuardianForm((c) => ({ ...c, name: e.target.value }))} />
                          </label>
                          <label>
                            <span>Telefone / WhatsApp</span>
                            <input className="catalog-input" placeholder="(00) 00000-0000" value={kidsGuardianForm.phone} onChange={(e) => setKidsGuardianForm((c) => ({ ...c, phone: e.target.value }))} />
                          </label>
                        </div>
                        <div className="modal-grid">
                          <label>
                            <span>Parentesco</span>
                            <select className="catalog-input" value={kidsGuardianForm.relationship} onChange={(e) => setKidsGuardianForm((c) => ({ ...c, relationship: e.target.value as KidsGuardianRecord["relationship"] }))}>
                              <option value="parent">Pai/Mãe</option>
                              <option value="grandparent">Avô/Avó</option>
                              <option value="sibling">Irmão/Irmã</option>
                              <option value="guardian">Responsável legal</option>
                              <option value="other">Outro</option>
                            </select>
                          </label>
                          <label>
                            <span>Vincular a membro</span>
                            <select className="catalog-input" value={kidsGuardianForm.member_id} onChange={(e) => setKidsGuardianForm((c) => ({ ...c, member_id: e.target.value }))}>
                              <option value="">Nenhum vínculo</option>
                              {clientData.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </label>
                        </div>
                        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <input type="checkbox" checked={kidsGuardianForm.is_primary} onChange={(e) => setKidsGuardianForm((c) => ({ ...c, is_primary: e.target.checked }))} />
                          <span>Responsável principal</span>
                        </label>
                        <div className="modal-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => { setIsKidsGuardianFormOpen(false); setKidsGuardianForm(emptyKidsGuardianForm); }}>Cancelar</button>
                          <Button type="submit" disabled={kidsSaveStatus === "loading"} icon={<Plus size={16} />}>{kidsSaveStatus === "loading" ? "Salvando..." : kidsGuardianForm.id ? "Salvar" : "Adicionar"}</Button>
                        </div>
                      </form>
                    </section>
                  </div>
                ) : null}

                {/* ── Modal: escala professor ── */}
                {isKidsTeacherScheduleFormOpen ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet">
                      <div className="modal-section-header">
                        <CalendarCheck size={20} />
                        <div>
                          <strong>Escalar professor(a)</strong>
                          <small>Adicione um membro como professor(a) da Escolinha para a data selecionada.</small>
                        </div>
                      </div>
                      <form className="modal-body" onSubmit={handleKidsTeacherScheduleSubmit}>
                        <div className="modal-grid">
                          <label>
                            <span>Data</span>
                            <input className="catalog-input" type="date" required value={kidsTeacherScheduleForm.schedule_date} onChange={(e) => setKidsTeacherScheduleForm((c) => ({ ...c, schedule_date: e.target.value }))} />
                          </label>
                          <label>
                            <span>Turma</span>
                            <select className="catalog-input" value={kidsTeacherScheduleForm.group_id} onChange={(e) => setKidsTeacherScheduleForm((c) => ({ ...c, group_id: e.target.value }))}>
                              <option value="">Todas as turmas</option>
                              {allGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          </label>
                        </div>
                        <label>
                          <span>Membro escalado</span>
                          <select className="catalog-input" required value={kidsTeacherScheduleForm.member_id} onChange={(e) => setKidsTeacherScheduleForm((c) => ({ ...c, member_id: e.target.value }))}>
                            <option value="">Selecione</option>
                            {clientData.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>Função / Papel</span>
                          <input className="catalog-input" placeholder="Ex.: Professora, Auxiliar, Coordenadora" value={kidsTeacherScheduleForm.role_label} onChange={(e) => setKidsTeacherScheduleForm((c) => ({ ...c, role_label: e.target.value }))} />
                        </label>
                        <label>
                          <span>Observações</span>
                          <input className="catalog-input" placeholder="Opcional" value={kidsTeacherScheduleForm.notes} onChange={(e) => setKidsTeacherScheduleForm((c) => ({ ...c, notes: e.target.value }))} />
                        </label>
                        <div className="modal-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => { setIsKidsTeacherScheduleFormOpen(false); setKidsTeacherScheduleForm(emptyKidsTeacherScheduleForm); }}>Cancelar</button>
                          <Button type="submit" disabled={kidsSaveStatus === "loading"} icon={<Plus size={16} />}>{kidsSaveStatus === "loading" ? "Salvando..." : "Escalar"}</Button>
                        </div>
                      </form>
                    </section>
                  </div>
                ) : null}

                {/* ── Modal: presença ── */}
                {isKidsAttendanceFormOpen ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet">
                      <div className="modal-section-header">
                        <CheckCircle2 size={20} />
                        <div>
                          <strong>Registrar presença</strong>
                          <small>Registre o check-in de uma criança na Escolinha.</small>
                        </div>
                      </div>
                      <form className="modal-body" onSubmit={handleKidsAttendanceSubmit}>
                        <div className="modal-grid">
                          <label>
                            <span>Data</span>
                            <input className="catalog-input" type="date" required value={kidsAttendanceForm.attendance_date} onChange={(e) => setKidsAttendanceForm((c) => ({ ...c, attendance_date: e.target.value }))} />
                          </label>
                          <label>
                            <span>Turma</span>
                            <select className="catalog-input" value={kidsAttendanceForm.group_id} onChange={(e) => setKidsAttendanceForm((c) => ({ ...c, group_id: e.target.value }))}>
                              <option value="">Sem turma</option>
                              {allGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          </label>
                        </div>
                        <label>
                          <span>Criança</span>
                          <select className="catalog-input" required value={kidsAttendanceForm.child_id} onChange={(e) => setKidsAttendanceForm((c) => ({ ...c, child_id: e.target.value }))}>
                            <option value="">Selecione</option>
                            {allChildren.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}{ch.kids_groups ? ` — ${ch.kids_groups.name}` : ""}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>Responsável que entregou</span>
                          <input className="catalog-input" placeholder="Nome de quem deixou a criança" value={kidsAttendanceForm.guardian_name} onChange={(e) => setKidsAttendanceForm((c) => ({ ...c, guardian_name: e.target.value }))} />
                        </label>
                        <label>
                          <span>Observações</span>
                          <input className="catalog-input" placeholder="Opcional" value={kidsAttendanceForm.notes} onChange={(e) => setKidsAttendanceForm((c) => ({ ...c, notes: e.target.value }))} />
                        </label>
                        <div className="modal-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => { setIsKidsAttendanceFormOpen(false); setKidsAttendanceForm(emptyKidsAttendanceForm); }}>Cancelar</button>
                          <Button type="submit" disabled={kidsSaveStatus === "loading"} icon={<CheckCircle2 size={16} />}>{kidsSaveStatus === "loading" ? "Salvando..." : "Registrar check-in"}</Button>
                        </div>
                      </form>
                    </section>
                  </div>
                ) : null}

                {/* ── Modal: atividade ── */}
                {isKidsActivityFormOpen ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet">
                      <div className="modal-section-header">
                        <BookOpen size={20} />
                        <div>
                          <strong>{kidsActivityForm.id ? "Editar atividade" : "Nova atividade"}</strong>
                          <small>Registre a atividade ou lição do dia para uma turma.</small>
                        </div>
                      </div>
                      <form className="modal-body" onSubmit={handleKidsActivitySubmit}>
                        <div className="modal-grid">
                          <label>
                            <span>Data</span>
                            <input className="catalog-input" type="date" required value={kidsActivityForm.activity_date} onChange={(e) => setKidsActivityForm((c) => ({ ...c, activity_date: e.target.value }))} />
                          </label>
                          <label>
                            <span>Turma</span>
                            <select className="catalog-input" value={kidsActivityForm.group_id} onChange={(e) => setKidsActivityForm((c) => ({ ...c, group_id: e.target.value }))}>
                              <option value="">Todas as turmas</option>
                              {allGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          </label>
                        </div>
                        <label>
                          <span>Título</span>
                          <input className="catalog-input" required placeholder="Ex.: História de Davi e Golias" value={kidsActivityForm.title} onChange={(e) => setKidsActivityForm((c) => ({ ...c, title: e.target.value }))} />
                        </label>
                        <label>
                          <span>Descrição / Materiais</span>
                          <textarea className="catalog-input catalog-textarea" rows={3} placeholder="Descreva a atividade, materiais necessários, links de apoio..." value={kidsActivityForm.description} onChange={(e) => setKidsActivityForm((c) => ({ ...c, description: e.target.value }))} />
                        </label>
                        <div className="modal-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => { setIsKidsActivityFormOpen(false); setKidsActivityForm(emptyKidsActivityForm); }}>Cancelar</button>
                          <Button type="submit" disabled={kidsSaveStatus === "loading"} icon={<Plus size={16} />}>{kidsSaveStatus === "loading" ? "Salvando..." : kidsActivityForm.id ? "Salvar" : "Criar atividade"}</Button>
                        </div>
                      </form>
                    </section>
                  </div>
                ) : null}

                {/* ── Modal: comunicado ── */}
                {isKidsCommunicationFormOpen ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet">
                      <div className="modal-section-header">
                        <MessageCircle size={20} />
                        <div>
                          <strong>Novo comunicado</strong>
                          <small>Envie uma mensagem para os responsáveis de uma criança ou para todos.</small>
                        </div>
                      </div>
                      <form className="modal-body" onSubmit={handleKidsCommunicationSubmit}>
                        <label>
                          <span>Criança (deixe em branco para comunicado geral)</span>
                          <select className="catalog-input" value={kidsCommunicationForm.child_id} onChange={(e) => setKidsCommunicationForm((c) => ({ ...c, child_id: e.target.value }))}>
                            <option value="">Todos (comunicado geral)</option>
                            {allChildren.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>Assunto</span>
                          <input className="catalog-input" required placeholder="Assunto do comunicado" value={kidsCommunicationForm.title} onChange={(e) => setKidsCommunicationForm((c) => ({ ...c, title: e.target.value }))} />
                        </label>
                        <label>
                          <span>Mensagem</span>
                          <textarea className="catalog-input catalog-textarea" required rows={4} placeholder="Escreva a mensagem..." value={kidsCommunicationForm.message} onChange={(e) => setKidsCommunicationForm((c) => ({ ...c, message: e.target.value }))} />
                        </label>
                        <label>
                          <span>Enviar via</span>
                          <select className="catalog-input" value={kidsCommunicationForm.sent_via} onChange={(e) => setKidsCommunicationForm((c) => ({ ...c, sent_via: e.target.value as KidsCommunicationRecord["sent_via"] }))}>
                            <option value="system">Sistema (app)</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="both">Sistema + WhatsApp</option>
                          </select>
                        </label>
                        <div className="modal-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => { setIsKidsCommunicationFormOpen(false); setKidsCommunicationForm(emptyKidsCommunicationForm); }}>Cancelar</button>
                          <Button type="submit" disabled={kidsSaveStatus === "loading"} icon={<Send size={16} />}>{kidsSaveStatus === "loading" ? "Enviando..." : "Enviar comunicado"}</Button>
                        </div>
                      </form>
                    </section>
                  </div>
                ) : null}

                {/* ── Painel de detalhes da criança ── */}
                {selectedChild ? (
                  <div className="modal-backdrop">
                    <section className="modal-sheet worship-email-modal">
                      <div className="modal-section-header">
                        <Baby size={20} />
                        <div>
                          <strong>{selectedChild.name}</strong>
                          <small>
                            {selectedChild.date_of_birth
                              ? `${new Date(selectedChild.date_of_birth + "T12:00:00").toLocaleDateString("pt-BR")} · ${calcAge(selectedChild.date_of_birth)} anos`
                              : "Sem data de nascimento"}
                            {selectedChild.kids_groups ? ` · ${selectedChild.kids_groups.name}` : ""}
                          </small>
                        </div>
                      </div>
                      {selectedChild.allergies ? (
                        <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>
                          <strong>⚠ Alergias:</strong> {selectedChild.allergies}
                        </div>
                      ) : null}
                      {selectedChild.special_needs ? (
                        <div style={{ background: "#e3f2fd", border: "1px solid #90caf9", borderRadius: 6, padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>
                          <strong>ℹ Necessidades especiais:</strong> {selectedChild.special_needs}
                        </div>
                      ) : null}
                      {selectedChildGuardians.length > 0 ? (
                        <div className="worship-email-summary">
                          {selectedChildGuardians.map((g) => (
                            <div key={g.id}>
                              <span>{relationshipLabel(g.relationship)}{g.is_primary ? " (principal)" : ""}</span>
                              <strong>
                                {g.name}
                                {g.phone ? (
                                  <a
                                    href={`https://wa.me/55${g.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${g.name}, temos um recado sobre ${selectedChild.name} na Escolinha!`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#25D366" }}
                                  >
                                    WhatsApp
                                  </a>
                                ) : null}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: "0.85rem", color: "var(--color-neutral-500)" }}>Nenhum responsável cadastrado.</p>
                      )}
                      <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => {
                          setKidsGuardianForm({ ...emptyKidsGuardianForm, child_id: selectedChild.id });
                          setIsKidsGuardianFormOpen(true);
                        }}>
                          + Responsável
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => {
                          setKidsChildForm({
                            id: selectedChild.id,
                            name: selectedChild.name,
                            date_of_birth: selectedChild.date_of_birth ?? "",
                            group_id: selectedChild.group_id ?? "",
                            member_id: selectedChild.member_id ?? "",
                            allergies: selectedChild.allergies ?? "",
                            special_needs: selectedChild.special_needs ?? "",
                            notes: selectedChild.notes ?? "",
                          });
                          setKidsSelectedChildId(null);
                          setIsKidsChildFormOpen(true);
                        }}>
                          Editar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => setKidsSelectedChildId(null)}>Fechar</button>
                      </div>
                    </section>
                  </div>
                ) : null}

                {/* ── Dashboard ── */}
                {kidsView === "dashboard" ? (
                  <div>
                    <div className="financial-metrics">
                      <div className="financial-metric-card">
                        <span>Total de crianças</span>
                        <strong>{allChildren.length}</strong>
                      </div>
                      <div className="financial-metric-card">
                        <span>Turmas ativas</span>
                        <strong>{allGroups.filter((g) => g.is_active).length}</strong>
                      </div>
                      <div className="financial-metric-card">
                        <span>Presença hoje</span>
                        <strong>{todayAttendance.length}</strong>
                      </div>
                      <div className="financial-metric-card">
                        <span>Professores hoje</span>
                        <strong>{todaySchedule.length}</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: "1.5rem" }}>
                      <div className="panel-heading" style={{ marginBottom: "0.75rem" }}>
                        <strong>Turmas</strong>
                        <button type="button" onClick={() => { setKidsGroupForm(emptyKidsGroupForm); setIsKidsGroupFormOpen(true); }}>+ Nova turma</button>
                      </div>
                      {allGroups.length === 0 ? (
                        <div className="catalog-empty">Nenhuma turma cadastrada. Crie a primeira turma para começar.</div>
                      ) : (
                        <div className="catalog-list">
                          {allGroups.map((g) => (
                            <div key={g.id} className="catalog-row">
                              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                                {g.color ? <span style={{ width: 12, height: 12, borderRadius: "50%", background: g.color, flexShrink: 0, display: "inline-block" }} /> : null}
                                <strong>{g.name}</strong>
                                {g.age_min != null && g.age_max != null ? <small style={{ color: "var(--color-neutral-500)" }}>{g.age_min}–{g.age_max} anos</small> : null}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                <span style={{ color: "var(--color-neutral-500)", fontSize: "0.85rem" }}>
                                  {allChildren.filter((c) => c.group_id === g.id).length} criança(s)
                                </span>
                                <button type="button" className="btn-icon-ghost" onClick={() => {
                                  setKidsGroupForm({ id: g.id, name: g.name, description: g.description ?? "", age_min: g.age_min != null ? String(g.age_min) : "", age_max: g.age_max != null ? String(g.age_max) : "", color: g.color ?? "#5a8a2f", is_active: g.is_active });
                                  setIsKidsGroupFormOpen(true);
                                }}>
                                  <Edit3 size={15} />
                                </button>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: "1.5rem" }}>
                      <strong style={{ display: "block", marginBottom: "0.5rem" }}>Professores escalados para hoje</strong>
                      {todaySchedule.length === 0 ? (
                        <div className="catalog-empty">Nenhum professor escalado para hoje.</div>
                      ) : (
                        <div className="catalog-list">
                          {todaySchedule.map((s) => (
                            <div key={s.id} className="catalog-row">
                              <span>
                                <strong>{s.members?.name ?? "—"}</strong>
                                {s.role_label ? <small style={{ color: "var(--color-neutral-500)", marginLeft: "0.4rem" }}>{s.role_label}</small> : null}
                              </span>
                              {s.kids_groups ? <em style={{ fontSize: "0.8rem", color: "var(--color-neutral-500)" }}>{s.kids_groups.name}</em> : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* ── Crianças ── */}
                {kidsView === "children" ? (
                  <div>
                    <div className="panel-heading" style={{ marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                        <select className="catalog-input" style={{ width: "auto" }} value={kidsFilterGroupId} onChange={(e) => setKidsFilterGroupId(e.target.value)}>
                          <option value="">Todas as turmas</option>
                          {allGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={() => { setKidsChildForm(emptyKidsChildForm); setIsKidsChildFormOpen(true); }}>+ Cadastrar criança</button>
                    </div>
                    {filteredChildren.length === 0 ? (
                      <div className="catalog-empty">Nenhuma criança cadastrada ainda.</div>
                    ) : (
                      <div className="catalog-list">
                        {filteredChildren.map((ch) => {
                          const age = calcAge(ch.date_of_birth);
                          const guardians = clientData.kidsGuardiansByChildId[ch.id] ?? [];
                          return (
                            <div key={ch.id} className="catalog-row" style={{ cursor: "pointer" }} onClick={() => setKidsSelectedChildId(ch.id)}>
                              <span>
                                <strong>{ch.name}</strong>
                                {age !== null ? <small style={{ color: "var(--color-neutral-500)", marginLeft: "0.4rem" }}>{age} anos</small> : null}
                                {ch.allergies ? <em style={{ marginLeft: "0.4rem", fontSize: "0.75rem", color: "#c23b3b" }}>⚠ Alergia</em> : null}
                              </span>
                              <span style={{ fontSize: "0.85rem", color: "var(--color-neutral-500)" }}>
                                {ch.kids_groups?.name ?? "Sem turma"} · {guardians.length} responsável(is)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* ── Escala do dia ── */}
                {kidsView === "schedule" ? (
                  <div>
                    <div className="panel-heading" style={{ marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.9rem" }}>
                          <span>Data:</span>
                          <input className="catalog-input" type="date" value={kidsAttendanceDate} onChange={(e) => setKidsAttendanceDate(e.target.value)} style={{ width: "auto" }} />
                        </label>
                      </div>
                      <button type="button" onClick={() => { setKidsTeacherScheduleForm({ ...emptyKidsTeacherScheduleForm, schedule_date: kidsAttendanceDate }); setIsKidsTeacherScheduleFormOpen(true); }}>+ Escalar professor(a)</button>
                    </div>
                    {allSchedule.filter((s) => s.schedule_date === kidsAttendanceDate).length === 0 ? (
                      <div className="catalog-empty">Nenhum professor escalado para esta data.</div>
                    ) : (
                      <div className="catalog-list">
                        {allSchedule.filter((s) => s.schedule_date === kidsAttendanceDate).map((s) => (
                          <div key={s.id} className="catalog-row">
                            <span>
                              <strong>{s.members?.name ?? "—"}</strong>
                              {s.role_label ? <small style={{ color: "var(--color-neutral-500)", marginLeft: "0.4rem" }}>{s.role_label}</small> : null}
                            </span>
                            <span style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem", color: "var(--color-neutral-500)" }}>
                              <span>{s.kids_groups?.name ?? "Todas as turmas"}</span>
                              {s.members?.phone ? (
                                <a
                                  href={`https://wa.me/${normalizeWhatsappPhone(s.members.phone)}?text=${encodeURIComponent("Olá! Você está escalado(a) hoje na Escolinha.")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "#25D366", fontSize: "0.8rem" }}
                                >
                                  WhatsApp
                                </a>
                              ) : null}
                              <button
                                type="button"
                                className="btn-icon-ghost"
                                aria-label="Remover escala"
                                onClick={() => handleDeleteKidsTeacherSchedule(s.id)}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: "1.5rem" }}>
                      <strong style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Histórico recente de escalas</strong>
                      {allSchedule.length === 0 ? (
                        <div className="catalog-empty">Nenhuma escala registrada.</div>
                      ) : (
                        <div className="catalog-list">
                          {allSchedule.slice(0, 20).map((s) => (
                            <div key={s.id} className="catalog-row">
                              <span>
                                <strong>{s.members?.name ?? "—"}</strong>
                                {s.role_label ? <small style={{ color: "var(--color-neutral-500)", marginLeft: "0.4rem" }}>{s.role_label}</small> : null}
                              </span>
                              <span style={{ fontSize: "0.85rem", color: "var(--color-neutral-500)" }}>
                                {new Date(s.schedule_date + "T12:00:00").toLocaleDateString("pt-BR")} · {s.kids_groups?.name ?? "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* ── Presença ── */}
                {kidsView === "attendance" ? (
                  <div>
                    <div className="panel-heading" style={{ marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                        <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "0.9rem" }}>
                          <span>Data:</span>
                          <input className="catalog-input" type="date" value={kidsAttendanceDate} onChange={(e) => setKidsAttendanceDate(e.target.value)} style={{ width: "auto" }} />
                        </label>
                        <input
                          className="catalog-input"
                          placeholder="Escanear/colar token QR"
                          value={kidsQrToken}
                          onChange={(e) => setKidsQrToken(e.target.value)}
                          style={{ minWidth: 240 }}
                        />
                        <button type="button" onClick={() => void startKidsQrScanner()}>
                          <Camera size={15} /> Ler câmera
                        </button>
                        <button type="button" onClick={() => void handleKidsQrCheckin()}>
                          <QrCode size={15} /> Check-in por QR
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <button type="button" onClick={() => { setKidsAttendanceForm({ ...emptyKidsAttendanceForm, attendance_date: kidsAttendanceDate }); setIsKidsAttendanceFormOpen(true); }}>+ Registrar check-in</button>
                        <Button
                          type="button"
                          variant="secondary"
                          icon={<FileText size={15} />}
                          onClick={() =>
                            exportKidsAttendancePdf(
                              tenant.name,
                              kidsAttendanceDate,
                              allAttendance.filter((a) => a.attendance_date === kidsAttendanceDate),
                            )
                          }
                        >
                          Exportar PDF
                        </Button>
                      </div>
                    </div>
                    {kidsQrScannerMessage ? (
                      <p className={`login-feedback ${kidsQrScannerMessage.includes("lido") ? "success" : "error"}`}>{kidsQrScannerMessage}</p>
                    ) : null}
                    {isKidsQrScannerOpen ? (
                      <div className="kids-qr-scanner">
                        <video ref={kidsQrVideoRef} muted playsInline />
                        <button type="button" className="btn btn-secondary" onClick={stopKidsQrScanner}>
                          Fechar câmera
                        </button>
                      </div>
                    ) : null}
                    {allAttendance.filter((a) => a.attendance_date === kidsAttendanceDate).length === 0 ? (
                      <div className="catalog-empty">Nenhuma presença registrada para esta data.</div>
                    ) : (
                      <div className="catalog-list">
                        {allAttendance.filter((a) => a.attendance_date === kidsAttendanceDate).map((a) => (
                          <div key={a.id} className="catalog-row">
                            <span>
                              <strong>{a.kids_children?.name ?? "—"}</strong>
                              {a.kids_groups ? <small style={{ color: "var(--color-neutral-500)", marginLeft: "0.4rem" }}>{a.kids_groups.name}</small> : null}
                            </span>
                            <span style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.85rem", color: "var(--color-neutral-500)" }}>
                              <span>
                                {a.checked_in_at ? `Entrada: ${new Date(a.checked_in_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "—"}
                                {a.checked_out_at ? ` · Saída: ${new Date(a.checked_out_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                                {a.guardian_name ? ` · Responsável: ${a.guardian_name}` : ""}
                              </span>
                              {!a.checked_out_at ? (
                                <button
                                  type="button"
                                  className="btn-icon-ghost"
                                  aria-label="Registrar check-out"
                                  onClick={() => handleKidsAttendanceCheckout(a.id)}
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              ) : null}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* ── Atividades ── */}
                {kidsView === "activities" ? (
                  <div>
                    <div className="panel-heading" style={{ marginBottom: "0.75rem" }}>
                      <strong>Atividades e lições</strong>
                      <button type="button" onClick={() => { setKidsActivityForm(emptyKidsActivityForm); setIsKidsActivityFormOpen(true); }}>+ Nova atividade</button>
                    </div>
                    {allActivities.length === 0 ? (
                      <div className="catalog-empty">Nenhuma atividade registrada ainda.</div>
                    ) : (
                      <div className="catalog-list">
                        {allActivities.map((a) => (
                          <div key={a.id} className="catalog-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.25rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                              <strong>{a.title}</strong>
                              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <small style={{ color: "var(--color-neutral-500)" }}>{new Date(a.activity_date + "T12:00:00").toLocaleDateString("pt-BR")}</small>
                                {a.kids_groups ? <em style={{ fontSize: "0.78rem", color: "var(--color-neutral-500)" }}>{a.kids_groups.name}</em> : null}
                                <button type="button" className="btn-icon-ghost" onClick={() => {
                                  setKidsActivityForm({ id: a.id, group_id: a.group_id ?? "", title: a.title, description: a.description ?? "", activity_date: a.activity_date });
                                  setIsKidsActivityFormOpen(true);
                                }}>
                                  <Edit3 size={14} />
                                </button>
                              </div>
                            </div>
                            {a.description ? <small style={{ color: "var(--color-neutral-500)", lineHeight: 1.4 }}>{a.description}</small> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* ── Comunicados ── */}
                {kidsView === "communications" ? (
                  <div>
                    <div className="panel-heading" style={{ marginBottom: "0.75rem" }}>
                      <strong>Comunicados aos pais</strong>
                      <button type="button" onClick={() => { setKidsCommunicationForm(emptyKidsCommunicationForm); setIsKidsCommunicationFormOpen(true); }}>+ Novo comunicado</button>
                    </div>
                    {allComms.length === 0 ? (
                      <div className="catalog-empty">Nenhum comunicado enviado ainda.</div>
                    ) : (
                      <div className="catalog-list">
                        {allComms.map((comm) => {
                          const whatsappLinks = communicationWhatsappLinks(comm);
                          return (
                          <div key={comm.id} className="catalog-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.25rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                              <strong>{comm.title}</strong>
                              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <small style={{ color: "var(--color-neutral-500)" }}>{new Date(comm.sent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                                <em style={{ fontSize: "0.78rem", background: "var(--color-neutral-100)", padding: "0 0.4rem", borderRadius: 4 }}>{sentViaLabel(comm.sent_via)}</em>
                              </div>
                            </div>
                            <small style={{ color: "var(--color-neutral-500)" }}>
                              {comm.kids_children ? `Para: ${comm.kids_children.name}` : "Para: todos os responsáveis"}
                            </small>
                            <p style={{ fontSize: "0.85rem", margin: 0, color: "var(--color-text)" }}>{comm.message}</p>
                            {whatsappLinks.length > 0 ? (
                              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                {whatsappLinks.map((link) => (
                                  <a
                                    key={link.id}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#25D366", fontSize: "0.8rem" }}
                                  >
                                    WhatsApp: {link.name}
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

              </article>
            );
          })() : null}

          {activeTab === "notices" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Comunicados gerais</span>
                  <h4>Mensagens para a comunidade</h4>
                </div>
                {canManageAnnouncements ? (
                  <button type="button" onClick={openCreateAnnouncementForm}>Novo comunicado</button>
                ) : null}
              </div>

              {clientData.announcements.length === 0 ? (
                <div className="member-portal-empty state-card" style={{ margin: "24px 0" }}>
                  <Bell size={32} />
                  <strong>Nenhum comunicado publicado</strong>
                  <span>Crie o primeiro comunicado para os membros da igreja.</span>
                </div>
              ) : (
                <div className="notification-list">
                  {(() => {
                    const now = new Date();
                    const active = clientData.announcements.filter(
                      (a) => !a.expires_at || new Date(a.expires_at) > now
                    );
                    const expired = clientData.announcements.filter(
                      (a) => a.expires_at && new Date(a.expires_at) <= now
                    );
                    return [...active, ...expired].map((item) => {
                      const isExpired = !!item.expires_at && new Date(item.expires_at) <= now;
                      const excerpt = item.message.length > 120 ? item.message.slice(0, 120) + "…" : item.message;
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                            opacity: isExpired ? 0.6 : 1,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <strong style={{ color: isExpired ? "var(--color-text-secondary)" : undefined }}>
                                {item.title}
                              </strong>
                              {isExpired ? (
                                <em style={{
                                  fontSize: "0.7rem", fontStyle: "normal", fontWeight: 600,
                                  background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)",
                                  padding: "1px 7px", borderRadius: 4,
                                }}>
                                  Encerrado
                                </em>
                              ) : item.expires_at ? (
                                <em style={{
                                  fontSize: "0.7rem", fontStyle: "normal",
                                  color: "var(--color-text-secondary)",
                                }}>
                                  até {new Date(item.expires_at).toLocaleDateString("pt-BR")}
                                </em>
                              ) : null}
                              <small>{new Date(item.published_at).toLocaleDateString("pt-BR")}</small>
                            </div>
                            <div className="member-actions" style={{ gap: 4 }}>
                              <button
                                type="button"
                                title="Pré-visualizar"
                                onClick={() => { setAnnouncementPreviewTarget(item); setAnnouncementPreviewOpen(true); }}
                              >
                                <Eye size={15} />
                              </button>
                              {canManageAnnouncements ? (
                                <>
                                  {!isExpired ? (
                                    <button
                                      type="button"
                                      title="Notificar membros"
                                      onClick={() => {
                                        setAnnouncementNotifyTarget(item);
                                        setAnnouncementNotifyStatus("idle");
                                        setAnnouncementNotifyMessage("");
                                        setAnnouncementNotifyOpen(true);
                                      }}
                                    >
                                      <Send size={15} />
                                    </button>
                                  ) : null}
                                  <button type="button" title="Editar" onClick={() => openEditAnnouncementForm(item)}>
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    title="Excluir"
                                    style={{ color: "var(--color-error)" }}
                                    onClick={() => handleDeleteAnnouncement(item.id)}
                                  >
                                    <X size={15} />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                            {excerpt}
                          </p>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </article>
          ) : null}

          {activeTab === "social-media" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Mídias Sociais</span>
                  <h4>Canais e playlists do YouTube</h4>
                </div>
                {canManageSocialMedia ? (
                  <button type="button" onClick={openCreateSocialMediaForm}>Adicionar canal</button>
                ) : null}
              </div>

              {(clientData?.socialMediaChannels ?? []).length === 0 ? (
                <div className="member-portal-empty state-card" style={{ margin: "24px 0" }}>
                  <Play size={32} />
                  <strong>Nenhum canal cadastrado</strong>
                  <span>Adicione um canal ou playlist do YouTube para os membros assistirem.</span>
                </div>
              ) : (
                <div className="notification-list">
                  {(clientData?.socialMediaChannels ?? []).map((ch) => (
                    <div key={ch.id} style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <Play size={15} style={{ color: "var(--color-accent)" }} />
                          <strong>{ch.name}</strong>
                          <em style={{
                            fontSize: "0.7rem", fontStyle: "normal", fontWeight: 600,
                            background: ch.channel_type === "playlist" ? "var(--color-bg-subtle)" : "rgba(var(--color-accent-rgb),0.12)",
                            color: "var(--color-text-secondary)",
                            padding: "1px 7px", borderRadius: 4,
                          }}>
                            {ch.channel_type === "playlist" ? "Playlist" : "Canal"}
                          </em>
                          {!ch.is_active ? (
                            <em style={{
                              fontSize: "0.7rem", fontStyle: "normal", fontWeight: 600,
                              background: "var(--color-bg-subtle)", color: "var(--color-text-secondary)",
                              padding: "1px 7px", borderRadius: 4,
                            }}>Inativo</em>
                          ) : null}
                        </div>
                        {canManageSocialMedia ? (
                          <div className="member-actions" style={{ gap: 4 }}>
                            <button
                              type="button"
                              title={ch.is_active ? "Desativar" : "Ativar"}
                              style={{ color: ch.is_active ? "var(--color-success)" : "var(--color-text-secondary)" }}
                              onClick={() => handleToggleSocialMediaChannel(ch)}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            <button type="button" title="Editar" onClick={() => openEditSocialMediaForm(ch)}>
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              title="Excluir"
                              style={{ color: "var(--color-error)" }}
                              onClick={() => handleDeleteSocialMediaChannel(ch.id)}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {ch.channel_url ? (
                        <a
                          href={ch.channel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", wordBreak: "break-all" }}
                        >
                          {ch.channel_url}
                        </a>
                      ) : null}
                      {ch.description ? (
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                          {ch.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ) : null}

          {isSocialMediaFormOpen ? (
            <div className="modal-overlay" onClick={() => setIsSocialMediaFormOpen(false)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                  <div>
                    <span>{socialMediaFormMode === "create" ? "Novo canal" : "Editar canal"}</span>
                    <h2 style={{ fontSize: "1.15rem", margin: 0 }}>
                      {socialMediaFormMode === "create" ? "Adicionar canal do YouTube" : socialMediaEditTarget?.name}
                    </h2>
                  </div>
                  <button className="modal-close" type="button" onClick={() => setIsSocialMediaFormOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSaveSocialMediaChannel}>
                    <label>
                      <span>Nome do canal *</span>
                      <input
                        type="text"
                        value={socialMediaFormName}
                        onChange={(e) => setSocialMediaFormName(e.target.value)}
                        placeholder="Ex.: Canal da Igreja"
                        required
                      />
                    </label>
                    <label>
                      <span>URL do YouTube *</span>
                      <input
                        type="url"
                        value={socialMediaFormUrl}
                        onChange={(e) => setSocialMediaFormUrl(e.target.value)}
                        placeholder="https://www.youtube.com/channel/UC... ou playlist?list=..."
                        required
                      />
                      <small style={{ color: "var(--color-text-secondary)", lineHeight: 1.4, marginTop: 2, display: "block" }}>
                        Suportado: <code>youtube.com/channel/UC...</code> ou <code>youtube.com/playlist?list=...</code>
                      </small>
                    </label>
                    <label>
                      <span>Descrição (opcional)</span>
                      <textarea
                        rows={2}
                        value={socialMediaFormDescription}
                        onChange={(e) => setSocialMediaFormDescription(e.target.value)}
                        placeholder="Breve descrição para os membros"
                      />
                    </label>
                    {socialMediaSaveStatus === "error" ? (
                      <p className="login-feedback error">{socialMediaSaveMessage}</p>
                    ) : null}
                    {socialMediaSaveStatus === "success" ? (
                      <p className="login-feedback success">{socialMediaSaveMessage}</p>
                    ) : null}
                    <div className="modal-actions">
                      <button type="button" className="secondary-action" onClick={() => setIsSocialMediaFormOpen(false)}>
                        Cancelar
                      </button>
                      <Button type="submit" disabled={socialMediaSaveStatus === "loading"} icon={<Play size={16} />}>
                        {socialMediaSaveStatus === "loading" ? "Salvando..." : "Salvar canal"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "intercession" ? (
            <>
              {/* Stats row */}
              <div className="client-stats" style={{ marginBottom: 0 }}>
                <article>
                  <span>Novos</span>
                  <strong style={{ color: "var(--color-accent)" }}>
                    {prayerRequests.filter((r) => r.status === "new").length}
                  </strong>
                  <small>Aguardando atribuição</small>
                </article>
                <article>
                  <span>Atribuídos</span>
                  <strong style={{ color: "#e08b00" }}>
                    {prayerRequests.filter((r) => r.status === "assigned").length}
                  </strong>
                  <small>Aguardando intercessão</small>
                </article>
                <article>
                  <span>Em Intercessão</span>
                  <strong style={{ color: "#c07000" }}>
                    {prayerRequests.filter((r) => r.status === "interceding").length}
                  </strong>
                  <small>Sendo intercedidos agora</small>
                </article>
                <article>
                  <span>Concluídos</span>
                  <strong style={{ color: "var(--color-success)" }}>
                    {prayerRequests.filter((r) => r.status === "done").length}
                  </strong>
                  <small>Pedidos intercedidos</small>
                </article>
              </div>

              <article className="panel full-width">
                <div className="panel-heading">
                  <div>
                    <span>Intercessão</span>
                    <h4>Pedidos de oração</h4>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Filter */}
                    <select
                      value={intercessionFilter}
                      onChange={(e) => setIntercessionFilter(e.target.value as typeof intercessionFilter)}
                      style={{ fontSize: "0.82rem", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)" }}
                    >
                      <option value="all">Todos</option>
                      <option value="new">Novos</option>
                      <option value="assigned">Atribuídos</option>
                      <option value="interceding">Em Intercessão</option>
                      <option value="done">Concluídos</option>
                    </select>
                    {canManageIntercession && prayerRequests.filter((r) => r.status === "new").length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={distributeStatus === "loading" || intercessionMembers.length === 0}
                        onClick={handleDistributeAll}
                      >
                        <Heart size={14} />
                        {distributeStatus === "loading" ? "Distribuindo..." : `Distribuir ${prayerRequests.filter((r) => r.status === "new").length} aleator.`}
                      </button>
                    ) : null}
                  </div>
                </div>

                {distributeMessage ? (
                  <p className={`login-feedback ${distributeStatus}`} style={{ margin: "8px 0" }}>{distributeMessage}</p>
                ) : null}

                {intercessionMembers.length === 0 && canManageIntercession ? (
                  <div className="member-portal-empty state-card" style={{ margin: "12px 0" }}>
                    <Heart size={22} />
                    <strong>Nenhum intercessor cadastrado</strong>
                    <span>Adicione membros ao ministério "Intercessão" para poder distribuir pedidos.</span>
                  </div>
                ) : null}

                {intercessionLoadStatus === "loading" ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--color-text-secondary)" }}>Carregando pedidos...</div>
                ) : (() => {
                  const statusOrder: Record<string, number> = { new: 0, assigned: 1, interceding: 2, done: 3 };
                  const filtered = prayerRequests
                    .filter((r) => intercessionFilter === "all" || r.status === intercessionFilter)
                    .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

                  if (filtered.length === 0) {
                    return (
                      <div className="member-portal-empty state-card" style={{ margin: "24px 0" }}>
                        <Heart size={32} />
                        <strong>Nenhum pedido encontrado</strong>
                        <span>Os pedidos feitos pelos membros aparecerão aqui.</span>
                      </div>
                    );
                  }

                  const activeAssignmentByRequestId = Object.fromEntries(
                    prayerAssignments.map((a) => [a.prayer_request_id, a])
                  );

                  const statusBadge = (status: PrayerRequestRecord["status"]) => {
                    const map: Record<string, { label: string; color: string; bg: string }> = {
                      new:        { label: "Novo",           color: "var(--color-accent)",   bg: "rgba(var(--color-accent-rgb),0.1)" },
                      assigned:   { label: "Atribuído",      color: "#e08b00",               bg: "rgba(224,139,0,0.1)" },
                      interceding:{ label: "Em Intercessão", color: "#c07000",               bg: "rgba(192,112,0,0.1)" },
                      done:       { label: "Intercedido",    color: "var(--color-success)",  bg: "rgba(var(--color-success-rgb),0.1)" },
                    };
                    const s = map[status] ?? map.new;
                    return (
                      <em style={{
                        fontSize: "0.7rem", fontStyle: "normal", fontWeight: 700,
                        color: s.color, background: s.bg,
                        padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap",
                      }}>{s.label}</em>
                    );
                  };

                  return (
                    <div className="notification-list">
                      {filtered.map((req) => {
                        const assignment = activeAssignmentByRequestId[req.id];
                        const requesterName = req.is_anonymous ? "Anônimo" : ((req.members as { name: string } | null)?.name ?? "Membro");
                        return (
                          <div key={req.id} style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8, flexWrap: "wrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <Heart size={14} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
                                <strong style={{ fontSize: "0.85rem" }}>{requesterName}</strong>
                                {statusBadge(req.status)}
                                {req.source === "app" ? (
                                  <em style={{ fontSize: "0.68rem", fontStyle: "normal", color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)", padding: "1px 6px", borderRadius: 4 }}>App</em>
                                ) : null}
                                <small style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                                  {new Date(req.created_at).toLocaleDateString("pt-BR")}
                                </small>
                              </div>
                              {canManageIntercession && req.status === "new" ? (
                                <button
                                  type="button"
                                  style={{ fontSize: "0.78rem", padding: "3px 10px", borderRadius: 6, border: "1px solid var(--color-accent)", color: "var(--color-accent)", background: "transparent", cursor: "pointer" }}
                                  onClick={() => {
                                    setAssignModalTarget(req);
                                    setAssignSelectedMemberId("");
                                    setAssignStatus("idle");
                                    setAssignMessage("");
                                  }}
                                >
                                  Atribuir
                                </button>
                              ) : null}
                            </div>
                            <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, color: "var(--color-text)", paddingLeft: 22 }}>
                              {req.content.length > 180 ? req.content.slice(0, 180) + "…" : req.content}
                            </p>
                            {assignment ? (
                              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)", paddingLeft: 22 }}>
                                Intercessor: <strong>{(assignment.members as { name: string } | null)?.name ?? "—"}</strong>
                                {assignment.status === "interceding" ? " · orando agora" : ""}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </article>

              {/* Modal de atribuição direta */}
              {assignModalTarget ? (
                <div className="modal-overlay" onClick={() => setAssignModalTarget(null)}>
                  <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                    <div className="modal-header">
                      <div>
                        <span>Atribuição direta</span>
                        <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Escolher intercessor</h2>
                      </div>
                      <button className="modal-close" type="button" onClick={() => setAssignModalTarget(null)}>
                        <X size={18} />
                      </button>
                    </div>

                    <div style={{ padding: "16px 0 4px" }}>
                      <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "var(--color-text-secondary)", fontStyle: "italic", lineHeight: 1.5 }}>
                        "{assignModalTarget.content.length > 120 ? assignModalTarget.content.slice(0, 120) + "…" : assignModalTarget.content}"
                      </p>

                      {intercessionMembers.length === 0 ? (
                        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
                          Nenhum membro no ministério de Intercessão.
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Intercessor</label>
                          <select
                            value={assignSelectedMemberId}
                            onChange={(e) => setAssignSelectedMemberId(e.target.value)}
                            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.9rem" }}
                          >
                            <option value="">Selecione um intercessor...</option>
                            {intercessionMembers.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {assignMessage ? (
                        <p className={`login-feedback ${assignStatus}`} style={{ marginTop: 10 }}>{assignMessage}</p>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12 }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setAssignModalTarget(null)}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!assignSelectedMemberId || assignStatus === "loading" || assignStatus === "success"}
                        onClick={handleDirectAssign}
                      >
                        {assignStatus === "loading" ? "Atribuindo..." : assignStatus === "success" ? "Atribuído!" : "Atribuir"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {activeTab === "lists" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Cargos/Ministérios</span>
                  <h4>Cargos e ministérios</h4>
                </div>
              </div>

              {catalogSaveMessage ? (
                <p className={`login-feedback ${catalogSaveStatus}`}>{catalogSaveMessage}</p>
              ) : null}

              <div className="catalog-grid">
                <section className="catalog-panel" aria-label="Lista de cargos">
                  <div className="catalog-header">
                    <strong>Cargos</strong>
                    <small>Use nos cadastros do seu tenant. A base do sistema é compartilhada.</small>
                  </div>

                  {isTenantAdmin ? (
                    <div className="catalog-add">
                      <input
                        className="catalog-input"
                        placeholder="Adicionar cargo do tenant"
                        value={catalogRoleDraft}
                        onChange={(event) => setCatalogRoleDraft(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={catalogSaveStatus === "loading"}
                        onClick={() => handleAddCatalogItem("roles")}
                      >
                        Adicionar
                      </Button>
                    </div>
                  ) : null}

                  <div className="catalog-group">
                    <span className="catalog-label">Base do sistema</span>
                    <div className="catalog-list">
                      {clientData.catalogRoles
                        .filter((item) => item.tenant_id === null)
                        .map((item) => (
                          <div key={item.id} className="catalog-row system">
                            <span>{item.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="catalog-group">
                    <span className="catalog-label">Do seu tenant</span>
                    <div className="catalog-list">
                      {clientData.catalogRoles.filter((item) => item.tenant_id !== null).length === 0 ? (
                        <div className="catalog-empty">Nenhum cargo personalizado ainda.</div>
                      ) : null}
                      {clientData.catalogRoles
                        .filter((item) => item.tenant_id !== null)
                        .map((item) => (
                          <div key={item.id} className="catalog-row">
                            <input
                              className="catalog-input"
                              value={catalogEdits[item.id] ?? item.name}
                              onChange={(event) => handleCatalogEditChange(item.id, event.target.value)}
                              disabled={!isTenantAdmin}
                            />
                            {isTenantAdmin ? (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={catalogSaveStatus === "loading"}
                                onClick={() => handleSaveCatalogItem("roles", item)}
                              >
                                Salvar
                              </Button>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                </section>

                <section className="catalog-panel" aria-label="Lista de ministérios">
                  <div className="catalog-header">
                    <strong>Ministérios</strong>
                    <small>Base de referência + itens do seu tenant para manter a nomenclatura local.</small>
                  </div>

                  {isTenantAdmin ? (
                    <div className="catalog-add">
                      <input
                        className="catalog-input"
                        placeholder="Adicionar ministério do tenant"
                        value={catalogMinistryDraft}
                        onChange={(event) => setCatalogMinistryDraft(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={catalogSaveStatus === "loading"}
                        onClick={() => handleAddCatalogItem("ministries")}
                      >
                        Adicionar
                      </Button>
                    </div>
                  ) : null}

                  <div className="catalog-group">
                    <span className="catalog-label">Base do sistema</span>
                    <div className="catalog-list">
                      {clientData.catalogMinistries
                        .filter((item) => item.tenant_id === null)
                        .map((item) => (
                          <div key={item.id} className="catalog-row system">
                            <span>{item.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="catalog-group">
                    <span className="catalog-label">Do seu tenant</span>
                    <div className="catalog-list">
                      {clientData.catalogMinistries.filter((item) => item.tenant_id !== null).length === 0 ? (
                        <div className="catalog-empty">Nenhum ministério personalizado ainda.</div>
                      ) : null}
                      {clientData.catalogMinistries
                        .filter((item) => item.tenant_id !== null)
                        .map((item) => (
                          <div key={item.id} className="catalog-row">
                            <input
                              className="catalog-input"
                              value={catalogEdits[item.id] ?? item.name}
                              onChange={(event) => handleCatalogEditChange(item.id, event.target.value)}
                              disabled={!isTenantAdmin}
                            />
                            {isTenantAdmin ? (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={catalogSaveStatus === "loading"}
                                onClick={() => handleSaveCatalogItem("ministries", item)}
                              >
                                Salvar
                              </Button>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                </section>
              </div>
            </article>
          ) : null}

          {activeTab === "theme" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Identidade visual</span>
                  <h4>Logo, cores e preview</h4>
                </div>
              </div>

              <form className="tenant-form" onSubmit={handleThemeSubmit}>
                <label>
                  <span>Logo da igreja</span>
                  <div className="logo-picker">
                    {themeLogoPreviewUrl ? (
                      <img src={themeLogoPreviewUrl} alt="Logo do tenant" />
                    ) : (
                      <span className="logo-placeholder">Sem logo</span>
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} />
                  </div>
                </label>
                <label>
                  <span>Cor primária</span>
                  <input
                    type="color"
                    value={themeForm.primary_color}
                    onChange={(event) => updateThemeForm("primary_color", event.target.value)}
                  />
                </label>
                <label>
                  <span>Cor de destaque</span>
                  <input
                    type="color"
                    value={themeForm.accent_color}
                    onChange={(event) => updateThemeForm("accent_color", event.target.value)}
                  />
                </label>
                <label>
                  <span>Cor do header</span>
                  <input
                    type="color"
                    value={themeForm.header_color}
                    onChange={(event) => updateThemeForm("header_color", event.target.value)}
                  />
                </label>
                <label>
                  <span>Cor do menu lateral</span>
                  <input
                    type="color"
                    value={themeForm.sidebar_color}
                    onChange={(event) => updateThemeForm("sidebar_color", event.target.value)}
                  />
                </label>
                <label>
                  <span>Cor do footer</span>
                  <input
                    type="color"
                    value={themeForm.footer_color}
                    onChange={(event) => updateThemeForm("footer_color", event.target.value)}
                  />
                </label>

                {logoUploadMessage ? (
                  <p className={`login-feedback ${logoUploadStatus}`}>{logoUploadMessage}</p>
                ) : null}
                {themeSaveMessage ? (
                  <p className={`login-feedback ${themeSaveStatus}`}>{themeSaveMessage}</p>
                ) : null}

                <div className="tenant-form-actions">
                  <Button type="submit" disabled={themeSaveStatus === "loading"} icon={<ArrowRight size={18} />}>
                    {themeSaveStatus === "loading" ? "Salvando..." : "Salvar identidade"}
                  </Button>
                </div>
              </form>
            </article>
          ) : null}

          {activeTab === "users" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Usuários</span>
                  <h4>Perfis e permissões do usuário</h4>
                </div>
              </div>

              <div className="member-list">
                {clientData.users.map((user) => {
                  const edit = userEdits[user.id] ?? {
                    full_name: user.full_name,
                    tenant_role: user.tenant_role ?? "member",
                    status: user.status,
                    moduleAdminModuleIds: clientData.moduleAdminModuleIdsByProfileId[user.id] ?? [],
                  };
                  return (
                    <div key={user.id} className="member-row">
                      <span>{user.full_name?.slice(0, 1) ?? user.email.slice(0, 1)}</span>
                      <div>
                        <strong>{user.full_name || user.email}</strong>
                        <small>{user.email}</small>
                      </div>
                      <div className="user-edit-row">
                        <select
                          value={edit.tenant_role ?? "member"}
                          onChange={(event) => handleUserFieldChange(user.id, "tenant_role", event.target.value)}
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="member">Membro</option>
                        </select>
                        <select
                          value={edit.status}
                          onChange={(event) => handleUserFieldChange(user.id, "status", event.target.value)}
                        >
                          <option value="active">Ativo</option>
                          <option value="invited">Convidado</option>
                          <option value="suspended">Suspenso</option>
                        </select>
                        <Button
                          variant="secondary"
                          type="button"
                          disabled={userSaveStatus[user.id] === "loading"}
                          onClick={() => handleSaveUser(user.id)}
                        >
                          Salvar
                        </Button>
                      </div>
                      <div className="module-access-row" aria-label="Módulos administrativos liberados">
                        {clientData.allPlatformModules.map((module) => {
                          const isActiveForTenant = Boolean(activeModuleIdByCode[module.code]);
                          return (
                          <label
                            key={module.id}
                            className={`check-row compact${!isActiveForTenant ? " check-row-disabled" : ""}`}
                            title={!isActiveForTenant ? "Módulo não ativado para este tenant" : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={edit.moduleAdminModuleIds.includes(module.id)}
                              onChange={() => toggleUserModuleAdmin(user.id, module.id)}
                              disabled={!isActiveForTenant}
                            />
                            <span>{module.name}</span>
                            {!isActiveForTenant ? <em className="check-row-tag">inativo</em> : null}
                          </label>
                        );
                        })}
                      </div>
                      {userSaveMessage[user.id] ? (
                        <small className={`login-feedback ${userSaveStatus[user.id]}`}>
                          {userSaveMessage[user.id]}
                        </small>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ) : null}

          {activeTab === "policies" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Política &amp; LGPD</span>
                  <h4>Termos de uso, privacidade e consentimentos</h4>
                </div>
              </div>

              {policyMessage ? (
                <p className={`login-feedback ${policyStatus}`}>{policyMessage}</p>
              ) : null}

              <div className="policy-editor-stack">
                {/* ── Termos de Uso ─────────────────────────────────────── */}
                <section className="policy-editor-block" aria-label="Termos de uso">
                  <div className="catalog-header">
                    <strong>Termos de Uso</strong>
                    <small>Texto exibido para membros ao acessar o portal pela primeira vez.</small>
                  </div>
                  <textarea
                    className="policy-editor-textarea"
                    rows={12}
                    placeholder="Descreva os termos de uso do portal da sua igreja..."
                    value={policyForm.terms_text}
                    onChange={(e) => setPolicyForm((f) => ({ ...f, terms_text: e.target.value }))}
                  />
                </section>

                {/* ── Política de Privacidade ───────────────────────────── */}
                <section className="policy-editor-block" aria-label="Política de privacidade">
                  <div className="catalog-header">
                    <strong>Política de Privacidade (LGPD)</strong>
                    <small>Informe como os dados dos membros são coletados, usados e protegidos.</small>
                  </div>
                  <textarea
                    className="policy-editor-textarea"
                    rows={12}
                    placeholder="Descreva sua política de privacidade de acordo com a LGPD..."
                    value={policyForm.privacy_text}
                    onChange={(e) => setPolicyForm((f) => ({ ...f, privacy_text: e.target.value }))}
                  />
                </section>

                {/* ── Ações ─────────────────────────────────────────────── */}
                <section className="policy-editor-block" aria-label="Publicação">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <strong style={{ display: "block", fontSize: "0.95rem" }}>Versão publicada</strong>
                      <small style={{ color: "var(--color-neutral-500)" }}>
                        {policyRecord?.published_at
                          ? `Versão ${policyRecord.version} · publicada em ${new Date(policyRecord.published_at).toLocaleDateString("pt-BR")} às ${new Date(policyRecord.published_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                          : policyRecord
                            ? `Versão ${policyRecord.version} (rascunho — nunca publicada)`
                            : "Nenhum documento criado ainda"}
                      </small>
                      {!policyRecord && (
                        <small style={{ color: "var(--color-neutral-400)", display: "block", marginTop: 4 }}>
                          Salve o rascunho primeiro para habilitar a publicação.
                        </small>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                      <Button
                        variant="secondary"
                        type="button"
                        disabled={policyStatus === "loading"}
                        onClick={() => void handleSavePolicy()}
                      >
                        Salvar rascunho
                      </Button>
                      <Button
                        variant="primary"
                        type="button"
                        disabled={policyStatus === "loading" || !policyRecord || (!policyForm.terms_text.trim() && !policyForm.privacy_text.trim())}
                        onClick={() => void handlePublishPolicy()}
                      >
                        <FileCheck2 size={16} />
                        Publicar nova versão
                      </Button>
                    </div>
                  </div>
                </section>

                {/* ── Cards de aceites e LGPD lado a lado ──────────────── */}
                <div className="catalog-grid" style={{ marginTop: 0 }}>
                {/* ── Aceites registrados ───────────────────────────────── */}
                <section className="catalog-panel" aria-label="Aceites de política">
                  <div className="catalog-header">
                    <strong>Aceites de Política</strong>
                    <small>{policyAcceptances.length} registro(s) de aceite</small>
                  </div>
                  {policyAcceptances.length === 0 ? (
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                      Nenhum aceite registrado ainda.
                    </p>
                  ) : (
                    <div className="member-list" style={{ maxHeight: 240, overflowY: "auto" }}>
                      {policyAcceptances.map((a) => (
                        <div key={a.id} className="member-row" style={{ fontSize: "0.875rem" }}>
                          <FileCheck2 size={16} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                          <div>
                            <strong>{(a.profiles as { full_name?: string | null; email?: string } | undefined)?.full_name ?? (a.profiles as { full_name?: string | null; email?: string } | undefined)?.email ?? a.user_id.slice(0, 8)}</strong>
                            <small>Versão {a.policy_version} — {new Date(a.accepted_at).toLocaleDateString("pt-BR")}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* ── Consentimentos LGPD ───────────────────────────────── */}
                <section className="catalog-panel" aria-label="Consentimentos LGPD">
                  <div className="catalog-header">
                    <strong>Consentimentos LGPD</strong>
                    <small>{lgpdConsents.filter((c) => c.granted).length} ativo(s) · {lgpdConsents.filter((c) => c.consent_type === "data_deletion_request").length} solicitação(ões) de exclusão</small>
                  </div>
                  {lgpdConsents.length === 0 ? (
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                      Nenhum consentimento registrado ainda.
                    </p>
                  ) : (
                    <div className="member-list" style={{ maxHeight: 240, overflowY: "auto" }}>
                      {lgpdConsents.map((c) => (
                        <div key={c.id} className="member-row" style={{ fontSize: "0.875rem" }}>
                          <ScrollText size={16} style={{ color: c.consent_type === "data_deletion_request" ? "var(--color-danger)" : c.granted ? "var(--color-success)" : "var(--color-text-secondary)", flexShrink: 0 }} />
                          <div>
                            <strong>{(c.profiles as { full_name?: string | null; email?: string } | undefined)?.full_name ?? (c.profiles as { full_name?: string | null; email?: string } | undefined)?.email ?? c.user_id.slice(0, 8)}</strong>
                            <small>
                              {c.consent_type === "data_processing" ? "Tratamento de dados" : c.consent_type === "marketing" ? "Marketing" : c.consent_type === "data_deletion_request" ? "Solicitação de exclusão" : c.consent_type}
                              {" · "}{new Date(c.consented_at).toLocaleDateString("pt-BR")}
                            </small>
                          </div>
                          <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: c.consent_type === "data_deletion_request" ? "var(--color-danger)" : c.granted ? "var(--color-success)" : "var(--color-text-secondary)", fontWeight: 600 }}>
                            {c.consent_type === "data_deletion_request" ? "Exclusão" : c.granted ? "Ativo" : "Revogado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                </div>{/* fim catalog-grid dos cards */}
              </div>{/* fim policy-editor-stack */}
            </article>
          ) : null}
        </div>

        <footer className="client-admin-footer">
          <strong>{tenant.name}</strong>
          <span>Ambiente administrativo do cliente</span>
          <PolicyFooter tenantId={tenant.id} variant="inline" />
        </footer>
      </section>

      {isFamilyFormOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Cadastro de família">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span>Membresia</span>
                <h2>{familyForm.id ? "Editar família" : "Nova família"}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setIsFamilyFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleFamilySubmit}>
              <label>
                <span>Nome da família</span>
                <input
                  className="catalog-input"
                  placeholder="Ex.: Família Silva"
                  value={familyForm.name}
                  onChange={(event) => setFamilyForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label>
                <span>Observações</span>
                <textarea
                  className="catalog-input catalog-textarea"
                  placeholder="Observações internas (opcional)"
                  value={familyForm.notes}
                  onChange={(event) => setFamilyForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                />
              </label>

              <div className="modal-section">
                <div className="modal-section-header">
                  <strong>Dependentes</strong>
                  <small>Vincule membros do tenant a esta família e marque o responsável principal.</small>
                </div>

                <div className="family-add-grid">
                  <select
                    className="catalog-input"
                    value={familyMemberPickerId}
                    onChange={(event) => setFamilyMemberPickerId(event.target.value)}
                  >
                    <option value="">Selecionar membro</option>
                    {clientData.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="catalog-input"
                    value={familyMemberRelationship}
                    onChange={(event) => setFamilyMemberRelationship(event.target.value)}
                  >
                    <option value="self">Titular</option>
                    <option value="spouse">Cônjuge</option>
                    <option value="child">Filho(a)</option>
                    <option value="parent">Pai/Mãe</option>
                    <option value="guardian">Responsável</option>
                    <option value="sibling">Irmão(ã)</option>
                    <option value="other">Outro</option>
                  </select>

                  <label className="family-primary">
                    <input
                      type="checkbox"
                      checked={familyMemberPrimary}
                      onChange={(event) => setFamilyMemberPrimary(event.target.checked)}
                    />
                    <span>Principal</span>
                  </label>

                  <Button type="button" variant="secondary" onClick={addFamilyMemberToForm}>
                    Adicionar
                  </Button>
                  <Button type="button" variant="secondary" onClick={addFamilyDependentToForm}>
                    Novo dependente
                  </Button>
                </div>

                <div className="catalog-list">
                  {familyForm.members.length === 0 ? (
                    <div className="catalog-empty">Nenhum membro vinculado ainda.</div>
                  ) : null}

                  {familyForm.members.map((item) => {
                    const member = item.member_id ? clientData.members.find((row) => row.id === item.member_id) ?? null : null;
                    const canBePrimary = Boolean(item.member_id);
                    return (
                      <div key={item.id} className="ministry-row">
                        <div className="family-row-content">
                          <div style={{ display: "grid", gap: 6 }}>
                            <select
                              className="catalog-input"
                              value={item.member_id ?? ""}
                              onChange={(event) => updateFamilyMemberLink(item.id, event.target.value ? event.target.value : null)}
                            >
                              <option value="">Sem vínculo (dependente)</option>
                              {clientData.members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>

                            {item.member_id ? (
                              <strong>{member?.name ?? "Membro"}</strong>
                            ) : (
                              <div className="modal-grid">
                                <label>
                                  <span>Nome</span>
                                  <input
                                    className="catalog-input"
                                    placeholder="Nome do dependente"
                                    value={item.name}
                                    onChange={(event) => updateFamilyMember(item.id, { name: event.target.value })}
                                  />
                                </label>
                                <label>
                                  <span>Data de nascimento</span>
                                  <input
                                    className="catalog-input"
                                    type="date"
                                    value={item.date_of_birth}
                                    onChange={(event) => updateFamilyMember(item.id, { date_of_birth: event.target.value })}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                          <select
                            className="catalog-input"
                            value={item.relationship}
                            onChange={(event) => updateFamilyMember(item.id, { relationship: event.target.value })}
                          >
                            <option value="self">Titular</option>
                            <option value="spouse">Cônjuge</option>
                            <option value="child">Filho(a)</option>
                            <option value="parent">Pai/Mãe</option>
                            <option value="guardian">Responsável</option>
                            <option value="sibling">Irmão(ã)</option>
                            <option value="other">Outro</option>
                          </select>
                          <label className="ministry-admin">
                            <input
                              type="checkbox"
                              checked={item.is_primary}
                              disabled={!canBePrimary}
                              onChange={(event) => updateFamilyMember(item.id, { is_primary: event.target.checked })}
                            />
                            <span>Principal</span>
                          </label>
                        </div>
                        <button type="button" onClick={() => removeFamilyMember(item.id)} aria-label="Remover">
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {familySaveMessage ? <p className={`login-feedback ${familySaveStatus}`}>{familySaveMessage}</p> : null}

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setIsFamilyFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={familySaveStatus === "loading"} icon={<CheckCircle2 size={18} />}>
                  {familySaveStatus === "loading" ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isMemberFormOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Cadastro de membro">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span>Membresia</span>
                <h2>{memberForm.id ? "Editar membro" : "Novo membro"}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setIsMemberFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleMemberSubmit}>
              <TextField
                icon={<UsersRound size={18} />}
                label="Nome completo"
                placeholder="Nome do membro"
                type="text"
                value={memberForm.name}
                onChange={(event) => updateMemberForm("name", event.target.value)}
              />

              <div className="modal-grid">
                <TextField
                  icon={<Mail size={18} />}
                  label="E-mail"
                  placeholder="email@dominio.com"
                  type="email"
                  value={memberForm.email}
                  onChange={(event) => updateMemberForm("email", event.target.value)}
                />
                <TextField
                  icon={<Clock3 size={18} />}
                  label="Telefone"
                  placeholder="(00) 00000-0000"
                  type="text"
                  value={memberForm.phone}
                  onChange={(event) => updateMemberForm("phone", event.target.value)}
                />
              </div>

              <label>
                <span>Status</span>
                <select
                  className="catalog-input"
                  value={memberForm.status}
                  onChange={(event) => updateMemberForm("status", event.target.value as MemberFormState["status"])}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="visitor">Visitante</option>
                  <option value="in_process">Em processo</option>
                </select>
              </label>

              <div className="modal-section">
                <div className="modal-section-header">
                  <strong>Dados pessoais</strong>
                  <small>Informações de contato e cadastro (opcionais).</small>
                </div>

                <div className="modal-grid">
                  <label>
                    <span>Data de nascimento</span>
                    <input
                      className="catalog-input"
                      type="date"
                      value={memberForm.date_of_birth}
                      onChange={(event) => updateMemberForm("date_of_birth", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>
                      Documento
                      {(() => {
                        const info = formatDocument(memberForm.document_number);
                        if (info.type === "cpf") return <em className="doc-type-badge cpf">CPF</em>;
                        if (info.type === "rg")  return <em className="doc-type-badge rg">RG</em>;
                        return null;
                      })()}
                    </span>
                    <input
                      className={`catalog-input${docError ? " input-error" : ""}`}
                      placeholder="CPF ou RG"
                      value={memberForm.document_number}
                      onChange={(event) => {
                        const info = formatDocument(event.target.value);
                        updateMemberForm("document_number", info.formatted);
                        setDocError(info.error);
                      }}
                    />
                    {docError ? <small className="field-error">{docError}</small> : null}
                  </label>
                </div>

                <div className="cep-field-wrap">
                  <label>
                    <span>CEP</span>
                    <div className="cep-input-row">
                      <input
                        className={`catalog-input${cepError ? " input-error" : ""}`}
                        placeholder="00000-000"
                        value={memberForm.address_postal_code}
                        maxLength={9}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
                          const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
                          updateMemberForm("address_postal_code", formatted);
                          setCepLookupStatus("idle");
                          if (digits.length > 0 && digits.length < 8) {
                            setCepError("CEP deve ter 8 dígitos");
                          } else {
                            setCepError(null);
                          }
                        }}
                        onBlur={handleCepLookup}
                      />
                      {cepLookupStatus === "loading" ? (
                        <span className="cep-status loading">Buscando...</span>
                      ) : null}
                    </div>
                    {cepError ? <small className="field-error">{cepError}</small> : null}
                  </label>
                </div>

                <label>
                  <span>Endereço</span>
                  <input
                    className="catalog-input"
                    placeholder="Rua, número, bairro"
                    value={memberForm.address_line1}
                    onChange={(event) => updateMemberForm("address_line1", event.target.value)}
                  />
                </label>

                <div className="modal-grid">
                  <label>
                    <span>Cidade</span>
                    <input
                      className="catalog-input"
                      placeholder="Cidade"
                      value={memberForm.address_city}
                      onChange={(event) => updateMemberForm("address_city", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Estado (UF)</span>
                    <input
                      className="catalog-input"
                      placeholder="UF"
                      maxLength={2}
                      value={memberForm.address_state}
                      onChange={(event) => updateMemberForm("address_state", event.target.value.toUpperCase())}
                    />
                  </label>
                </div>
              </div>

              <label>
                <span>Observações</span>
                <textarea
                  className="catalog-input catalog-textarea"
                  placeholder="Anotações internas (opcional)"
                  value={memberForm.notes}
                  onChange={(event) => updateMemberForm("notes", event.target.value)}
                  rows={3}
                />
              </label>

              <div className="modal-section">
                <div className="modal-section-header">
                  <strong>Cargos</strong>
                  <small>Vínculos de função no tenant (base do sistema + lista do seu tenant).</small>
                </div>
                <div className="check-grid">
                  {clientData.catalogRoles.map((role) => (
                    <label key={role.id} className="check-row">
                      <input
                        type="checkbox"
                        checked={memberForm.roleIds.includes(role.id)}
                        onChange={() => toggleMemberRole(role.id)}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-header">
                  <strong>Ministérios</strong>
                  <small>
                    Marque Admin para permitir acesso administrativo ao módulo do ministério quando existir.
                  </small>
                </div>

                <div className="catalog-add">
                  <select
                    className="catalog-input"
                    value={ministryPickerId}
                    onChange={(event) => setMinistryPickerId(event.target.value)}
                  >
                    <option value="">Selecionar ministério</option>
                    {clientData.catalogMinistries.map((ministry) => (
                      <option key={ministry.id} value={ministry.id}>
                        {ministry.name}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="secondary" onClick={() => addMemberMinistry(ministryPickerId)}>
                    Adicionar
                  </Button>
                </div>

                <div className="catalog-list">
                  {memberForm.ministries.length === 0 ? (
                    <div className="catalog-empty">Nenhum ministério vinculado ainda.</div>
                  ) : null}
                  {memberForm.ministries.map((item) => (
                    <div key={item.ministry_id} className="ministry-row">
                      <div>
                        <strong>{catalogMinistryNameById[item.ministry_id] ?? "Ministério"}</strong>
                        <label className="ministry-admin">
                          <input
                            type="checkbox"
                            checked={item.is_admin}
                            onChange={(event) => setMemberMinistryAdmin(item.ministry_id, event.target.checked)}
                          />
                          <span>Admin</span>
                        </label>
                      </div>
                      <button type="button" onClick={() => removeMemberMinistry(item.ministry_id)} aria-label="Remover">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {isTenantAdmin ? (
                <div className="modal-section">
                  <div className="modal-section-header">
                    <strong>Acesso administrativo por módulo</strong>
                    <small>Libere módulos para este membro administrar. Apenas módulos ativos no tenant aparecerão no menu do membro.</small>
                  </div>
                  <div className="check-grid">
                    {clientData.allPlatformModules.map((module) => {
                      const isActiveForTenant = Boolean(activeModuleIdByCode[module.code]);
                      return (
                        <label
                          key={module.id}
                          className={`check-row${!isActiveForTenant ? " check-row-disabled" : ""}`}
                          title={!isActiveForTenant ? "Módulo não ativado para este tenant" : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={memberForm.moduleAdminModuleIds.includes(module.id)}
                            onChange={() => toggleMemberModuleAdmin(module.id)}
                            disabled={!isActiveForTenant}
                          />
                          <span>{module.name}</span>
                          {!isActiveForTenant ? <em className="check-row-tag">inativo</em> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {memberForm.id ? (
                <div className="modal-section">
                  <div className="modal-section-header">
                    <strong>Histórico</strong>
                    <small>Registros internos para acompanhamento (ex.: batismo, integração, atendimento).</small>
                  </div>

                  {memberHistoryStatus === "loading" ? (
                    <div className="catalog-empty">Carregando histórico...</div>
                  ) : memberHistoryStatus === "error" ? (
                    <div className="catalog-empty">Não foi possível carregar o histórico.</div>
                  ) : memberHistory.length === 0 ? (
                    <div className="catalog-empty">Nenhum registro ainda.</div>
                  ) : (
                    <div className="catalog-list">
                      {memberHistory.map((item) => (
                        <div key={item.id} className="catalog-row system">
                          <span>
                            <strong>{item.event_type}</strong>{" "}
                            <small>{new Date(item.occurred_at).toLocaleDateString("pt-BR")}</small>
                          </span>
                          {item.notes ? <small>{item.notes}</small> : null}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="catalog-add">
                    <input
                      className="catalog-input"
                      placeholder="Tipo (ex.: Batismo, Integração, Atendimento)"
                      value={memberHistoryDraftType}
                      onChange={(event) => setMemberHistoryDraftType(event.target.value)}
                    />
                    <Button type="button" variant="secondary" onClick={handleAddMemberHistory}>
                      Adicionar
                    </Button>
                  </div>
                  <textarea
                    className="catalog-input catalog-textarea"
                    placeholder="Observações (opcional)"
                    value={memberHistoryDraftNotes}
                    onChange={(event) => setMemberHistoryDraftNotes(event.target.value)}
                    rows={2}
                  />
                </div>
              ) : null}

              {memberForm.id ? (() => {
                const memberFamily = clientData.families.find((f) =>
                  clientData.familyMembersByFamilyId[f.id]?.some((fm) => fm.member_id === memberForm.id),
                );
                const dependents = memberFamily
                  ? (clientData.familyMembersByFamilyId[memberFamily.id] ?? []).filter((fm) => fm.member_id !== memberForm.id)
                  : [];
                const calcAgeDep = (dob: string | null) => {
                  if (!dob) return null;
                  const birth = new Date(dob + "T12:00:00");
                  const now = new Date();
                  let age = now.getFullYear() - birth.getFullYear();
                  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
                  return age;
                };
                const alreadyDepIds = new Set(dependents.map((d) => d.member_id));
                const availableForDep = clientData.members.filter((m) => m.id !== memberForm.id && !alreadyDepIds.has(m.id));
                return (
                  <div className="modal-section">
                    <div className="modal-section-header">
                      <strong>Dependentes</strong>
                      <small>Filhos, cônjuge e demais familiares vinculados a este membro.</small>
                    </div>
                    {dependents.length === 0 ? (
                      <div className="catalog-empty">Nenhum dependente vinculado ainda.</div>
                    ) : (
                      <div className="catalog-list">
                        {dependents.map((dep) => {
                          const age = calcAgeDep(dep.date_of_birth);
                          const isKidsEligible = age !== null && age < 13;
                          const relLabel: Record<string, string> = { self: "Titular", spouse: "Cônjuge", child: "Filho(a)", parent: "Pai/Mãe", guardian: "Responsável", sibling: "Irmão(ã)", other: "Outro" };
                          return (
                            <div key={dep.id} className="ministry-row">
                              <div>
                                <strong>{dep.name}</strong>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <small>{relLabel[dep.relationship] ?? dep.relationship}{dep.date_of_birth ? ` · ${age !== null ? `${age} anos` : dep.date_of_birth}` : ""}</small>
                                  {isKidsEligible ? <em className="dep-kids-badge"><Baby size={10} /> Kids</em> : null}
                                </div>
                              </div>
                              <button type="button" onClick={() => handleRemoveMemberDependent(dep.id)} aria-label="Remover">
                                <X size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="dep-add-form">
                      <div className="dep-add-row">
                        <select
                          className="catalog-input"
                          value={memberDependentPickerId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setMemberDependentPickerId(id);
                            if (id) {
                              const m = clientData.members.find((x) => x.id === id);
                              if (m) { setMemberDependentName(m.name); setMemberDependentDob(m.date_of_birth ?? ""); }
                            } else {
                              setMemberDependentName(""); setMemberDependentDob("");
                            }
                          }}
                        >
                          <option value="">— Ou selecionar membro existente —</option>
                          {availableForDep.map((m) => {
                            const age = calcAgeDep(m.date_of_birth ?? null);
                            return (
                              <option key={m.id} value={m.id}>
                                {m.name}{age !== null ? ` (${age} anos)` : ""}
                              </option>
                            );
                          })}
                        </select>
                        <select
                          className="catalog-input"
                          value={memberDependentRelationship}
                          onChange={(e) => setMemberDependentRelationship(e.target.value)}
                        >
                          <option value="child">Filho(a)</option>
                          <option value="spouse">Cônjuge</option>
                          <option value="parent">Pai/Mãe</option>
                          <option value="sibling">Irmão(ã)</option>
                          <option value="guardian">Responsável</option>
                          <option value="other">Outro</option>
                        </select>
                      </div>
                      <div className="dep-add-row">
                        <input
                          className="catalog-input"
                          placeholder="Nome completo do dependente"
                          value={memberDependentName}
                          onChange={(e) => setMemberDependentName(e.target.value)}
                          disabled={!!memberDependentPickerId}
                        />
                        <label style={{ display: "flex", flexDirection: "column", gap: 2, flex: "0 0 160px" }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Data de nascimento</span>
                          <input
                            className="catalog-input"
                            type="date"
                            value={memberDependentDob}
                            onChange={(e) => setMemberDependentDob(e.target.value)}
                            disabled={!!memberDependentPickerId}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAddMemberDependent}
                          disabled={!memberDependentName.trim() && !memberDependentPickerId}
                        >
                          Adicionar
                        </Button>
                      </div>
                      {memberDependentDob && (() => {
                        const age = calcAgeDep(memberDependentDob);
                        return age !== null && age < 13 ? (
                          <p style={{ fontSize: 11, color: "#2e7d32", margin: 0 }}>
                            ✓ Com menos de 13 anos — aparecerá automaticamente na busca do módulo Kids.
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                );
              })() : null}

              {memberSaveMessage ? <p className={`login-feedback ${memberSaveStatus}`}>{memberSaveMessage}</p> : null}

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setIsMemberFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={memberSaveStatus === "loading"} icon={<CheckCircle2 size={18} />}>
                  {memberSaveStatus === "loading" ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {/* ── Modal: Formulário de Evento ─────────────────────────────────── */}
      {isEventFormOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Cadastro de evento">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span>Módulo de Eventos</span>
                <h2>{eventForm.id ? "Editar evento" : "Novo evento"}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setIsEventFormOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form className="modal-body" onSubmit={handleEventSubmit}>
              <label>
                <span>Título *</span>
                <input
                  className="catalog-input"
                  placeholder="Ex.: Culto de Domingo, Conferência de Jovens"
                  value={eventForm.title}
                  onChange={(e) => updateEventForm("title", e.target.value)}
                  required
                />
              </label>

              <div className="modal-section">
                <div className="modal-section-header">
                  <strong>Banner do evento (opcional)</strong>
                  <small>Imagem exibida no topo do card do evento (e-mail e portal do membro).</small>
                </div>
                {eventBannerPreviewUrl ? (
                  <img src={eventBannerPreviewUrl} alt="Banner do evento" className="event-banner-preview" />
                ) : null}
                <div className="event-banner-actions">
                  <input
                    className="catalog-input"
                    type="file"
                    accept="image/*"
                    onChange={handleEventBannerChange}
                  />
                  {eventForm.cover_image_url || eventBannerPreviewUrl ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRemoveEventBanner}
                      disabled={eventBannerUploadStatus === "loading"}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
                {!eventForm.id && eventBannerFile ? (
                  <small className="event-banner-hint">O upload do banner é concluído após criar o evento.</small>
                ) : null}
                {eventBannerUploadMessage ? <p className={`login-feedback ${eventBannerUploadStatus}`}>{eventBannerUploadMessage}</p> : null}
              </div>

              <div className="modal-grid">
                <label>
                  <span>Início *</span>
                  <input
                    className="catalog-input"
                    type="datetime-local"
                    value={eventForm.event_date}
                    onChange={(e) => updateEventForm("event_date", e.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>Término (opcional)</span>
                  <input
                    className="catalog-input"
                    type="datetime-local"
                    value={eventForm.ends_at ?? ""}
                    onChange={(e) => updateEventForm("ends_at", e.target.value)}
                  />
                </label>
              </div>

              <label>
                <span>Local</span>
                <input
                  className="catalog-input"
                  placeholder="Ex.: Templo principal, Salão B"
                  value={eventForm.location ?? ""}
                  onChange={(e) => updateEventForm("location", e.target.value)}
                />
              </label>

              <label>
                <span>Descrição</span>
                <div className="rich-editor">
                  <div className="rich-editor-toolbar" role="toolbar" aria-label="Formatar descrição">
                    <button type="button" onClick={() => applyEventRichCommand("bold")} aria-label="Negrito">
                      <strong>B</strong>
                    </button>
                    <button type="button" onClick={() => applyEventRichCommand("italic")} aria-label="Itálico">
                      <em>I</em>
                    </button>
                    <button type="button" onClick={() => applyEventRichCommand("underline")} aria-label="Sublinhar">
                      <span style={{ textDecoration: "underline", fontWeight: 700 }}>U</span>
                    </button>
                    <button type="button" onClick={() => applyEventRichCommand("insertUnorderedList")} aria-label="Lista">
                      •
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Link (https://...)");
                        if (url) applyEventRichCommand("createLink", url);
                      }}
                      aria-label="Inserir link"
                    >
                      Link
                    </button>
                  </div>
                  <div
                    ref={eventDescriptionEditorRef}
                    className="rich-editor-area"
                    contentEditable
                    onInput={syncEventDescriptionFromEditor}
                    onBlur={syncEventDescriptionFromEditor}
                    data-placeholder="Detalhes do evento (opcional)"
                  />
                </div>
              </label>

              <div className="modal-grid">
                <label>
                  <span>Tipo</span>
                  <select
                    className="catalog-input"
                    value={eventForm.event_type}
                    onChange={(e) => updateEventForm("event_type", e.target.value)}
                  >
                    <option value="culto">Culto</option>
                    <option value="conferencia">Conferência</option>
                    <option value="retiro">Retiro</option>
                    <option value="jovens">Jovens</option>
                    <option value="infantil">Infantil</option>
                    <option value="social">Social</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select
                    className="catalog-input"
                    value={eventForm.status}
                    onChange={(e) => updateEventForm("status", e.target.value)}
                  >
                    <option value="rascunho">Rascunho (não visível)</option>
                    <option value="publicado">Publicado (visível a todos)</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Cor no calendário</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={eventForm.color ?? "#6d28d9"}
                    onChange={(e) => updateEventForm("color", e.target.value)}
                    style={{ width: 40, height: 36, borderRadius: 6, border: "1px solid var(--color-border)", cursor: "pointer", padding: 2 }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Cor exibida no calendário para identificar o evento
                  </span>
                </div>
              </label>

              {eventSaveMessage ? <p className={`login-feedback ${eventSaveStatus}`}>{eventSaveMessage}</p> : null}

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={() => setIsEventFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={eventSaveStatus === "loading"} icon={<CheckCircle2 size={18} />}>
                  {eventSaveStatus === "loading" ? "Salvando..." : eventForm.id ? "Salvar alterações" : "Criar evento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Modal: Notificações de Evento ────────────────────────────────── */}
      {eventNotifyOpen && eventNotifyTarget ? (
        <div className="modal-backdrop" onClick={() => setEventNotifyOpen(false)}>
          <div className="modal-sheet event-notify-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <Send size={20} />
                <strong>Notificar membros</strong>
              </div>
              <button className="modal-close" type="button" onClick={() => setEventNotifyOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: "var(--color-bg-subtle)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                <strong style={{ fontSize: "0.95rem" }}>{eventNotifyTarget.title}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.825rem", color: "var(--color-text-secondary)" }}>
                  {new Date(eventNotifyTarget.event_date).toLocaleString("pt-BR", {
                    weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                  {eventNotifyTarget.location ? ` · ${eventNotifyTarget.location}` : ""}
                </p>
              </div>

              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: 16 }}>
                Escolha como deseja notificar todos os membros ativos da igreja sobre este evento:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* E-mail */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Mail size={18} style={{ color: "var(--color-primary)" }} />
                      <strong style={{ fontSize: "0.9rem" }}>E-mail</strong>
                    </div>
                    <Button
                      type="button"
                      disabled={eventNotifyStatus === "loading"}
                      onClick={handleEventSendEmail}
                    >
                      {eventNotifyStatus === "loading" ? "Enviando..." : "Enviar e-mails"}
                    </Button>
                  </div>
                  <small style={{ color: "var(--color-text-secondary)" }}>
                    Envia e-mail para todos os membros ativos com endereço de e-mail cadastrado.
                  </small>
                </div>

                {/* WhatsApp */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <MessageCircle size={18} style={{ color: "#25d366" }} />
                      <strong style={{ fontSize: "0.9rem" }}>WhatsApp</strong>
                    </div>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `📅 *${eventNotifyTarget.title}*\n\n🗓️ ${new Date(eventNotifyTarget.event_date).toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}${eventNotifyTarget.ends_at ? ` até ${new Date(eventNotifyTarget.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}${eventNotifyTarget.location ? `\n📍 ${eventNotifyTarget.location}` : ""}${eventNotifyTarget.description ? `\n\n${eventNotifyTarget.description}` : ""}\n\nEste comunicado foi enviado pela gestão da igreja.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "#25d366", color: "#fff", borderRadius: 6,
                        padding: "6px 14px", fontSize: "0.85rem", fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Abrir WhatsApp
                    </a>
                  </div>
                  <small style={{ color: "var(--color-text-secondary)" }}>
                    Abre o WhatsApp com mensagem pré-preenchida para envio manual.
                  </small>
                </div>

                {/* Push */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "14px 16px", opacity: 0.55 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Bell size={18} />
                    <strong style={{ fontSize: "0.9rem" }}>Push notification</strong>
                    <em style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)", padding: "1px 6px", borderRadius: 4 }}>Em breve</em>
                  </div>
                  <small style={{ color: "var(--color-text-secondary)" }}>
                    Disponível no App(Em breve).
                  </small>
                </div>
              </div>

              {eventNotifyMessage ? (
                <p className={`login-feedback ${eventNotifyStatus}`} style={{ marginTop: 12 }}>
                  {eventNotifyMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {pushComposerOpen ? (
        <div className="modal-overlay" onClick={closePushComposer}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div>
                <Bell size={20} />
                <strong>
                  Enviar push — {pushComposerModule === "worship" ? "Louvor" : pushComposerModule === "kids" ? "Kids" : "Escola Bíblica"}
                </strong>
              </div>
              <button className="modal-close" type="button" onClick={closePushComposer}><X size={18} /></button>
            </div>
            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPush();
              }}
            >
              <div className="modal-grid">
                <label style={{ gridColumn: "span 2" }}>
                  <span>Enviar para</span>
                  <select
                    value={pushComposerMode}
                    onChange={(e) => {
                      const next = e.target.value as typeof pushComposerMode;
                      setPushComposerMode(next);
                      setPushCandidates([]);
                      setPushSelectedProfileIds([]);
                      setPushRecipientSearch("");
                      setPushCandidatesMessage("");
                      void loadPushCandidates(next, pushComposerModule);
                    }}
                  >
                    {pushComposerModule === "worship" ? (
                      <>
                        <option value="worship_ministry">Membros do ministério de Louvor</option>
                        <option value="worship_admins">Admins do módulo</option>
                        <option value="worship_selected">Selecionar usuários</option>
                      </>
                    ) : pushComposerModule === "kids" ? (
                      <>
                        <option value="kids_checked_in">Responsáveis (check-in da turma)</option>
                        <option value="kids_selected">Selecionar responsáveis</option>
                      </>
                    ) : (
                      <>
                        <option value="bible_all">Todos os alunos matriculados</option>
                        <option value="bible_selected">Selecionar alunos</option>
                      </>
                    )}
                  </select>
                </label>
              </div>

              {pushComposerModule === "kids" ? (
                <div className="modal-grid" style={{ marginTop: 12 }}>
                  <label>
                    <span>Turma</span>
                    <select
                      value={pushKidsGroupId}
                      onChange={(e) => {
                        setPushKidsGroupId(e.target.value);
                        void loadPushCandidates(pushComposerMode, pushComposerModule);
                      }}
                    >
                      <option value="">Selecione</option>
                      {(clientData?.kidsGroups ?? []).map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Data</span>
                    <input
                      type="date"
                      className="catalog-input"
                      value={pushKidsDate}
                      onChange={(e) => {
                        setPushKidsDate(e.target.value);
                        void loadPushCandidates(pushComposerMode, pushComposerModule);
                      }}
                    />
                  </label>
                </div>
              ) : null}

              {pushComposerMode === "worship_selected" || pushComposerMode === "kids_selected" || pushComposerMode === "bible_selected" ? (
                <div style={{ marginTop: 12 }}>
                  <label>
                    <span>Buscar</span>
                    <input
                      className="catalog-input"
                      placeholder="Digite para filtrar..."
                      value={pushRecipientSearch}
                      onChange={(e) => setPushRecipientSearch(e.target.value)}
                    />
                  </label>

                  {pushCandidatesMessage ? (
                    <p className={`login-feedback ${pushCandidatesStatus === "error" ? "error" : "success"}`} style={{ marginTop: 10 }}>
                      {pushCandidatesMessage}
                    </p>
                  ) : null}

                  <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto", border: "1px solid var(--color-border)", borderRadius: 10, padding: 10 }}>
                    {pushCandidatesStatus === "loading" ? (
                      <div className="catalog-empty">Carregando usuários...</div>
                    ) : (
                      (() => {
                        const term = pushRecipientSearch.trim().toLowerCase();
                        const filtered = term
                          ? pushCandidates.filter((c) => `${c.label} ${c.meta ?? ""}`.toLowerCase().includes(term))
                          : pushCandidates;

                        if (filtered.length === 0) {
                          return <div className="catalog-empty">Nenhum usuário encontrado.</div>;
                        }

                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {filtered.map((c) => {
                              const checked = pushSelectedProfileIds.includes(c.profile_id);
                              return (
                                <label key={c.profile_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setPushSelectedProfileIds((prev) =>
                                        prev.includes(c.profile_id) ? prev.filter((id) => id !== c.profile_id) : [...prev, c.profile_id],
                                      );
                                    }}
                                  />
                                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                                    <strong style={{ fontSize: "0.9rem" }}>{c.label}</strong>
                                    {c.meta ? <small style={{ color: "var(--color-text-secondary)" }}>{c.meta}</small> : null}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()
                    )}
                  </div>

                  <small style={{ display: "block", marginTop: 8, color: "var(--color-text-secondary)" }}>
                    Selecionados: {pushSelectedProfileIds.length}
                  </small>
                </div>
              ) : null}

              <div className="modal-grid" style={{ marginTop: 12 }}>
                <label style={{ gridColumn: "span 2" }}>
                  <span>Título</span>
                  <input className="catalog-input" required value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Ex.: Nova escala publicada" />
                </label>
                <label style={{ gridColumn: "span 2" }}>
                  <span>Mensagem</span>
                  <textarea className="catalog-input catalog-textarea" required rows={4} value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Digite a mensagem do push..." />
                </label>
              </div>

              {pushSendMessage ? (
                <p className={`login-feedback ${pushSendStatus}`} style={{ marginTop: 12 }}>
                  {pushSendMessage}
                </p>
              ) : null}

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={closePushComposer}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pushSendStatus === "loading"} icon={<Send size={16} />}>
                  {pushSendStatus === "loading" ? "Enviando..." : "Enviar push"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Modal: Criar / Editar Comunicado ────────────────────────────── */}
      {isAnnouncementFormOpen ? (
        <div className="modal-overlay" onClick={() => setIsAnnouncementFormOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <Bell size={20} />
                <strong>{announcementForm.id ? "Editar comunicado" : "Novo comunicado"}</strong>
              </div>
              <button type="button" onClick={() => setIsAnnouncementFormOpen(false)}><X size={18} /></button>
            </div>
            <form className="modal-body" onSubmit={handleAnnouncementSubmit}>
              <label>
                <span>Título</span>
                <input
                  className="catalog-input"
                  required
                  placeholder="Título do comunicado"
                  value={announcementForm.title}
                  onChange={(e) => updateAnnouncementForm("title", e.target.value)}
                />
              </label>

              <label>
                <span>Mensagem</span>
                <div className="rich-editor">
                  <div className="rich-editor-toolbar" role="toolbar" aria-label="Formatar mensagem">
                    <button type="button" onClick={() => applyAnnouncementRichCommand("bold")} aria-label="Negrito">
                      <strong>B</strong>
                    </button>
                    <button type="button" onClick={() => applyAnnouncementRichCommand("italic")} aria-label="Itálico">
                      <em>I</em>
                    </button>
                    <button type="button" onClick={() => applyAnnouncementRichCommand("underline")} aria-label="Sublinhar">
                      <span style={{ textDecoration: "underline", fontWeight: 700 }}>U</span>
                    </button>
                    <button type="button" onClick={() => applyAnnouncementRichCommand("insertUnorderedList")} aria-label="Lista">
                      •
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Link (https://...)");
                        if (url) applyAnnouncementRichCommand("createLink", url);
                      }}
                      aria-label="Inserir link"
                    >
                      Link
                    </button>
                  </div>
                  <div
                    ref={announcementEditorRef}
                    className="rich-editor-area"
                    contentEditable
                    onInput={syncAnnouncementFromEditor}
                    onBlur={syncAnnouncementFromEditor}
                    data-placeholder="Escreva o comunicado aqui..."
                  />
                </div>
              </label>

              <div className="modal-grid">
                <label>
                  <span>Data de publicação</span>
                  <input
                    type="datetime-local"
                    className="catalog-input"
                    value={announcementForm.published_at ? announcementForm.published_at.slice(0, 16) : ""}
                    onChange={(e) => updateAnnouncementForm("published_at", e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString())}
                  />
                </label>
                <label>
                  <span>Válido até (opcional)</span>
                  <input
                    type="datetime-local"
                    className="catalog-input"
                    value={announcementForm.expires_at ? announcementForm.expires_at.slice(0, 16) : ""}
                    onChange={(e) => updateAnnouncementForm("expires_at", e.target.value ? new Date(e.target.value).toISOString() : "")}
                  />
                  <small style={{ color: "var(--color-text-secondary)", marginTop: 4, display: "block" }}>
                    Após esta data o comunicado some para os membros.
                  </small>
                </label>
              </div>

              {announcementSaveMessage ? (
                <p className={`login-feedback ${announcementSaveStatus}`}>{announcementSaveMessage}</p>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAnnouncementFormOpen(false)}>
                  Cancelar
                </button>
                <Button type="submit" disabled={announcementSaveStatus === "loading"} icon={<ScrollText size={16} />}>
                  {announcementSaveStatus === "loading" ? "Salvando..." : announcementForm.id ? "Salvar alterações" : "Publicar comunicado"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Modal: Notificar membros (comunicado) ───────────────────────── */}
      {announcementNotifyOpen && announcementNotifyTarget ? (
        <div className="modal-overlay" onClick={() => setAnnouncementNotifyOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <Send size={20} />
                <strong>Notificar membros</strong>
              </div>
              <button type="button" onClick={() => setAnnouncementNotifyOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: "var(--color-bg-subtle)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                <strong style={{ fontSize: "0.95rem" }}>{announcementNotifyTarget.title}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.825rem", color: "var(--color-text-secondary)" }}>
                  Publicado em {new Date(announcementNotifyTarget.published_at).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: 16 }}>
                Escolha como deseja notificar todos os membros ativos sobre este comunicado:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* E-mail */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Mail size={18} style={{ color: "var(--color-primary)" }} />
                      <strong style={{ fontSize: "0.9rem" }}>E-mail</strong>
                    </div>
                    <Button
                      type="button"
                      disabled={announcementNotifyStatus === "loading"}
                      onClick={handleAnnouncementSendEmail}
                    >
                      {announcementNotifyStatus === "loading" ? "Enviando..." : "Enviar e-mails"}
                    </Button>
                  </div>
                  <small style={{ color: "var(--color-text-secondary)" }}>
                    Envia e-mail para todos os membros ativos com endereço cadastrado.
                  </small>
                </div>

                {/* WhatsApp */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <MessageCircle size={18} style={{ color: "#25d366" }} />
                      <strong style={{ fontSize: "0.9rem" }}>WhatsApp</strong>
                    </div>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `📢 *${announcementNotifyTarget.title}*\n\n${announcementNotifyTarget.message}\n\nEste comunicado foi enviado pela gestão da igreja.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "#25d366", color: "#fff", borderRadius: 6,
                        padding: "6px 14px", fontSize: "0.85rem", fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Abrir WhatsApp
                    </a>
                  </div>
                  <small style={{ color: "var(--color-text-secondary)" }}>
                    Abre o WhatsApp com mensagem pré-preenchida para envio manual.
                  </small>
                </div>

                {/* Push */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "14px 16px", opacity: 0.55 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Bell size={18} />
                    <strong style={{ fontSize: "0.9rem" }}>Push notification</strong>
                    <em style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", background: "var(--color-bg-subtle)", padding: "1px 6px", borderRadius: 4 }}>Em breve</em>
                  </div>
                  <small style={{ color: "var(--color-text-secondary)" }}>
                    Disponível no App(Em breve).
                  </small>
                </div>
              </div>

              {announcementNotifyMessage ? (
                <p className={`login-feedback ${announcementNotifyStatus}`} style={{ marginTop: 12 }}>
                  {announcementNotifyMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Modal: Pré-visualização de Comunicado ───────────────────────── */}
      {announcementPreviewOpen && announcementPreviewTarget ? (
        <div className="modal-overlay" onClick={() => setAnnouncementPreviewOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={20} />
                <strong>Pré-visualização</strong>
              </div>
              <button type="button" onClick={() => setAnnouncementPreviewOpen(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 22px", overflowY: "auto", maxHeight: "75vh" }}>
              <div style={{
                background: "linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)",
                borderRadius: "10px 10px 0 0",
                padding: "18px 22px",
              }}>
                <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#e9d5ff" }}>
                  📢 Comunicado
                </p>
                <h2 style={{ margin: 0, color: "#fff", fontSize: "1.25rem" }}>{announcementPreviewTarget.title}</h2>
                <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#c4b5fd" }}>
                  Publicado em {new Date(announcementPreviewTarget.published_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div style={{
                border: "1px solid #e5e7eb", borderTop: "none",
                borderRadius: "0 0 10px 10px",
                padding: "20px 22px",
                fontSize: "0.95rem", lineHeight: 1.75, color: "#374151",
              }}>
                {announcementPreviewTarget.message_html ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(announcementPreviewTarget.message_html) }} />
                ) : (
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{announcementPreviewTarget.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Modal: Preview do Evento ─────────────────────────────────────── */}
      {eventPreviewOpen && eventPreviewTarget ? (
        <div className="modal-overlay" onClick={() => setEventPreviewOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={20} />
                <strong>Pré-visualização do evento</strong>
              </div>
              <button type="button" onClick={() => setEventPreviewOpen(false)}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 22px", overflowY: "auto", maxHeight: "75vh" }}>
              <div
                dangerouslySetInnerHTML={{
                  __html: renderEventCardHtml(
                    eventPreviewTarget,
                    { name: clientData!.tenant.name, contact_phone: null },
                    {
                      bannerUrl: eventPreviewTarget.cover_image_url
                        ? /^https?:\/\//i.test(eventPreviewTarget.cover_image_url)
                          ? eventPreviewTarget.cover_image_url
                          : supabase.storage.from("event-banners").getPublicUrl(eventPreviewTarget.cover_image_url).data.publicUrl
                        : null,
                    },
                  ),
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

    </main>
  );
}
