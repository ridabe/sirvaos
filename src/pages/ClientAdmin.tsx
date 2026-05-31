import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  DollarSign,
  Edit3,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Music,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
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
import { useEffect, useMemo, useState } from "react";
import { Button, TextField } from "../design-system/components";
import { supabase } from "../lib/supabase";
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
  location: string | null;
  event_date: string;
  created_at: string;
};

type AnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  published_at: string;
  created_at: string;
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
  tenant_id: string;
  family_id: string;
  member_id: string;
  relationship: string;
  is_primary: boolean;
  members: { name: string; email: string | null } | null;
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

type ClientDashboardData = {
  profile: TenantProfile;
  tenant: TenantRecord;
  members: MemberRecord[];
  memberRoleIdsByMemberId: Record<string, string[]>;
  memberMinistriesByMemberId: Record<string, Array<{ ministry_id: string; name: string; is_admin: boolean }>>;
  families: FamilyRecord[];
  familyMembersByFamilyId: Record<string, Array<{ member_id: string; name: string; relationship: string; is_primary: boolean }>>;
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
  allPlatformModules: TenantModuleRecord[];
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
  members: Array<{ member_id: string; relationship: string; is_primary: boolean }>;
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
  location: "",
  event_date: "",
  tenant_id: "",
};

const emptyAnnouncementForm: AnnouncementFormState = {
  id: "",
  title: "",
  message: "",
  published_at: new Date().toISOString(),
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
      { member_id: "member-1", name: "Mariana Souza", relationship: "self", is_primary: true },
      { member_id: "member-2", name: "Paulo Alves", relationship: "spouse", is_primary: false },
    ],
  },
  events: [
    {
      id: "event-1",
      title: "Culto Dominical",
      description: "Adoração, palavra e comunhão.",
      location: "Templo principal",
      event_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    },
    {
      id: "event-2",
      title: "Ensaio de Louvor",
      description: "Preparação para o culto.",
      location: "Sala Multiuso",
      event_date: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    },
  ],
  announcements: [
    {
      id: "announce-1",
      title: "Culto Especial",
      message: "Não perca o culto especial de domingo com convidados.",
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
      code: "calendar",
      name: "Eventos",
      description: "Calendário e programação de cultos.",
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
    { id: "module-2", code: "calendar",      name: "Calendário Central", description: "Agenda de cultos e eventos.",                  status: "active" },
    { id: "module-3", code: "announcements", name: "Comunicados",        description: "Comunicados gerais para membros.",              status: "active" },
    { id: "module-4", code: "worship",       name: "Louvor",             description: "Escalas e confirmação de presença.",            status: "active" },
    { id: "module-5", code: "financial",     name: "Financeiro",         description: "Dízimos, ofertas e relatórios.",                status: "active" },
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
};

const clientTabs = [
  { key: "overview", label: "Visão geral", icon: LayoutDashboard },
  { key: "members", label: "Membros", icon: UsersRound },
  { key: "families", label: "Famílias", icon: Users2 },
  { key: "events", label: "Calendário", icon: CalendarCheck },
  { key: "worship", label: "Louvor", icon: Music },
  { key: "financial", label: "Financeiro", icon: DollarSign },
  { key: "notices", label: "Comunicados", icon: Bell },
  { key: "lists", label: "Listagens", icon: Edit3 },
  { key: "theme", label: "Identidade", icon: Palette },
  { key: "users", label: "Usuários", icon: ShieldCheck },
] as const;

type ClientTab = (typeof clientTabs)[number]["key"];

const defaultClientTabs = new Set<ClientTab>(["overview"]);

const clientTabModuleCode: Partial<Record<ClientTab, string>> = {
  members: "members",
  families: "members",
  events: "calendar",
  worship: "worship",
  financial: "financial",
  notices: "announcements",
};

const tenantAdminOnlyTabs = new Set<ClientTab>(["lists", "theme", "users"]);

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
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [eventSaveStatus, setEventSaveStatus] = useState<LoginStatus>("idle");
  const [eventSaveMessage, setEventSaveMessage] = useState("");
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
  const [worshipViewMode, setWorshipViewMode] = useState<"list" | "calendar">("list");
  const [worshipCalendarMonth, setWorshipCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormState>(emptyAnnouncementForm);
  const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);
  const [announcementSaveStatus, setAnnouncementSaveStatus] = useState<LoginStatus>("idle");
  const [announcementSaveMessage, setAnnouncementSaveMessage] = useState("");
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
  const canManageEvents = canManageModuleCode("calendar");
  const canManageWorship = canManageModuleCode("worship");
  const canManageFinancial = canManageModuleCode("financial");
  const canManageAnnouncements = canManageModuleCode("announcements");

  const visibleClientTabs = useMemo(() => {
    return clientTabs.filter((tab) => {
      if (defaultClientTabs.has(tab.key)) {
        return true;
      }

      if (tenantAdminOnlyTabs.has(tab.key)) {
        return isTenantAdmin;
      }

      const moduleCode = clientTabModuleCode[tab.key];
      const isActiveModule = Boolean(moduleCode && activeModuleIdByCode[moduleCode]);

      if ((tab.key === "members" || tab.key === "families") && canManageMembers && isActiveModule) {
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

    const tenantId = currentProfile.tenant_id;

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
      allPlatformModulesResult,
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
          .select("tenant_id, family_id, member_id, relationship, is_primary, members (name, email)")
          .eq("tenant_id", tenantId)
          .returns<FamilyMemberRecord[]>(),
        supabase
          .from("tenant_events")
          .select("id, title, description, location, event_date, created_at")
          .eq("tenant_id", tenantId)
          .order("event_date", { ascending: true })
          .returns<EventRecord[]>(),
        supabase
          .from("tenant_announcements")
          .select("id, title, message, published_at, created_at")
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
          .from("platform_modules")
          .select("id, code, name, description, status")
          .eq("status", "active")
          .order("sort_order", { ascending: true })
          .returns<TenantModuleRecord[]>(),
      ]);

    if (
      tenantResult.error ||
      membersResult.error ||
      memberRolesResult.error ||
      memberMinistriesResult.error ||
      familiesResult.error ||
      familyMembersResult.error ||
      eventsResult.error ||
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
      allPlatformModulesResult.error
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
      Record<string, Array<{ member_id: string; name: string; relationship: string; is_primary: boolean }>>
    >((acc, row) => {
      if (!acc[row.family_id]) {
        acc[row.family_id] = [];
      }
      acc[row.family_id].push({
        member_id: row.member_id,
        name: row.members?.name ?? "Membro",
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
      allPlatformModules: allPlatformModulesResult.data ?? [],
    });

    setThemeForm({
      logo_url: tenantResult.data.logo_url ?? "",
      primary_color: tenantResult.data.primary_color,
      accent_color: tenantResult.data.accent_color,
      header_color: tenantResult.data.header_color,
      sidebar_color: tenantResult.data.sidebar_color,
      footer_color: tenantResult.data.footer_color,
    });

    setDataStatus("ready");
    return currentProfile;
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
      setMemberSaveMessage("Tenant não carregado.");
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
        member_id: item.member_id,
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

      const nextMember = {
        member_id: familyMemberPickerId,
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

  function updateFamilyMember(memberId: string, next: Partial<{ relationship: string; is_primary: boolean }>) {
    setFamilyForm((current) => {
      const nextMembers = current.members.map((item) => {
        if (item.member_id !== memberId) {
          return item;
        }
        return { ...item, ...next };
      });

      const shouldPrimary = next.is_primary === true;
      return {
        ...current,
        members: shouldPrimary ? nextMembers.map((item) => ({ ...item, is_primary: item.member_id === memberId })) : nextMembers,
      };
    });
  }

  function removeFamilyMember(memberId: string) {
    setFamilyForm((current) => ({ ...current, members: current.members.filter((item) => item.member_id !== memberId) }));
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
          [familyId]: familyForm.members.map((item) => ({
            member_id: item.member_id,
            name: current.members.find((m) => m.id === item.member_id)?.name ?? "Membro",
            relationship: item.relationship,
            is_primary: item.is_primary,
          })),
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

    const familyMembersRows = familyForm.members.map((item) => ({
      tenant_id: clientData.tenant.id,
      family_id: familyId,
      member_id: item.member_id,
      relationship: item.relationship,
      is_primary: item.is_primary,
    }));

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

  function openCreateEventForm() {
    if (!canManageEvents) {
      return;
    }

    setEventForm({ ...emptyEventForm, tenant_id: clientData?.tenant.id ?? "" });
    setEventSaveStatus("idle");
    setEventSaveMessage("");
    setIsEventFormOpen(true);
  }

  function openEditEventForm(eventRecord: EventRecord) {
    if (!canManageEvents) {
      return;
    }

    setEventForm({ ...eventRecord, tenant_id: clientData?.tenant.id ?? "" });
    setEventSaveStatus("idle");
    setEventSaveMessage("");
    setIsEventFormOpen(true);
  }

  function updateEventForm(field: keyof EventFormState, value: string) {
    setEventForm((current) => ({ ...current, [field]: value }));
  }

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

    const payload = {
      id: eventForm.id || undefined,
      tenant_id: clientData?.tenant.id,
      title: eventForm.title.trim(),
      description: eventForm.description?.trim() || null,
      location: eventForm.location?.trim() || null,
      event_date: eventForm.event_date,
    };

    const result = eventForm.id
      ? await supabase.from("tenant_events").update(payload).eq("id", eventForm.id)
      : await supabase.from("tenant_events").insert(payload);

    if (result.error) {
      setEventSaveStatus("error");
      setEventSaveMessage("Não foi possível salvar o evento.");
      return;
    }

    setEventSaveStatus("success");
    setEventSaveMessage(eventForm.id ? "Evento atualizado." : "Evento criado.");
    setIsEventFormOpen(false);
    setEventForm({ ...emptyEventForm, tenant_id: clientData?.tenant.id ?? "" });
    if (profile) {
      await loadClientData(profile.id);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!eventId || !profile || !canManageEvents) {
      return;
    }

    const { error } = await supabase.from("tenant_events").delete().eq("id", eventId);
    if (!error) {
      await loadClientData(profile.id);
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
    setWorshipSaveStatus("idle");
    setWorshipSaveMessage("");
  }

  function cancelEditWorshipEvent() {
    setEditingWorshipEventId(null);
    setWorshipEventForm(emptyWorshipEventForm);
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
        setWorshipSaveStatus("success");
        setWorshipSaveMessage("Evento de louvor criado.");
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

    const { error } = await supabase.from("worship_events").insert({
      tenant_id: clientData.tenant.id,
      ...payload,
      created_by: profile.id,
    });

    if (error) {
      setWorshipSaveStatus("error");
      setWorshipSaveMessage("Nao foi possivel criar o evento de louvor.");
      return;
    }

    setWorshipEventForm(emptyWorshipEventForm);
    setWorshipSaveStatus("success");
    setWorshipSaveMessage("Evento de louvor criado.");
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
    if (!canManageAnnouncements) {
      return;
    }

    setAnnouncementForm({
      ...emptyAnnouncementForm,
      tenant_id: clientData?.tenant.id ?? "",
      published_at: new Date().toISOString(),
    });
    setAnnouncementSaveStatus("idle");
    setAnnouncementSaveMessage("");
    setIsAnnouncementFormOpen(true);
  }

  function openEditAnnouncementForm(announcement: AnnouncementRecord) {
    if (!canManageAnnouncements) {
      return;
    }

    setAnnouncementForm({
      ...announcement,
      tenant_id: clientData?.tenant.id ?? "",
    });
    setAnnouncementSaveStatus("idle");
    setAnnouncementSaveMessage("");
    setIsAnnouncementFormOpen(true);
  }

  function updateAnnouncementForm(field: keyof AnnouncementFormState, value: string) {
    setAnnouncementForm((current) => ({ ...current, [field]: value }));
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

    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      setAnnouncementSaveStatus("error");
      setAnnouncementSaveMessage("Informe título e mensagem.");
      return;
    }

    const payload = {
      id: announcementForm.id || undefined,
      tenant_id: clientData?.tenant.id,
      title: announcementForm.title.trim(),
      message: announcementForm.message.trim(),
      published_at: announcementForm.published_at || new Date().toISOString(),
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
    if (profile) {
      await loadClientData(profile.id);
    }
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
              <p>Faça login com seu usuário de tenant para acessar a gestão do cliente.</p>
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
                  ? "Calendário central"
                  : activeTab === "worship"
                  ? "Módulo de Louvor"
                  : activeTab === "financial"
                  ? "Módulo Financeiro"
                  : activeTab === "notices"
                  ? "Comunicados gerais"
                  : activeTab === "lists"
                  ? "Listagens do tenant"
                  : activeTab === "theme"
                  ? "Identidade visual"
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
                  ? "Planeje os eventos e cultos do calendário central."
                  : activeTab === "worship"
                  ? "Gerencie escalas, integrantes e confirmações de presença."
                  : activeTab === "financial"
                  ? "Registre dízimos, ofertas, receitas e despesas da igreja."
                  : activeTab === "notices"
                  ? "Publique comunicados gerais para a comunidade."
                  : activeTab === "lists"
                  ? "Gerencie cargos e ministérios visíveis neste ambiente."
                  : activeTab === "theme"
                  ? "Atualize logo, cores e visual usado nas páginas da igreja."
                  : "Gerencie usuários e permissões do ambiente da igreja."}
              </p>
            </div>
          </div>
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
                    <span>White-label</span>
                    <h4>Visual do tenant</h4>
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
                  return (
                    <div key={member.id} className="member-row">
                      <span>{member.name.slice(0, 1)}</span>
                      <div>
                        <strong>{member.name}</strong>
                        <small>{memberSummaryById[member.id] ?? member.email ?? "Sem vínculos"}</small>
                      </div>
                      <em className={status === "active" ? "success" : "warning"}>{status}</em>
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
                  const subtitleParts = [
                    primary ? `Principal: ${primary.name}` : null,
                    familyMembers.length ? `${familyMembers.length} pessoas` : "Sem dependentes",
                  ].filter(Boolean);

                  return (
                    <div key={family.id} className="member-row">
                      <span>{family.name.slice(0, 1)}</span>
                      <div>
                        <strong>{family.name}</strong>
                        <small>{subtitleParts.join(" · ")}</small>
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
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Calendário central</span>
                  <h4>Eventos da igreja</h4>
                </div>
                {isTenantAdmin ? (
                  <button type="button" onClick={openCreateEventForm}>Novo evento</button>
                ) : null}
              </div>

              <div className="event-list">
                {clientData.events.map((item) => (
                  <div key={item.id}>
                    <time>{new Date(item.event_date).toLocaleDateString("pt-BR")}</time>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.location || item.description || "Sem local definido"}</small>
                    </div>
                    {canManageEvents ? (
                      <div className="member-actions">
                        <button type="button" onClick={() => openEditEventForm(item)}>
                          <Edit3 size={16} />
                        </button>
                        <button type="button" onClick={() => handleDeleteEvent(item.id)}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {activeTab === "worship" ? (
            <article className="panel full-width worship-panel">
              <div className="panel-heading">
                <div>
                  <span>Louvor</span>
                  <h4>Escalas de culto e ensaio</h4>
                </div>
                <div className="worship-view-toggle">
                  <button
                    type="button"
                    className={worshipViewMode === "list" ? "active" : ""}
                    onClick={() => setWorshipViewMode("list")}
                    title="Visualizar lista"
                  >
                    Lista
                  </button>
                  <button
                    type="button"
                    className={worshipViewMode === "calendar" ? "active" : ""}
                    onClick={() => setWorshipViewMode("calendar")}
                    title="Visualizar calendário"
                  >
                    Calendário
                  </button>
                </div>
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
                  <small>Participacoes planejadas</small>
                </article>
                <article>
                  <span>Funcoes</span>
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

              {canManageWorship ? (
                <div className="worship-forms">
                  <form className="worship-form" onSubmit={handleWorshipEventSubmit}>
                    <div className="modal-section-header">
                      <strong>{editingWorshipEventId ? "Editar evento" : "Novo evento de louvor"}</strong>
                      <small>{editingWorshipEventId ? "Atualize os dados do evento selecionado." : "Crie culto, ensaio ou reuniao operacional."}</small>
                    </div>
                    <input
                      className="catalog-input"
                      placeholder="Nome do evento"
                      value={worshipEventForm.title}
                      onChange={(event) => setWorshipEventForm((current) => ({ ...current, title: event.target.value }))}
                    />
                    <div className="modal-grid">
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
                    <div className="modal-grid">
                      <input
                        className="catalog-input"
                        type="datetime-local"
                        value={worshipEventForm.starts_at}
                        onChange={(event) => setWorshipEventForm((current) => ({ ...current, starts_at: event.target.value }))}
                      />
                      <input
                        className="catalog-input"
                        type="datetime-local"
                        value={worshipEventForm.ends_at}
                        onChange={(event) => setWorshipEventForm((current) => ({ ...current, ends_at: event.target.value }))}
                      />
                    </div>
                    <input
                      className="catalog-input"
                      placeholder="Local"
                      value={worshipEventForm.location}
                      onChange={(event) => setWorshipEventForm((current) => ({ ...current, location: event.target.value }))}
                    />
                    <textarea
                      className="catalog-input catalog-textarea"
                      placeholder="Observacoes da escala"
                      value={worshipEventForm.notes}
                      onChange={(event) => setWorshipEventForm((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                    />
                    <div className="worship-form-actions">
                      <Button type="submit" disabled={worshipSaveStatus === "loading"} icon={<Plus size={18} />}>
                        {editingWorshipEventId ? "Salvar alterações" : "Criar evento"}
                      </Button>
                      {editingWorshipEventId ? (
                        <Button type="button" variant="secondary" onClick={cancelEditWorshipEvent}>
                          Cancelar
                        </Button>
                      ) : null}
                    </div>
                  </form>

                  <form className="worship-form" onSubmit={handleWorshipAssignmentSubmit}>
                    <div className="modal-section-header">
                      <strong>Adicionar escalado</strong>
                      <small>Vincule um membro a uma funcao do louvor.</small>
                    </div>
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
                    <select
                      className="catalog-input"
                      value={worshipAssignmentForm.member_id}
                      onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, member_id: event.target.value }))}
                    >
                      <option value="">Selecionar membro</option>
                      {clientData.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <div className="modal-grid">
                      <select
                        className="catalog-input"
                        value={worshipAssignmentForm.role_id}
                        onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, role_id: event.target.value, role_name: "" }))}
                      >
                        <option value="">Funcao cadastrada</option>
                        {clientData.worshipRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="catalog-input"
                        placeholder="Ou funcao manual"
                        value={worshipAssignmentForm.role_name}
                        onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, role_name: event.target.value, role_id: "" }))}
                      />
                    </div>
                    <input
                      className="catalog-input"
                      type="datetime-local"
                      value={worshipAssignmentForm.arrival_at}
                      onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, arrival_at: event.target.value }))}
                    />
                    <textarea
                      className="catalog-input catalog-textarea"
                      placeholder="Observacoes para este escalado"
                      value={worshipAssignmentForm.notes}
                      onChange={(event) => setWorshipAssignmentForm((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                    />
                    <Button type="submit" disabled={worshipSaveStatus === "loading"} icon={<UserPlus size={18} />}>
                      Adicionar escalado
                    </Button>
                  </form>
                </div>
              ) : null}

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
            </article>
          ) : null}

          {activeTab === "financial" ? (() => {
            const allTx = clientData.financialTransactions;
            const thisMonth = financialFilterMonth;
            const txThisMonth = allTx.filter((t) => t.date.slice(0, 7) === thisMonth);
            const incomeThisMonth = txThisMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
            const expenseThisMonth = txThisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
            const netThisMonth = incomeThisMonth - expenseThisMonth;

            const filteredTx = allTx.filter((t) => {
              if (financialFilterType !== "all" && t.type !== financialFilterType) return false;
              if (financialFilterCategoryId && t.category_id !== financialFilterCategoryId) return false;
              if (financialView === "transactions" && t.date.slice(0, 7) !== financialFilterMonth) return false;
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
              const reportTx = allTx.filter((t) => t.date.slice(0, 7) === financialFilterMonth);
              for (const t of reportTx) {
                const catId = t.category_id ?? "__uncategorized__";
                const catName = t.financial_categories?.name ?? "Sem categoria";
                const catColor = t.financial_categories?.color ?? null;
                if (!grouped[catId]) grouped[catId] = { name: catName, color: catColor, income: 0, expense: 0 };
                if (t.type === "income") grouped[catId].income += t.amount;
                else grouped[catId].expense += t.amount;
              }
              return Object.values(grouped).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
            })();

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
                    <div className="worship-summary financial-summary">
                      <article className="financial-stat income">
                        <TrendingUp size={22} />
                        <div>
                          <span>Receitas</span>
                          <strong>{fmtCurrency(incomeThisMonth)}</strong>
                          <small>{txThisMonth.filter((t) => t.type === "income").length} lançamento(s)</small>
                        </div>
                      </article>
                      <article className="financial-stat expense">
                        <TrendingDown size={22} />
                        <div>
                          <span>Despesas</span>
                          <strong>{fmtCurrency(expenseThisMonth)}</strong>
                          <small>{txThisMonth.filter((t) => t.type === "expense").length} lançamento(s)</small>
                        </div>
                      </article>
                      <article className={`financial-stat ${netThisMonth >= 0 ? "income" : "expense"}`}>
                        <DollarSign size={22} />
                        <div>
                          <span>Saldo líquido</span>
                          <strong>{fmtCurrency(netThisMonth)}</strong>
                          <small>{netThisMonth >= 0 ? "Superávit" : "Déficit"} no período</small>
                        </div>
                      </article>
                    </div>

                    <div className="panel-heading" style={{ marginTop: "1.5rem" }}>
                      <div><strong>Últimos lançamentos</strong></div>
                      <button type="button" onClick={() => setFinancialView("transactions")}>Ver todos</button>
                    </div>
                    <div className="financial-tx-list">
                      {allTx.length === 0 ? (
                        <div className="catalog-empty">Nenhum lançamento registrado ainda.</div>
                      ) : null}
                      {allTx.slice(0, 10).map((tx) => (
                        <div key={tx.id} className="financial-tx-row">
                          <div className={`financial-tx-type-badge ${tx.type}`}>
                            {tx.type === "income" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          </div>
                          <div className="financial-tx-info">
                            <strong>{tx.description}</strong>
                            <small>
                              {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                              {tx.financial_categories?.name ? ` · ${tx.financial_categories.name}` : ""}
                              {tx.members?.name ? ` · ${tx.members.name}` : ""}
                            </small>
                          </div>
                          <span className={`financial-tx-amount ${tx.type}`}>
                            {tx.type === "income" ? "+" : "-"}{fmtCurrency(tx.amount)}
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
                              {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                              {" · "}{paymentLabel(tx.payment_method)}
                              {tx.financial_categories?.name ? ` · ${tx.financial_categories.name}` : ""}
                              {tx.members?.name ? ` · ${tx.members.name}` : ""}
                            </small>
                          </div>
                          <span className={`financial-tx-amount ${tx.type}`}>
                            {tx.type === "income" ? "+" : "-"}{fmtCurrency(tx.amount)}
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

          {activeTab === "notices" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Comunicados gerais</span>
                  <h4>Mensagens para membros</h4>
                </div>
                {isTenantAdmin ? (
                  <button type="button" onClick={openCreateAnnouncementForm}>Novo comunicado</button>
                ) : null}
              </div>

              <div className="notification-list">
                {clientData.announcements.map((item) => (
                  <div key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{new Date(item.published_at).toLocaleDateString("pt-BR")}</small>
                    </div>
                    {canManageAnnouncements ? (
                      <div className="member-actions">
                        <button type="button" onClick={() => openEditAnnouncementForm(item)}>
                          <Edit3 size={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {activeTab === "lists" ? (
            <article className="panel full-width">
              <div className="panel-heading">
                <div>
                  <span>Listagens</span>
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
                  <h4>Perfis e permissões do tenant</h4>
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
        </div>

        <footer className="client-admin-footer">
          <strong>{tenant.name}</strong>
          <span>Ambiente administrativo do cliente</span>
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
                </div>

                <div className="catalog-list">
                  {familyForm.members.length === 0 ? (
                    <div className="catalog-empty">Nenhum membro vinculado ainda.</div>
                  ) : null}

                  {familyForm.members.map((item) => {
                    const member = clientData.members.find((row) => row.id === item.member_id);
                    return (
                      <div key={item.member_id} className="ministry-row">
                        <div className="family-row-content">
                          <strong>{member?.name ?? "Membro"}</strong>
                          <select
                            className="catalog-input"
                            value={item.relationship}
                            onChange={(event) => updateFamilyMember(item.member_id, { relationship: event.target.value })}
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
                              onChange={(event) => updateFamilyMember(item.member_id, { is_primary: event.target.checked })}
                            />
                            <span>Principal</span>
                          </label>
                        </div>
                        <button type="button" onClick={() => removeFamilyMember(item.member_id)} aria-label="Remover">
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
    </main>
  );
}
