import {
  Baby,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  Heart,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Music,
  Play,
  Plus,
  QrCode,
  ScrollText,
  ShieldCheck,
  Trash2,
  Users2,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { PolicyFooter } from "../components/PolicyFooter";
import { Button, TextField } from "../design-system/components";
import { renderEventCardHtml } from "../lib/eventCardTemplate";
import { supabase, supabaseUrl } from "../lib/supabase";

type LoginStatus = "idle" | "loading" | "success" | "error";
type LoadStatus = "idle" | "loading" | "ready" | "error";
type PortalTabId =
  | "inicio"
  | "oracao"
  | "intercessao"
  | "agenda"
  | "comunicados"
  | "kids"
  | "escola"
  | "midias"
  | "admin"
  | "privacidade";

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
  avatar_url: string | null;
  tenant_id: string | null;
  member_id: string | null;
  tenant_role: "owner" | "admin" | "member" | null;
  status: string;
};

type PortalMinistryRecord = {
  ministry_id: string;
  is_admin: boolean;
  catalog_ministries: { name: string } | null;
};

type PortalModuleAccessRecord = {
  id: string;
  module_id: string;
  platform_modules: { code: string; name: string; description: string | null } | null;
};

type PortalEventRecord = {
  id: string;
  title: string;
  description: string | null;
  description_html?: string | null;
  location: string | null;
  event_date: string;
  ends_at: string | null;
  event_type: string;
  color: string;
  cover_image_url?: string | null;
};

type PortalTenantInfo = {
  name: string;
  contact_phone: string | null;
  logo_url: string | null;
};

type PortalAnnouncementRecord = {
  id: string;
  title: string;
  message: string;
  message_html: string | null;
  published_at: string;
  expires_at: string | null;
};

type PortalPrayerRequest = {
  id: string;
  content: string;
  is_anonymous: boolean;
  status: "new" | "assigned" | "interceding" | "done";
  created_at: string;
};

type PortalPrayerAssignment = {
  id: string;
  prayer_request_id: string;
  status: "pending" | "interceding" | "done" | "cancelled";
  prayer_requests: {
    id: string;
    content: string;
    is_anonymous: boolean;
    member_id: string | null;
    profile_id: string | null;
  } | null;
};

type SocialMediaChannelPortalRecord = {
  id: string;
  name: string;
  platform: string;
  channel_type: "channel" | "playlist";
  channel_id: string;
  channel_url: string | null;
  description: string | null;
};

type YouTubeVideoRecord = {
  videoId: string;
  title: string;
  published: string;
  thumbnail: string;
  description: string;
};

function normalizeAccessLabel(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isSchedulableMinistryName(value: string | null | undefined) {
  const normalized = normalizeAccessLabel(value);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const schedulableTokens = new Set(["louvor", "worship", "danca", "midia", "multimidia", "som", "audio", "audiovisual", "sound"]);
  return tokens.some((token) => schedulableTokens.has(token));
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

type MyKidsChildRpcRow = {
  id: string;
  tenant_id: string;
  name: string;
  date_of_birth: string | null;
  group_id: string | null;
  allergies: string | null;
  special_needs: string | null;
  notes: string | null;
  is_active: boolean;
  group_name: string | null;
  source: string;
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
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(null);
  const [resolvedTenantLogoUrl, setResolvedTenantLogoUrl] = useState<string | null>(null);
  const [portalTenantInfo, setPortalTenantInfo] = useState<PortalTenantInfo | null>(null);
  const [eventPreviewOpen, setEventPreviewOpen] = useState(false);
  const [eventPreviewTarget, setEventPreviewTarget] = useState<PortalEventRecord | null>(null);
  const [announcementPreviewOpen, setAnnouncementPreviewOpen] = useState(false);
  const [announcementPreviewTarget, setAnnouncementPreviewTarget] = useState<PortalAnnouncementRecord | null>(null);
  const [announcementMenuOpen, setAnnouncementMenuOpen] = useState(false);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<MemberAssignment[]>([]);
  const [portalEvents, setPortalEvents] = useState<PortalEventRecord[]>([]);
  const [portalAnnouncements, setPortalAnnouncements] = useState<PortalAnnouncementRecord[]>([]);
  const [memberMinistries, setMemberMinistries] = useState<PortalMinistryRecord[]>([]);
  const [moduleAdminAccesses, setModuleAdminAccesses] = useState<PortalModuleAccessRecord[]>([]);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [kidsGroups, setKidsGroups] = useState<KidsGroupRecord[]>([]);
  const [kidsChildren, setKidsChildren] = useState<KidsChildRecord[]>([]);
  const [kidsGuardiansByChildId, setKidsGuardiansByChildId] = useState<Record<string, KidsGuardianRecord[]>>({});
  const [kidsPassesByChildId, setKidsPassesByChildId] = useState<Record<string, KidsCheckinPassRecord[]>>({});
  const [kidsAdminAllChildren, setKidsAdminAllChildren] = useState<KidsChildRecord[]>([]);
  const [kidsAdminSearch, setKidsAdminSearch] = useState("");
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

  // ── LGPD & Termos ────────────────────────────────────────────────────────
  type TenantPolicy = { id: string; terms_text: string; privacy_text: string; version: number; published_at: string | null };
  const [pendingPolicy, setPendingPolicy] = useState<TenantPolicy | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyChecked, setPolicyChecked] = useState(false);
  const [policyAcceptStatus, setPolicyAcceptStatus] = useState<LoginStatus>("idle");
  const [policyAcceptMessage, setPolicyAcceptMessage] = useState("");
  const [lgpdConsentGranted, setLgpdConsentGranted] = useState<boolean | null>(null);
  const [lgpdDeletionRequested, setLgpdDeletionRequested] = useState(false);
  const [lgpdActionStatus, setLgpdActionStatus] = useState<LoginStatus>("idle");
  const [lgpdActionMessage, setLgpdActionMessage] = useState("");
  // Intercession state
  const [activePortalTab, setActivePortalTab] = useState<PortalTabId>("inicio");
  const [isInIntercessionMinistry, setIsInIntercessionMinistry] = useState(false);
  const [ownPrayerRequests, setOwnPrayerRequests] = useState<PortalPrayerRequest[]>([]);
  const [myAssignments, setMyAssignments] = useState<PortalPrayerAssignment[]>([]);
  const [prayerForm, setPrayerForm] = useState("");
  const [prayerAnonymous, setPrayerAnonymous] = useState(false);
  const [prayerSubmitStatus, setPrayerSubmitStatus] = useState<LoginStatus>("idle");
  const [prayerSubmitMessage, setPrayerSubmitMessage] = useState("");
  const [assignActionStatus, setAssignActionStatus] = useState<Record<string, LoginStatus>>({});
  const [accordionState, setAccordionState] = useState<Record<string, boolean>>({});

  function isAccordionOpen(id: string, defaultOpen = false) {
    return accordionState[id] ?? defaultOpen;
  }

  function toggleAccordion(id: string, defaultOpen = false) {
    setAccordionState((prev) => {
      const current = prev[id] ?? defaultOpen;
      return { ...prev, [id]: !current };
    });
  }

  function AccordionPanel(props: {
    id: string;
    title: string;
    description?: string;
    icon?: ReactNode;
    badge?: number | string;
    defaultOpen?: boolean;
    className?: string;
    children: ReactNode;
  }) {
    const open = isAccordionOpen(props.id, Boolean(props.defaultOpen));

    return (
      <section className={`member-portal-accordion ${props.className ?? ""}`}>
        <button
          type="button"
          className="member-portal-accordion-head"
          aria-expanded={open}
          onClick={() => toggleAccordion(props.id, Boolean(props.defaultOpen))}
        >
          <span className="member-portal-accordion-title">
            {props.icon ? <span className="member-portal-accordion-icon">{props.icon}</span> : null}
            <span>
              <strong>{props.title}</strong>
              {props.description ? <small>{props.description}</small> : null}
            </span>
          </span>
          <span className="member-portal-accordion-right">
            {props.badge !== undefined && props.badge !== null && props.badge !== "" ? (
              <em className="member-portal-accordion-badge">{props.badge}</em>
            ) : null}
            <ChevronDown size={18} className={`member-portal-accordion-chevron ${open ? "open" : ""}`} />
          </span>
        </button>
        {open ? <div className="member-portal-accordion-body">{props.children}</div> : null}
      </section>
    );
  }

  const [socialMediaChannels, setSocialMediaChannels] = useState<SocialMediaChannelPortalRecord[]>([]);
  const [socialMediaVideos, setSocialMediaVideos] = useState<Record<string, YouTubeVideoRecord[]>>({});
  const [socialMediaLoadingIds, setSocialMediaLoadingIds] = useState<Set<string>>(new Set());
  const [socialMediaVideoModal, setSocialMediaVideoModal] = useState<{ channelName: string; video: YouTubeVideoRecord } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void loadPortalData(data.session.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (loadStatus === "ready" && profile?.tenant_id) {
      void checkPolicyAcceptance(profile.tenant_id);
    }
  }, [loadStatus, profile?.tenant_id]);

  useEffect(() => {
    if (!profile?.id) {
      setReadAnnouncementIds(new Set());
      return;
    }

    try {
      const stored = window.localStorage.getItem(`sirvaos-member-announcements-read:${profile.id}`);
      const ids = stored ? (JSON.parse(stored) as string[]) : [];
      setReadAnnouncementIds(new Set(ids));
    } catch {
      setReadAnnouncementIds(new Set());
    }
  }, [profile?.id]);

  function markAnnouncementsAsRead(ids: string[]) {
    if (!profile?.id || ids.length === 0) return;

    setReadAnnouncementIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      try {
        window.localStorage.setItem(
          `sirvaos-member-announcements-read:${profile.id}`,
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // Local read state is only a convenience; ignore storage failures.
      }
      return next;
    });
  }

  function toggleAnnouncementMenu() {
    setAnnouncementMenuOpen((current) => {
      const next = !current;
      if (next) {
        markAnnouncementsAsRead(portalAnnouncements.map((announcement) => announcement.id));
      }
      return next;
    });
  }

  async function checkPolicyAcceptance(tenantId: string) {
    const { data: policyData } = await supabase
      .from("tenant_policies")
      .select("id, terms_text, privacy_text, version, published_at")
      .eq("tenant_id", tenantId)
      .not("published_at", "is", null)
      .maybeSingle<TenantPolicy>();

    if (!policyData) return;

    const { data: acceptance } = await supabase
      .from("user_policy_acceptances")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("policy_version", policyData.version)
      .maybeSingle();

    if (!acceptance) {
      setPendingPolicy(policyData);
      setIsPolicyModalOpen(true);
    }

    // Load LGPD consent status
    const { data: consent } = await supabase
      .from("lgpd_consents")
      .select("granted")
      .eq("tenant_id", tenantId)
      .eq("consent_type", "data_processing")
      .maybeSingle<{ granted: boolean }>();

    setLgpdConsentGranted(consent?.granted ?? null);

    const { data: deletionReq } = await supabase
      .from("lgpd_consents")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("consent_type", "data_deletion_request")
      .eq("granted", true)
      .maybeSingle();

    setLgpdDeletionRequested(Boolean(deletionReq));
  }

  async function handleAcceptPolicy() {
    if (!pendingPolicy || !profile?.tenant_id) return;
    setPolicyAcceptStatus("loading");
    setPolicyAcceptMessage("");

    const { error: acceptError } = await supabase.rpc("accept_tenant_policy", {
      p_tenant_id: profile.tenant_id,
    });

    if (acceptError) {
      setPolicyAcceptStatus("error");
      setPolicyAcceptMessage("Erro ao registrar aceite. Tente novamente.");
      return;
    }

    // Register LGPD data processing consent
    await supabase.from("lgpd_consents").upsert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      tenant_id: profile.tenant_id,
      consent_type: "data_processing",
      granted: true,
    }, { onConflict: "user_id,tenant_id,consent_type" });

    setLgpdConsentGranted(true);
    setIsPolicyModalOpen(false);
    setPendingPolicy(null);
    setPolicyChecked(false);
    setPolicyAcceptStatus("idle");
  }

  async function handlePrayerSubmit() {
    if (!profile?.tenant_id || !prayerForm.trim()) return;
    setPrayerSubmitStatus("loading");
    setPrayerSubmitMessage("");

    const payload: Record<string, unknown> = {
      tenant_id: profile.tenant_id,
      content: prayerForm.trim(),
      is_anonymous: prayerAnonymous,
      source: "portal",
    };
    if (!prayerAnonymous) {
      payload.member_id = profile.member_id ?? null;
      payload.profile_id = profile.id;
    }

    const { error } = await supabase.from("prayer_requests").insert(payload);
    if (error) {
      setPrayerSubmitStatus("error");
      setPrayerSubmitMessage("Erro ao enviar pedido. Tente novamente.");
      return;
    }

    setPrayerSubmitStatus("success");
    setPrayerSubmitMessage("Pedido de oração enviado com sucesso!");
    setPrayerForm("");
    setPrayerAnonymous(false);

    if (!prayerAnonymous) {
      const orParts = [`profile_id.eq.${profile.id}`];
      if (profile.member_id) {
        orParts.push(`member_id.eq.${profile.member_id}`);
      }
      const { data } = await supabase
        .from("prayer_requests")
        .select("id, content, is_anonymous, status, created_at")
        .eq("tenant_id", profile.tenant_id)
        .or(orParts.join(","))
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<PortalPrayerRequest[]>();
      setOwnPrayerRequests(data ?? []);
    }

    setTimeout(() => {
      setPrayerSubmitStatus("idle");
      setPrayerSubmitMessage("");
    }, 3000);
  }

  async function handleAssignmentAction(
    assignment: PortalPrayerAssignment,
    action: "interceding" | "done",
  ) {
    if (!profile?.tenant_id) return;
    setAssignActionStatus((prev) => ({ ...prev, [assignment.id]: "loading" }));

    const updates: Record<string, unknown> = { status: action };
    if (action === "interceding") updates.started_at = new Date().toISOString();
    if (action === "done") updates.completed_at = new Date().toISOString();

    const { error: assignErr } = await supabase
      .from("prayer_assignments")
      .update(updates)
      .eq("id", assignment.id);

    if (assignErr) {
      setAssignActionStatus((prev) => ({ ...prev, [assignment.id]: "error" }));
      return;
    }

    // Notify the requester via push if not anonymous and has profile_id
    const req = assignment.prayer_requests;
    if (req && !req.is_anonymous && req.profile_id) {
      await supabase.functions.invoke("send-push", {
        body: {
          profile_ids: [req.profile_id],
          title: action === "interceding" ? "Pedido de oração" : "Pedido de oração",
          body: action === "interceding"
            ? "Estão orando pelo seu pedido neste momento."
            : "Oramos pelo seu pedido. Deus seja glorificado!",
          module_code: "intercession",
          data: { tab: "intercession" },
        },
      });
    }

    setAssignActionStatus((prev) => ({ ...prev, [assignment.id]: "success" }));

    // Refresh assignments
    if (profile.member_id) {
      const { data } = await supabase
        .from("prayer_assignments")
        .select("id, prayer_request_id, status, prayer_requests(id, content, is_anonymous, member_id, profile_id)")
        .eq("tenant_id", profile.tenant_id)
        .eq("assigned_member_id", profile.member_id)
        .in("status", ["pending", "interceding"])
        .order("assigned_at", { ascending: false })
        .limit(50)
        .returns<PortalPrayerAssignment[]>();
      setMyAssignments(data ?? []);
    }
  }

  async function handleLgpdRevoke() {
    if (!profile?.tenant_id) return;
    setLgpdActionStatus("loading");
    setLgpdActionMessage("");

    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from("lgpd_consents").upsert({
      user_id: userId,
      tenant_id: profile.tenant_id,
      consent_type: "data_processing",
      granted: false,
    }, { onConflict: "user_id,tenant_id,consent_type" });

    if (error) {
      setLgpdActionStatus("error");
      setLgpdActionMessage("Erro ao atualizar consentimento.");
      return;
    }
    setLgpdConsentGranted(false);
    setLgpdActionStatus("success");
    setLgpdActionMessage("Consentimento revogado. Entre em contato com o administrador para mais informações.");
  }

  async function handleDeletionRequest() {
    if (!profile?.tenant_id || lgpdDeletionRequested) return;
    setLgpdActionStatus("loading");
    setLgpdActionMessage("");

    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase.from("lgpd_consents").upsert({
      user_id: userId,
      tenant_id: profile.tenant_id,
      consent_type: "data_deletion_request",
      granted: true,
      notes: "Solicitado pelo próprio usuário via portal.",
    }, { onConflict: "user_id,tenant_id,consent_type" });

    if (error) {
      setLgpdActionStatus("error");
      setLgpdActionMessage("Erro ao registrar solicitação.");
      return;
    }
    setLgpdDeletionRequested(true);
    setLgpdActionStatus("success");
    setLgpdActionMessage("Solicitação de exclusão registrada. O administrador será notificado.");
  }

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
      .select("id, full_name, email, tenant_id, tenant_role, member_id, status, avatar_url")
      .eq("id", userId)
      .single<MemberProfile>();

    if (profileError || !profileData) {
      setLoadStatus("error");
      return;
    }

    setProfile(profileData);
    setResolvedAvatarUrl(profileData.avatar_url ?? null);

    // Tenant info e eventos são públicos para todo membro do tenant — carregamos
    // antes de qualquer guarda de member_id ou módulo específico.
    if (profileData.tenant_id) {
      const [tenantInfoRes, eventsRes, announcementsRes, socialMediaRes] = await Promise.all([
        supabase
          .from("tenants")
          .select("name, contact_phone, logo_url")
          .eq("id", profileData.tenant_id)
          .single<PortalTenantInfo>(),
        supabase
          .from("tenant_events")
          .select("id, title, description, description_html, location, event_date, ends_at, event_type, color, cover_image_url")
          .eq("tenant_id", profileData.tenant_id)
          .eq("status", "publicado")
          .gte("event_date", new Date().toISOString())
          .order("event_date", { ascending: true })
          .limit(20)
          .returns<PortalEventRecord[]>(),
        supabase
          .from("tenant_announcements")
          .select("id, title, message, message_html, published_at, expires_at")
          .eq("tenant_id", profileData.tenant_id)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("published_at", { ascending: false })
          .limit(20)
          .returns<PortalAnnouncementRecord[]>(),
        supabase
          .from("social_media_channels")
          .select("id, name, platform, channel_type, channel_id, channel_url, description")
          .eq("tenant_id", profileData.tenant_id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .returns<SocialMediaChannelPortalRecord[]>(),
      ]);
      setPortalTenantInfo(tenantInfoRes.data ?? null);
      setResolvedTenantLogoUrl(
        tenantInfoRes.data?.logo_url
          ? getTenantLogoPublicUrl(tenantInfoRes.data.logo_url, profileData.tenant_id)
          : null,
      );
      setPortalEvents(eventsRes.data ?? []);
      setPortalAnnouncements(announcementsRes.data ?? []);
      const channels = socialMediaRes.data ?? [];
      setSocialMediaChannels(channels);
      // Busca vídeos de cada canal em background
      if (channels.length > 0) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token ?? "";
        setSocialMediaLoadingIds(new Set(channels.map((c) => c.id)));
        await Promise.all(
          channels.map(async (ch) => {
            try {
              const res = await fetch(`${supabaseUrl}/functions/v1/fetch-youtube-feed`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ channel_id: ch.channel_id, channel_type: ch.channel_type }),
              });
              const json = (await res.json()) as { videos?: YouTubeVideoRecord[] };
              setSocialMediaVideos((prev) => ({ ...prev, [ch.id]: json.videos ?? [] }));
            } catch {
              setSocialMediaVideos((prev) => ({ ...prev, [ch.id]: [] }));
            } finally {
              setSocialMediaLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(ch.id);
                return next;
              });
            }
          }),
        );
      }
    }

    if (!profileData.member_id || !profileData.tenant_id) {
      setAssignments([]);
      setMemberMinistries([]);
      setModuleAdminAccesses([]);
      setCanManageMembers(false);
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

    const [ministriesResult, moduleAccessResult, canManageMembersResult] = await Promise.all([
      supabase
        .from("member_ministries")
        .select("ministry_id, is_admin, catalog_ministries (name)")
        .eq("tenant_id", profileData.tenant_id)
        .eq("member_id", profileData.member_id)
        .returns<PortalMinistryRecord[]>(),
      supabase
        .from("tenant_module_admins")
        .select("id, module_id, platform_modules (code, name, description)")
        .eq("tenant_id", profileData.tenant_id)
        .or(`profile_id.eq.${profileData.id},member_id.eq.${profileData.member_id}`)
        .returns<PortalModuleAccessRecord[]>(),
      supabase.rpc("can_manage_module", {
        module_code: "members",
      }),
    ]);

    const portalMinistries = ministriesResult.data ?? [];
    const hasSchedulePortalAccess = portalMinistries.some((row) =>
      isSchedulableMinistryName(row.catalog_ministries?.name),
    );
    const isKidsModuleAdminLocal = (moduleAccessResult.data ?? []).some(
      (row) => (row.platform_modules as { code?: string } | null)?.code === "kids",
    );

    setMemberMinistries(portalMinistries);
    setModuleAdminAccesses(moduleAccessResult.data ?? []);
    setCanManageMembers(Boolean(canManageMembersResult.data));

    // ── Intercessão ────────────────────────────────────────────
    const inIntercessionMinistry = portalMinistries.some((row) =>
      row.catalog_ministries?.name?.toLowerCase().includes("intercess"),
    );
    setIsInIntercessionMinistry(inIntercessionMinistry);

    {
      const orParts = [`profile_id.eq.${profileData.id}`];
      if (profileData.member_id) {
        orParts.push(`member_id.eq.${profileData.member_id}`);
      }
      const { data: ownRequestsData } = await supabase
        .from("prayer_requests")
        .select("id, content, is_anonymous, status, created_at")
        .eq("tenant_id", profileData.tenant_id)
        .or(orParts.join(","))
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<PortalPrayerRequest[]>();
      setOwnPrayerRequests(ownRequestsData ?? []);
    }

    // Carrega assignments do intercessor independente do intercessionEnabled
    // (membro pode estar no ministério mesmo sem admin access ao módulo)
    if (profileData.member_id) {
      const { data: assignmentsData } = await supabase
        .from("prayer_assignments")
        .select("id, prayer_request_id, status, prayer_requests(id, content, is_anonymous, member_id, profile_id)")
        .eq("tenant_id", profileData.tenant_id)
        .eq("assigned_member_id", profileData.member_id)
        .in("status", ["pending", "interceding"])
        .order("assigned_at", { ascending: false })
        .limit(50)
        .returns<PortalPrayerAssignment[]>();
      setMyAssignments(assignmentsData ?? []);
    }

    if (hasSchedulePortalAccess) {
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
    } else {
      setAssignments([]);
    }

    const [groupsResult, guardiansResult, myKidsResult] = await Promise.all([
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
      supabase.rpc("get_my_kids_children"),
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

    const fallbackChildren: KidsChildRecord[] = Array.from(childById.values());
    const myKidsRowsRaw = myKidsResult.data;
    const myKidsRows: MyKidsChildRpcRow[] = Array.isArray(myKidsRowsRaw) ? (myKidsRowsRaw as MyKidsChildRpcRow[]) : [];
    const children: KidsChildRecord[] =
      myKidsRows.length > 0
        ? myKidsRows.map((row) => ({
            id: row.id,
            tenant_id: row.tenant_id,
            name: row.name,
            date_of_birth: row.date_of_birth,
            group_id: row.group_id,
            allergies: row.allergies,
            special_needs: row.special_needs,
            notes: row.notes,
            is_active: row.is_active,
            kids_groups: row.group_name ? { name: row.group_name } : null,
          }))
        : fallbackChildren;

    const sortedChildren: KidsChildRecord[] = children.sort((a, b) => a.name.localeCompare(b.name));
    setKidsChildren(sortedChildren);
    setKidsGuardiansByChildId(guardiansByChild);

    if (isKidsModuleAdminLocal) {
      const allKidsResult = await supabase
        .from("kids_children")
        .select("id, tenant_id, name, date_of_birth, group_id, allergies, special_needs, notes, is_active, kids_groups (name)")
        .eq("tenant_id", profileData.tenant_id)
        .order("name", { ascending: true })
        .returns<KidsChildRecord[]>();
      setKidsAdminAllChildren(allKidsResult.error ? [] : allKidsResult.data ?? []);
      setKidsAdminSearch("");
    } else {
      setKidsAdminAllChildren([]);
      setKidsAdminSearch("");
    }

    if (sortedChildren.length > 0) {
      const childIds = sortedChildren.map((c) => c.id);
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

    // Portal only shows active classes. Admins/teachers see all active; regular members
    // only see classes where they have an active enrollment.
    const bibleClassesResult = await supabase
      .from("bible_school_classes")
      .select("id, tenant_id, name, description, starts_at, ends_at, is_active")
      .eq("tenant_id", profileData.tenant_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .returns<BibleSchoolClassRecord[]>();

    const allActiveClasses = bibleClassesResult.data ?? [];

    let bibleClasses = allActiveClasses;
    if (!canManageModule && !isTeacher && profileData.member_id) {
      // For regular members: only show classes they're enrolled in (active enrollment)
      const enrollmentCheckResult = await supabase
        .from("bible_school_enrollments")
        .select("class_id")
        .eq("tenant_id", profileData.tenant_id)
        .eq("status", "active")
        .in("class_id", allActiveClasses.map((c) => c.id).filter(Boolean))
        .returns<{ class_id: string }[]>();

      if (!enrollmentCheckResult.error && enrollmentCheckResult.data) {
        // We need to match via student (member_id → student → enrollment)
        const studentResult = await supabase
          .from("bible_school_students")
          .select("id")
          .eq("tenant_id", profileData.tenant_id)
          .eq("member_id", profileData.member_id)
          .returns<{ id: string }[]>();

        if (!studentResult.error && studentResult.data?.length) {
          const studentIds = studentResult.data.map((s) => s.id);
          const memberEnrollmentResult = await supabase
            .from("bible_school_enrollments")
            .select("class_id")
            .eq("tenant_id", profileData.tenant_id)
            .eq("status", "active")
            .in("student_id", studentIds)
            .returns<{ class_id: string }[]>();

          const enrolledClassIds = new Set(
            (memberEnrollmentResult.data ?? []).map((e) => e.class_id),
          );
          bibleClasses = allActiveClasses.filter((c) => enrolledClassIds.has(c.id));
        } else {
          bibleClasses = [];
        }
      }
    }

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
      const safeName = (file.name || "arquivo").replace(/[^\w.-]+/g, "-");
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
    setResolvedAvatarUrl(null);
    setAssignments([]);
    setMemberMinistries([]);
    setModuleAdminAccesses([]);
    setCanManageMembers(false);
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

  function kidsPassDisplayCode(passToken: string) {
    const raw = (passToken ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    if (raw.length < 6) return raw;
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}`;
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

  const adminModuleAccesses = moduleAdminAccesses.filter((row) => row.platform_modules);
  const isKidsModuleAdmin = adminModuleAccesses.some((row) => row.platform_modules?.code === "kids");
  const isTenantAdmin = profile?.tenant_role === "owner" || profile?.tenant_role === "admin";
  const canOpenAdminPortal =
    Boolean(isTenantAdmin) || canManageMembers || bibleSchoolCanManage || adminModuleAccesses.length > 0;
  const displayName = profile?.full_name?.trim() || profile?.email || "";
  const displayInitial = displayName ? displayName.trim().charAt(0).toUpperCase() : "?";
  const highlightedAdminModules = [
    ...(canManageMembers && !adminModuleAccesses.some((row) => row.platform_modules?.code === "members")
      ? [{
          id: "members",
          code: "members",
          name: "Membresia",
          description: "Cadastro de membros, famílias, cargos e ministérios.",
        }]
      : []),
    ...adminModuleAccesses.map((row) => ({
      id: row.id,
      code: row.platform_modules?.code ?? "",
      name: row.platform_modules?.name ?? "Módulo",
      description: row.platform_modules?.description ?? "Acesso administrativo liberado pela igreja.",
    })),
    ...(bibleSchoolCanManage && !adminModuleAccesses.some((row) => row.platform_modules?.code === "bible-school")
      ? [{
          id: "bible-school",
          code: "bible-school",
          name: "Escola Bíblica",
          description: "Turmas, aulas, materiais e presença.",
        }]
      : []),
  ];
  const ministryAdminLabels = memberMinistries
    .filter((item) => item.is_admin)
    .map((item) => item.catalog_ministries?.name ?? "Ministério")
    .filter(Boolean);
  const memberMinistryLabels = memberMinistries
    .map((item) => item.catalog_ministries?.name ?? "Ministério")
    .filter(Boolean);
  const hasSchedulePortalAccess = memberMinistries.some((item) =>
    isSchedulableMinistryName(item.catalog_ministries?.name),
  );
  const nextPortalEvent = portalEvents[0] ?? null;
  const latestAnnouncement = portalAnnouncements[0] ?? null;
  const firstKidsChild = kidsChildren[0] ?? null;
  const activeKidsPass = firstKidsChild
    ? (kidsPassesByChildId[firstKidsChild.id] ?? []).find((pass) => !pass.used_at && new Date(pass.valid_until) >= new Date()) ?? null
    : null;
  const unreadAnnouncementCount = portalAnnouncements.filter((announcement) => !readAnnouncementIds.has(announcement.id)).length;
  const hasAnnouncements = portalAnnouncements.length > 0;
  const portalTabs = [
    { id: "inicio" as const, label: "Início", icon: <Check size={16} />, visible: true },
    { id: "oracao" as const, label: "Meus Pedidos de oração", icon: <Heart size={16} />, visible: true, badge: ownPrayerRequests.length || undefined },
    { id: "intercessao" as const, label: "Intercessão", icon: <Users2 size={16} />, visible: isInIntercessionMinistry || myAssignments.length > 0, badge: myAssignments.length || undefined },
    { id: "agenda" as const, label: "Agenda", icon: <CalendarDays size={16} />, visible: hasSchedulePortalAccess || portalEvents.length > 0, badge: (upcomingAssignments.length || portalEvents.length) || undefined },
    { id: "comunicados" as const, label: "Comunicados", icon: <Bell size={16} />, visible: hasAnnouncements, badge: unreadAnnouncementCount || undefined },
    { id: "kids" as const, label: "Kids", icon: <Baby size={16} />, visible: kidsChildren.length > 0 || isKidsModuleAdmin },
    { id: "escola" as const, label: "Escola Bíblica", icon: <BookOpen size={16} />, visible: bibleSchoolEnabled },
    { id: "midias" as const, label: "Mídias", icon: <Play size={16} />, visible: socialMediaChannels.length > 0 },
    { id: "admin" as const, label: "Admin", icon: <Check size={16} />, visible: canOpenAdminPortal || highlightedAdminModules.length > 0 },
    { id: "privacidade" as const, label: "Privacidade", icon: <ShieldCheck size={16} />, visible: true },
  ];
  const visiblePortalTabKey = portalTabs.filter((t) => t.visible).map((t) => t.id).join("|");

  useEffect(() => {
    const ids = visiblePortalTabKey.split("|").filter(Boolean) as PortalTabId[];
    if (ids.length === 0) return;
    if (!ids.includes(activePortalTab)) {
      setActivePortalTab(ids[0]);
    }
  }, [activePortalTab, visiblePortalTabKey]);

  if (loadStatus === "idle" || loginStatus === "idle" || loginStatus === "loading") {
    if (!profile) {
      return (
        <div className="member-portal-shell">
          <div className="member-portal-login-card">
            <div className="member-portal-brand">
              <Users2 size={28} />
              <div>
                <strong>Portal do Membro</strong>
                <span>Tenha acesso as principais áreas do sistema</span>
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
            <Users2 size={28} />
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
          {resolvedTenantLogoUrl ? (
            <img
              className="member-portal-tenant-logo"
              src={resolvedTenantLogoUrl}
              alt={portalTenantInfo?.name ? `Logo ${portalTenantInfo.name}` : "Logo"}
              onError={() => setResolvedTenantLogoUrl(null)}
            />
          ) : (
            <Check size={22} />
          )}
          <div>
            <strong>{portalTenantInfo?.name ?? "Portal do Membro"}</strong>
            <span>Portal do Membro</span>
          </div>
        </div>
        <div className="member-portal-header-actions">
          <div className="member-portal-announcement-menu">
            <button
              type="button"
              className={`member-portal-announcement-button ${unreadAnnouncementCount > 0 ? "has-unread" : hasAnnouncements ? "has-read" : ""}`}
              onClick={toggleAnnouncementMenu}
              aria-label={
                unreadAnnouncementCount > 0
                  ? `${unreadAnnouncementCount} comunicado${unreadAnnouncementCount === 1 ? "" : "s"} novo${unreadAnnouncementCount === 1 ? "" : "s"}`
                  : "Comunicados"
              }
            >
              <Bell size={18} />
              {hasAnnouncements ? <span className="member-portal-announcement-dot" /> : null}
            </button>
            {announcementMenuOpen ? (
              <div className="member-portal-announcement-popover">
                <div className="member-portal-announcement-popover-head">
                  <strong>Comunicados</strong>
                  <small>{portalAnnouncements.length} {portalAnnouncements.length === 1 ? "recado" : "recados"}</small>
                </div>
                {portalAnnouncements.length === 0 ? (
                  <div className="member-portal-announcement-empty">Nenhum comunicado no momento.</div>
                ) : (
                  <div className="member-portal-announcement-list">
                    {portalAnnouncements.map((announcement) => (
                      <button
                        key={announcement.id}
                        type="button"
                        onClick={() => {
                          markAnnouncementsAsRead([announcement.id]);
                          setAnnouncementPreviewTarget(announcement);
                          setAnnouncementPreviewOpen(true);
                          setAnnouncementMenuOpen(false);
                        }}
                      >
                        <strong>{announcement.title}</strong>
                        <small>{new Date(announcement.published_at).toLocaleDateString("pt-BR")}</small>
                        <span>{announcement.message.length > 90 ? `${announcement.message.slice(0, 90)}...` : announcement.message}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        <div className="member-portal-userbox">
          <div className="member-portal-avatar" aria-label="Foto do perfil">
            {resolvedAvatarUrl ? (
              <img
                src={resolvedAvatarUrl}
                alt={`Foto de ${displayName || "usuário"}`}
                onError={() => setResolvedAvatarUrl(null)}
              />
            ) : (
              <span>{displayInitial}</span>
            )}
          </div>
          <span>{profile.full_name ?? profile.email}</span>
          <small>{profile.email}</small>
          <button type="button" className="member-portal-signout" onClick={() => void handleSignOut()}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
        </div>
      </header>

      <main className="member-portal-main member-portal-feed-layout">
        <section className="member-portal-hero">
          <div>
            <span className="member-portal-kicker">Minha área</span>
            <h1>Olá, {profile.full_name?.split(" ")[0] ?? "membro"}</h1>
            <p>
              Nesta tela você tera acesso aos modulos e atividades liberados ao seu usuario.
            </p>
          </div>
          {canOpenAdminPortal ? (
            <a className="member-portal-admin-link" href="/admin-cliente">
              Abrir painel administrativo
            </a>
          ) : null}
        </section>

        <nav className="member-portal-tabbar" aria-label="Navegação do portal">
          <div className="member-portal-tabbar-scroll">
            {portalTabs.filter((t) => t.visible).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`member-portal-tab ${activePortalTab === tab.id ? "active" : ""}`}
                onClick={() => setActivePortalTab(tab.id)}
                aria-current={activePortalTab === tab.id ? "page" : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge ? <em className="member-portal-tab-badge">{tab.badge}</em> : null}
              </button>
            ))}
          </div>
          <select
            className="member-portal-tabbar-select"
            value={activePortalTab}
            onChange={(e) => setActivePortalTab(e.target.value as PortalTabId)}
            aria-label="Selecionar aba"
          >
            {portalTabs.filter((t) => t.visible).map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </nav>

        {activePortalTab === "inicio" ? (
          <section className="member-portal-now" aria-label="Para você agora">
            <div className="member-portal-section-head">
              <div>
                <h2>Para você agora</h2>
                <p>Os itens mais importantes do seu portal em primeiro lugar.</p>
              </div>
            </div>
            <div className="member-portal-now-grid">
              {hasSchedulePortalAccess && upcomingAssignments[0]?.worship_events ? (
                <article className="member-portal-now-card urgent">
                  <span><CalendarCheck size={16} /> Próxima escala</span>
                  <strong>{upcomingAssignments[0].worship_events.title}</strong>
                  <small>{statusLabel(upcomingAssignments[0].status)}</small>
                </article>
              ) : null}
              {nextPortalEvent ? (
                <article className="member-portal-now-card">
                  <span><CalendarDays size={16} /> Próximo evento</span>
                  <strong>{nextPortalEvent.title}</strong>
                  <small>
                    {new Date(nextPortalEvent.event_date).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </article>
              ) : null}
              {latestAnnouncement ? (
                <article className="member-portal-now-card">
                  <span><Bell size={16} /> Comunicado</span>
                  <strong>{latestAnnouncement.title}</strong>
                  <small>{new Date(latestAnnouncement.published_at).toLocaleDateString("pt-BR")}</small>
                </article>
              ) : null}
              {firstKidsChild ? (
                <article className="member-portal-now-card">
                  <span><Baby size={16} /> Kids</span>
                  <strong>{firstKidsChild.name}</strong>
                  <small>{activeKidsPass ? "QR ativo para check-in" : "Sem QR ativo"}</small>
                </article>
              ) : null}
              {!nextPortalEvent && !latestAnnouncement && !firstKidsChild && upcomingAssignments.length === 0 ? (
                <div className="member-portal-empty-inline">
                  <Check size={18} />
                  <span>Nenhuma pendência importante no momento.</span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className={`member-portal-feed-shell ${activePortalTab === "inicio" ? "" : "is-single"}`}>
          {activePortalTab === "inicio" ? (
            <aside className="member-portal-side-panel" aria-label="Resumo e acessos do portal">
        <section className="member-portal-access-grid member-portal-module-strip" aria-label="Resumo de acessos">
          {hasSchedulePortalAccess ? (
            <article className="member-portal-access-card">
              <span><Music size={17} /> Escalas</span>
              <strong>{upcomingAssignments.length}</strong>
              <small>{upcomingAssignments.length === 1 ? "próxima escala" : "próximas escalas"}</small>
            </article>
          ) : null}
          <article className="member-portal-access-card">
            <span><CalendarDays size={17} /> Eventos</span>
            <strong>{portalEvents.length}</strong>
            <small>{portalEvents.length === 1 ? "próximo evento" : "próximos eventos"}</small>
          </article>
          <article className="member-portal-access-card">
            <span><Baby size={17} /> Kids</span>
            <strong>{kidsChildren.length}</strong>
            <small>{kidsChildren.length === 1 ? "criança vinculada" : "crianças vinculadas"}</small>
          </article>
          <article className="member-portal-access-card">
            <span><BookOpen size={17} /> Escola Bíblica</span>
            <strong>{bibleSchoolClasses.length}</strong>
            <small>{bibleSchoolCanManage ? "gestão liberada" : bibleSchoolEnabled ? "turmas disponíveis" : "sem acesso"}</small>
          </article>
          <article className="member-portal-access-card">
            <span><Check size={17} /> Administração</span>
            <strong>{canOpenAdminPortal ? "Sim" : "Não"}</strong>
            <small>{canManageMembers ? "membresia liberada" : canOpenAdminPortal ? "módulo liberado" : "portal do membro"}</small>
          </article>
        </section>

        <AccordionPanel
          id="access"
          title="Acessos e ministérios"
          description="Permissões identificadas para este usuário."
          icon={<ShieldCheck size={18} />}
          defaultOpen={true}
          className="member-portal-section member-portal-access-section"
        >
          <div className="member-portal-permission-list">
            {canManageMembers ? (
              <a className="member-portal-permission-card featured" href="/admin-cliente">
                <span>Membresia</span>
                <strong>Acesso administrativo</strong>
                <small>Cadastro de membros, famílias, cargos e ministérios.</small>
              </a>
            ) : null}
            {adminModuleAccesses.map((row) => (
              <a key={row.id} className="member-portal-permission-card" href="/admin-cliente">
                <span>{row.platform_modules?.name ?? "Módulo"}</span>
                <strong>Admin do módulo</strong>
                <small>{row.platform_modules?.description ?? "Acesso liberado pela igreja."}</small>
              </a>
            ))}
            {bibleSchoolCanManage && !adminModuleAccesses.some((row) => row.platform_modules?.code === "bible-school") ? (
              <a className="member-portal-permission-card" href="/admin-cliente">
                <span>Escola Bíblica</span>
                <strong>{bibleSchoolIsTeacher ? "Professor" : "Gestão liberada"}</strong>
                <small>Turmas, aulas, materiais e presença.</small>
              </a>
            ) : null}
            {ministryAdminLabels.map((name) => (
              <div key={name} className="member-portal-permission-card">
                <span>{name}</span>
                <strong>Liderança de ministério</strong>
                <small>Permissão ministerial vinculada ao cadastro.</small>
              </div>
            ))}
            {!canOpenAdminPortal && memberMinistryLabels.length === 0 ? (
              <div className="member-portal-empty-inline">
                <Check size={18} />
                <span>Você está com acesso comum ao portal do membro.</span>
              </div>
            ) : null}
            {memberMinistryLabels.length > 0 ? (
              <div className="member-portal-ministry-pills">
                {memberMinistryLabels.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
            ) : null}
          </div>
        </AccordionPanel>

            </aside>
          ) : null}
          <div className="member-portal-feed-column">

        {/* ── Seção: Próximos Eventos ─────────────────────────────────── */}
        {(activePortalTab === "inicio" || activePortalTab === "agenda") && portalEvents.length > 0 ? (
          <AccordionPanel
            id="events"
            title="Próximos eventos"
            description="Agenda da sua igreja para os próximos dias."
            icon={<CalendarDays size={18} />}
            badge={portalEvents.length}
            defaultOpen={true}
            className="member-portal-section member-portal-feed-section member-portal-events-section"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {portalEvents.map((evt) => {
                const typeLabels: Record<string, string> = {
                  culto: "Culto", conferencia: "Conferência", retiro: "Retiro",
                  jovens: "Jovens", infantil: "Infantil", social: "Social", outro: "Outro",
                };
                const eventDate = new Date(evt.event_date);
                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => { setEventPreviewTarget(evt); setEventPreviewOpen(true); }}
                    style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      background: "var(--color-white)", border: "1px solid var(--color-border)",
                      borderRadius: 10, padding: "14px 16px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: evt.color ?? "#6d28d9" }} />
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: "0.9rem", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {evt.title}
                        </strong>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                          {eventDate.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          {evt.location ? ` · ${evt.location}` : ""}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-subtle)", padding: "2px 8px", borderRadius: 4, color: "var(--color-text-secondary)", flexShrink: 0, whiteSpace: "nowrap" }}>
                      {typeLabels[evt.event_type] ?? evt.event_type}
                    </span>
                  </button>
                );
              })}
            </div>
          </AccordionPanel>
        ) : null}

        {/* ── Seção: Comunicados ───────────────────────────────────────── */}
        {(activePortalTab === "inicio" || activePortalTab === "comunicados") && portalAnnouncements.length > 0 ? (
          <AccordionPanel
            id="announcements"
            title="Comunicados"
            description="Avisos e recados da sua igreja."
            icon={<Bell size={18} />}
            badge={portalAnnouncements.length}
            defaultOpen={true}
            className="member-portal-section member-portal-feed-section member-portal-announcements-section"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {portalAnnouncements.map((ann) => {
                const excerpt = ann.message.length > 110 ? ann.message.slice(0, 110) + "…" : ann.message;
                return (
                  <button
                    key={ann.id}
                    type="button"
                    onClick={() => { setAnnouncementPreviewTarget(ann); setAnnouncementPreviewOpen(true); }}
                    style={{
                      width: "100%", textAlign: "left", cursor: "pointer",
                      background: "var(--color-white)", border: "1px solid var(--color-border)",
                      borderRadius: 10, padding: "14px 16px",
                      display: "flex", flexDirection: "column", gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ fontSize: "0.9rem" }}>{ann.title}</strong>
                      <span style={{ fontSize: "0.72rem", background: "var(--color-bg-subtle)", padding: "2px 8px", borderRadius: 4, color: "var(--color-text-secondary)", flexShrink: 0, whiteSpace: "nowrap" }}>
                        {new Date(ann.published_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                      {excerpt}
                    </span>
                  </button>
                );
              })}
            </div>
          </AccordionPanel>
        ) : null}

        {activePortalTab === "admin" && highlightedAdminModules.length > 0 ? (
          <AccordionPanel
            id="admin-modules"
            title="Módulos administrativos"
            description="Acessos liberados para você administrar pela igreja."
            icon={<Check size={18} />}
            badge={highlightedAdminModules.length}
            defaultOpen={true}
            className="member-portal-section member-portal-feed-section member-portal-admin-modules-section"
          >
            <div className="member-portal-admin-module-grid">
              {highlightedAdminModules.map((module) => (
                <article key={module.id} className="member-portal-admin-module-card">
                  <span className="member-portal-admin-module-icon">
                    {module.code === "kids" ? <Baby size={18} /> : null}
                    {module.code === "bible-school" ? <BookOpen size={18} /> : null}
                    {module.code === "worship" ? <Music size={18} /> : null}
                    {!["kids", "bible-school", "worship"].includes(module.code) ? <Check size={18} /> : null}
                  </span>
                  <span>
                    <em>Admin do módulo</em>
                    <strong>{module.name}</strong>
                    <small>{module.description}</small>
                    <span className="member-portal-admin-module-actions">
                      <a href="/admin-cliente">Abrir admin</a>
                      {module.code === "kids" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setKidsForm(emptyKidsChildForm);
                            setIsKidsFormOpen(true);
                          }}
                        >
                          <Plus size={14} />
                          Cadastrar criança
                        </button>
                      ) : null}
                    </span>
                  </span>
                </article>
              ))}
            </div>
          </AccordionPanel>
        ) : null}

        {/* ── Seção: Mídias Sociais ─────────────────────────────────────── */}
        {activePortalTab === "midias" && socialMediaChannels.length > 0 ? (
          <AccordionPanel
            id="media"
            title="Mídias Sociais"
            description="Vídeos e transmissões do canal da sua igreja."
            icon={<Play size={18} />}
            badge={socialMediaChannels.length}
            defaultOpen={true}
            className="member-portal-section member-portal-feed-section member-portal-social-section"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {socialMediaChannels.map((ch) => {
                const videos = socialMediaVideos[ch.id] ?? [];
                const isLoading = socialMediaLoadingIds.has(ch.id);
                const channelLabel = ch.channel_type === "playlist" ? "Playlist" : "Canal";
                const description = ch.description ? `${channelLabel} · ${ch.description}` : channelLabel;
                return (
                  <AccordionPanel
                    key={ch.id}
                    id={`media:${ch.id}`}
                    title={ch.name}
                    description={description}
                    icon={<Play size={18} />}
                    badge={videos.length}
                    defaultOpen={false}
                    className="member-portal-accordion-compact"
                  >
                    {isLoading ? (
                      <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>Carregando vídeos…</p>
                    ) : videos.length === 0 ? (
                      <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", margin: 0 }}>Nenhum vídeo disponível no momento.</p>
                    ) : (
                      <div className="member-portal-social-grid">
                        {videos.map((v) => (
                          <button
                            key={v.videoId}
                            type="button"
                            onClick={() => setSocialMediaVideoModal({ channelName: ch.name, video: v })}
                            style={{
                              background: "none", border: "1px solid var(--color-border)",
                              borderRadius: 8, padding: 0, cursor: "pointer",
                              display: "flex", flexDirection: "column", overflow: "hidden",
                              textAlign: "left",
                            }}
                          >
                            <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
                              <img
                                src={v.thumbnail}
                                alt={v.title}
                                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                              />
                              <div style={{
                                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                                background: "rgba(0,0,0,0.25)",
                              }}>
                                <Play size={28} style={{ color: "#fff", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }} />
                              </div>
                            </div>
                            <div style={{ padding: "8px 10px 10px" }}>
                              <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, lineHeight: 1.35, color: "var(--color-text-primary)", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", display: "-webkit-box", overflow: "hidden" }}>
                                {v.title}
                              </p>
                              {v.published ? (
                                <small style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>
                                  {new Date(v.published).toLocaleDateString("pt-BR")}
                                </small>
                              ) : null}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </AccordionPanel>
                );
              })}
            </div>
          </AccordionPanel>
        ) : null}

        {socialMediaVideoModal ? (
          <div className="modal-overlay" onClick={() => setSocialMediaVideoModal(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820, width: "95vw" }}>
              <div className="modal-header">
                <div>
                  <span>Mídias</span>
                  <h2 className="modal-title-compact">{socialMediaVideoModal.video.title}</h2>
                </div>
                <button className="modal-close" type="button" onClick={() => setSocialMediaVideoModal(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body" style={{ paddingTop: 0 }}>
                <div className="video-embed-frame">
                <iframe
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  src={`https://www.youtube.com/embed/${socialMediaVideoModal.video.videoId}?autoplay=1`}
                  title={socialMediaVideoModal.video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activePortalTab === "agenda" && hasSchedulePortalAccess ? (
          <AccordionPanel
            id="schedule-upcoming"
            title="Próximas escalas"
            description="Confirme presença e acompanhe seus compromissos."
            icon={<Music size={18} />}
            badge={upcomingAssignments.length}
            defaultOpen={true}
            className="member-portal-section member-portal-feed-section member-portal-schedule-section"
          >
            {upcomingAssignments.length === 0 ? (
              <div className="member-portal-empty state-card">
                <CalendarCheck size={34} />
                <strong>Nenhuma escala ministerial encontrada</strong>
                <span>Quando você for escalado em algum evento, a confirmação aparecerá aqui.</span>
              </div>
            ) : (
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
            )}
          </AccordionPanel>
        ) : null}

        {activePortalTab === "kids" ? (
          <AccordionPanel
            id="kids"
            title="Kids"
            description="Cadastre crianças e gere o QR Code para check-in na salinha."
            icon={<Baby size={18} />}
            badge={kidsChildren.length}
            defaultOpen={true}
            className="member-portal-section member-portal-feed-section member-portal-kids-section"
          >
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
                          <div className="member-portal-kids-pass-code">
                            {kidsPassDisplayCode(activePass.pass_token)}
                          </div>
                          <div className="member-portal-kids-pass-help">
                            Se não der para ler o QR, o professor pode digitar este código no campo Token do QR em Kids → Presença (painel administrativo).
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}

            {isKidsModuleAdmin ? (
              <AccordionPanel
                id="kids-admin-all"
                title="Todas as crianças"
                description="Lista completa do cadastro do Kids."
                icon={<Users2 size={18} />}
                badge={kidsAdminAllChildren.length}
                defaultOpen={false}
                className="member-portal-accordion-compact"
              >
                <input
                  className="catalog-input"
                  placeholder="Buscar por nome..."
                  value={kidsAdminSearch}
                  onChange={(e) => setKidsAdminSearch(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                {(() => {
                  const term = kidsAdminSearch.trim().toLowerCase();
                  const filtered = term
                    ? kidsAdminAllChildren.filter((c) => c.name.toLowerCase().includes(term))
                    : kidsAdminAllChildren;
                  return filtered.length === 0 ? (
                    <div className="member-portal-empty-inline">
                      <Baby size={18} />
                      <span>Nenhuma criança encontrada.</span>
                    </div>
                  ) : (
                    <div className="member-portal-history">
                      {filtered.slice(0, 120).map((c) => (
                        <div key={c.id} className="member-portal-history-row">
                          <div>
                            <strong>{c.name}</strong>
                            <small>
                              {c.date_of_birth ? new Date(`${c.date_of_birth}T12:00:00`).toLocaleDateString("pt-BR") : "Data de nascimento não informada"}
                              {c.kids_groups?.name ? ` · ${c.kids_groups.name}` : " · Sem turma"}
                            </small>
                          </div>
                          <em className="member-portal-status pending">{c.is_active ? "Ativo" : "Inativo"}</em>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </AccordionPanel>
            ) : null}
          </AccordionPanel>
        ) : null}

        {activePortalTab === "escola" && bibleSchoolEnabled && (bibleSchoolCanManage || bibleSchoolClasses.length > 0) ? (
          <AccordionPanel
            id="bible-school"
            title="Escola Bíblica"
            description={bibleSchoolCanManage ? "Acesso de gestão liberado." : bibleSchoolIsTeacher ? "Acesso de professor." : "Acompanhe suas turmas e materiais."}
            icon={<BookOpen size={18} />}
            badge={bibleSchoolClasses.length}
            defaultOpen={true}
            className="member-portal-section"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-neutral-500)", fontSize: "0.9rem", fontWeight: 800, marginBottom: 10 }}>
              <BookOpen size={16} />
              {bibleSchoolCanManage ? "Acesso de gestão" : bibleSchoolIsTeacher ? "Professor" : "Minhas turmas"}
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
          </AccordionPanel>
        ) : null}

        {activePortalTab === "agenda" && hasSchedulePortalAccess ? (
          <AccordionPanel
            id="schedule-history"
            title="Histórico"
            description="Veja suas escalas anteriores."
            icon={<CalendarCheck size={18} />}
            badge={pastAssignments.length}
            defaultOpen={false}
            className="member-portal-section"
          >
            {pastAssignments.length === 0 ? (
              <div className="member-portal-empty-inline">
                <CalendarCheck size={18} />
                <span>Nenhuma escala anterior encontrada.</span>
              </div>
            ) : (
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
            )}
          </AccordionPanel>
        ) : null}

        {/* ── Seção Pedido de Oração (todos os membros) ─────────────── */}
        {activePortalTab === "oracao" ? (
          <AccordionPanel
            id="prayer"
            title="Pedido de Oração"
            description="Envie um pedido e acompanhe o andamento."
            icon={<Heart size={18} />}
            defaultOpen={true}
            className="member-portal-section"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <AccordionPanel
                id="prayer-new"
                title="Novo pedido"
                description="Envie um pedido para o ministério de intercessão."
                icon={<Heart size={18} />}
                defaultOpen
                className="member-portal-accordion-compact"
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text)" }}>
                    Compartilhe seu pedido de oração
                  </label>
                  <textarea
                    value={prayerForm}
                    onChange={(e) => setPrayerForm(e.target.value)}
                    placeholder="Escreva seu pedido de oração aqui..."
                    maxLength={1000}
                    rows={4}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: "1px solid var(--color-border)", resize: "vertical",
                      fontSize: "0.88rem", lineHeight: 1.5, fontFamily: "inherit",
                      background: "#fff", boxSizing: "border-box",
                    }}
                  />
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>
                    <input
                      type="checkbox"
                      checked={prayerAnonymous}
                      onChange={(e) => setPrayerAnonymous(e.target.checked)}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    Enviar anonimamente
                  </label>
                  {prayerAnonymous ? (
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-text-secondary)", background: "rgba(0,0,0,0.04)", borderRadius: 6, padding: "8px 10px", lineHeight: 1.5 }}>
                      Seu pedido será recebido pelo ministério de Intercessão, mas seu nome não será associado a ele. Por isso, você não receberá atualizações de status.
                    </p>
                  ) : null}
                  {prayerSubmitMessage ? (
                    <p className={`login-feedback ${prayerSubmitStatus}`} style={{ margin: 0 }}>{prayerSubmitMessage}</p>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ alignSelf: "flex-end" }}
                    disabled={prayerSubmitStatus === "loading" || prayerForm.trim().length < 5}
                    onClick={handlePrayerSubmit}
                  >
                    <Heart size={14} />
                    {prayerSubmitStatus === "loading" ? "Enviando..." : "Enviar pedido"}
                  </button>
                </div>
              </AccordionPanel>

              <AccordionPanel
                id="prayer-history"
                title="Meus pedidos"
                description="Acompanhe o andamento do seu pedido."
                icon={<ScrollText size={18} />}
                badge={ownPrayerRequests.length}
                defaultOpen={ownPrayerRequests.length > 0}
                className="member-portal-accordion-compact"
              >
                {ownPrayerRequests.length === 0 ? (
                  <div className="member-portal-empty-inline">
                    <Heart size={18} />
                    <span>Você ainda não enviou nenhum pedido de oração.</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {ownPrayerRequests.map((req) => {
                      const statusMap: Record<string, { label: string; color: string }> = {
                        new:        { label: "Seu pedido foi recebido", color: "var(--color-accent)" },
                        assigned:   { label: "Seu pedido já está com um intercessor", color: "#e08b00" },
                        interceding:{ label: "Já estão orando pelo seu pedido", color: "#c07000" },
                        done:       { label: "Intercessão finalizada", color: "var(--color-success)" },
                      };
                      const s = statusMap[req.status] ?? statusMap.new;
                      return (
                        <div key={req.id} style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <small style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                              {new Date(req.created_at).toLocaleDateString("pt-BR")}
                            </small>
                            <em style={{ fontSize: "0.7rem", fontStyle: "normal", fontWeight: 700, color: s.color, background: `${s.color}18`, padding: "2px 8px", borderRadius: 4 }}>
                              {s.label}
                            </em>
                          </div>
                          <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.5, color: "var(--color-text)" }}>
                            {req.content.length > 140 ? req.content.slice(0, 140) + "…" : req.content}
                          </p>
                          {req.status === "new" ? (
                            <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                              Em breve, um intercessor será direcionado para o seu pedido.
                            </p>
                          ) : req.status === "assigned" ? (
                            <p style={{ margin: 0, fontSize: "0.76rem", color: "#e08b00", fontWeight: 600 }}>
                              Seu pedido já está com um intercessor.
                            </p>
                          ) : req.status === "interceding" ? (
                            <p style={{ margin: 0, fontSize: "0.76rem", color: "#c07000", fontWeight: 600 }}>
                              Já estão orando pelo seu pedido.
                            </p>
                          ) : req.status === "done" ? (
                            <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--color-success)", fontWeight: 600 }}>
                              A intercessão foi finalizada. Deus abençoe!
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionPanel>
            </div>
          </AccordionPanel>
        ) : null}

        {/* ── Seção Minha Intercessão ── */}
        {activePortalTab === "intercessao" && (isInIntercessionMinistry || myAssignments.length > 0) ? (
          <AccordionPanel
            id="intercession"
            title="Minha Intercessão"
            description="Pedidos atribuídos para você interceder."
            icon={<Heart size={18} />}
            badge={myAssignments.length}
            defaultOpen={true}
            className="member-portal-section"
          >
            {myAssignments.length === 0 ? (
              <div className="member-portal-empty state-card">
                <Heart size={28} />
                <strong>Nenhum pedido atribuído</strong>
                <span>Quando o admin distribuir pedidos de oração para você, eles aparecerão aqui.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {myAssignments.map((assignment) => {
                  const req = assignment.prayer_requests;
                  const actionStatus = assignActionStatus[assignment.id] ?? "idle";
                  return (
                    <div key={assignment.id} style={{ background: "var(--color-bg-subtle, #f9fafb)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                          {req?.is_anonymous ? "Pedido anônimo" : "Pedido de oração"}
                        </strong>
                        {assignment.status === "interceding" ? (
                          <em style={{ fontSize: "0.7rem", fontStyle: "normal", fontWeight: 700, color: "#c07000", background: "rgba(192,112,0,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                            Intercedendo
                          </em>
                        ) : (
                          <em style={{ fontSize: "0.7rem", fontStyle: "normal", fontWeight: 700, color: "var(--color-accent)", background: "rgba(var(--color-accent-rgb),0.1)", padding: "2px 8px", borderRadius: 4 }}>
                            Pendente
                          </em>
                        )}
                      </div>
                      {req ? (
                        <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.6, color: "var(--color-text)" }}>
                          {req.content}
                        </p>
                      ) : null}
                      {actionStatus === "error" ? (
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-danger)" }}>Erro ao atualizar. Tente novamente.</p>
                      ) : null}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {assignment.status === "pending" ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                            disabled={actionStatus === "loading"}
                            onClick={() => handleAssignmentAction(assignment, "interceding")}
                          >
                            <Heart size={13} />
                            {actionStatus === "loading" ? "Atualizando..." : "Começar a interceder"}
                          </button>
                        ) : assignment.status === "interceding" ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: "0.82rem", padding: "6px 14px", background: "var(--color-success)", borderColor: "var(--color-success)" }}
                            disabled={actionStatus === "loading"}
                            onClick={() => handleAssignmentAction(assignment, "done")}
                          >
                            <Heart size={13} />
                            {actionStatus === "loading" ? "Atualizando..." : "Conclui a intercessão"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AccordionPanel>
        ) : null}

        {/* ── Seção LGPD ──────────────────────────────────────────────── */}
        {activePortalTab === "privacidade" && lgpdConsentGranted !== null && (
          <AccordionPanel
            id="privacy"
            title="Privacidade & LGPD"
            description="Controle suas preferências de privacidade."
            icon={<ShieldCheck size={18} />}
            defaultOpen={true}
            className="member-portal-section member-portal-lgpd-section"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <AccordionPanel
                id="privacy-consent"
                title="Consentimento de tratamento de dados"
                description={lgpdConsentGranted ? "Consentimento ativo." : "Consentimento revogado."}
                icon={<FileCheck2 size={18} />}
                defaultOpen={true}
                className="member-portal-accordion-compact"
              >
                <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0 0 8px" }}>
                  {lgpdConsentGranted
                    ? "Você autorizou o tratamento dos seus dados pessoais conforme a Política de Privacidade."
                    : "Você revogou o consentimento de tratamento de dados. Alguns recursos podem não funcionar."}
                </p>
                {lgpdConsentGranted && (
                  <button
                    type="button"
                    style={{ fontSize: "0.8rem", color: "var(--color-danger, #ef4444)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                    onClick={() => void handleLgpdRevoke()}
                    disabled={lgpdActionStatus === "loading"}
                  >
                    Revogar consentimento
                  </button>
                )}
              </AccordionPanel>

              <AccordionPanel
                id="privacy-deletion"
                title="Exclusão dos meus dados"
                description={lgpdDeletionRequested ? "Solicitação registrada." : "Solicite a exclusão dos seus dados."}
                icon={<Trash2 size={18} />}
                defaultOpen={false}
                className="member-portal-accordion-compact"
              >
                <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0 0 8px" }}>
                  {lgpdDeletionRequested
                    ? "Solicitação de exclusão registrada. O administrador foi notificado e entrará em contato."
                    : "Você pode solicitar a exclusão permanente dos seus dados pessoais da plataforma."}
                </p>
                {!lgpdDeletionRequested && (
                  <button
                    type="button"
                    style={{ fontSize: "0.8rem", color: "var(--color-danger, #ef4444)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                    onClick={() => void handleDeletionRequest()}
                    disabled={lgpdActionStatus === "loading"}
                  >
                    Solicitar exclusão dos meus dados
                  </button>
                )}
              </AccordionPanel>

              {lgpdActionMessage && (
                <p className={`login-feedback ${lgpdActionStatus}`} style={{ margin: 0 }}>{lgpdActionMessage}</p>
              )}
            </div>
          </AccordionPanel>
        )}
          </div>
        </div>
      </main>

      {isBibleSchoolClassFormOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={bibleSchoolClassForm.id ? "Editar turma" : "Nova turma"}
          onClick={() => {
            setIsBibleSchoolClassFormOpen(false);
            setBibleSchoolClassForm(emptyBibleSchoolClassForm);
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <span>Escola Bíblica</span>
                <h2 className="modal-title-compact">{bibleSchoolClassForm.id ? "Editar turma" : "Nova turma"}</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => {
                  setIsBibleSchoolClassFormOpen(false);
                  setBibleSchoolClassForm(emptyBibleSchoolClassForm);
                }}
              >
                <X size={18} />
              </button>
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
          </div>
        </div>
      ) : null}

      {isBibleSchoolSessionFormOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Nova aula"
          onClick={() => {
            setIsBibleSchoolSessionFormOpen(false);
            setBibleSchoolSessionForm(emptyBibleSchoolSessionForm);
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <span>Escola Bíblica</span>
                <h2 className="modal-title-compact">Nova aula</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => {
                  setIsBibleSchoolSessionFormOpen(false);
                  setBibleSchoolSessionForm(emptyBibleSchoolSessionForm);
                }}
              >
                <X size={18} />
              </button>
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
          </div>
        </div>
      ) : null}

      {isBibleSchoolMaterialFormOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Novo material"
          onClick={() => {
            setIsBibleSchoolMaterialFormOpen(false);
            setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <span>Escola Bíblica</span>
                <h2 className="modal-title-compact">Novo material</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => {
                  setIsBibleSchoolMaterialFormOpen(false);
                  setBibleSchoolMaterialForm(emptyBibleSchoolMaterialForm);
                }}
              >
                <X size={18} />
              </button>
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
          </div>
        </div>
      ) : null}

      {isBibleSchoolGradeFormOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Nova nota"
          onClick={() => {
            setIsBibleSchoolGradeFormOpen(false);
            setBibleSchoolGradeForm(emptyBibleSchoolGradeForm);
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <span>Escola Bíblica</span>
                <h2 className="modal-title-compact">Nova nota</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => {
                  setIsBibleSchoolGradeFormOpen(false);
                  setBibleSchoolGradeForm(emptyBibleSchoolGradeForm);
                }}
              >
                <X size={18} />
              </button>
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
          </div>
        </div>
      ) : null}

      {isKidsFormOpen ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={kidsForm.id ? "Editar criança" : "Cadastrar criança"}
          onClick={() => {
            setIsKidsFormOpen(false);
            setKidsForm(emptyKidsChildForm);
          }}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <span>Kids</span>
                <h2 className="modal-title-compact">{kidsForm.id ? "Editar criança" : "Cadastrar criança"}</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => {
                  setIsKidsFormOpen(false);
                  setKidsForm(emptyKidsChildForm);
                }}
              >
                <X size={18} />
              </button>
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
          </div>
        </div>
      ) : null}

      {/* ── Modal de aceite de termos/política ──────────────────────────── */}
      {isPolicyModalOpen && pendingPolicy ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Termos e Política de Privacidade">
          <div className="modal-card" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <span>Atualização necessária</span>
                <h2>Termos e Política de Privacidade</h2>
              </div>
            </div>
            <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {pendingPolicy.terms_text && (
                <div style={{ marginBottom: 24 }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <ScrollText size={16} /> Termos de Uso
                  </strong>
                  <div style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", whiteSpace: "pre-wrap", color: "#374151" }}>
                    {pendingPolicy.terms_text}
                  </div>
                </div>
              )}
              {pendingPolicy.privacy_text && (
                <div style={{ marginBottom: 24 }}>
                  <strong style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <ShieldCheck size={16} /> Política de Privacidade (LGPD)
                  </strong>
                  <div style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 16px", fontSize: "0.875rem", whiteSpace: "pre-wrap", color: "#374151" }}>
                    {pendingPolicy.privacy_text}
                  </div>
                </div>
              )}
              <label className="check-row" style={{ alignItems: "flex-start", gap: 10, marginTop: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={policyChecked}
                  onChange={(e) => setPolicyChecked(e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.875rem" }}>
                  Li e concordo com os Termos de Uso e a Política de Privacidade. Autorizo o tratamento dos meus dados pessoais conforme descrito acima.
                </span>
              </label>
              {policyAcceptMessage && (
                <p className={`login-feedback ${policyAcceptStatus}`} style={{ marginTop: 12 }}>{policyAcceptMessage}</p>
              )}
            </div>
            <div className="modal-actions" style={{ padding: "0 22px 22px" }}>
              <Button
                type="button"
                disabled={!policyChecked || policyAcceptStatus === "loading"}
                onClick={() => void handleAcceptPolicy()}
              >
                <FileCheck2 size={16} />
                {policyAcceptStatus === "loading" ? "Registrando..." : "Aceitar e continuar"}
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => void (async () => { await supabase.auth.signOut(); window.location.reload(); })()}
              >
                Sair sem aceitar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {profile?.tenant_id ? (
        <PolicyFooter tenantId={profile.tenant_id} />
      ) : null}

      {/* ── Modal: Detalhe do Comunicado ────────────────────────────────── */}
      {announcementPreviewOpen && announcementPreviewTarget ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Comunicado" onClick={() => setAnnouncementPreviewOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div>
                <span>Comunicado</span>
                <h2 className="modal-title-compact">{announcementPreviewTarget.title}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setAnnouncementPreviewOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0, overflowY: "auto", maxHeight: "78vh" }}>
              <div style={{
                background: "linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)",
                padding: "18px 22px",
              }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#e9d5ff" }}>
                  📢 Comunicado
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "#c4b5fd" }}>
                  Publicado em {new Date(announcementPreviewTarget.published_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div style={{ padding: "20px 22px", fontSize: "0.95rem", lineHeight: 1.75, color: "#374151" }}>
                {announcementPreviewTarget.message_html ? (
                  <div dangerouslySetInnerHTML={{ __html: announcementPreviewTarget.message_html }} />
                ) : (
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{announcementPreviewTarget.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Modal: Detalhe do Evento ─────────────────────────────────────── */}
      {eventPreviewOpen && eventPreviewTarget ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Evento" onClick={() => setEventPreviewOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div>
                <span>
                  {eventPreviewTarget.event_type === "culto" ? "Culto"
                    : eventPreviewTarget.event_type === "conferencia" ? "Conferência"
                    : eventPreviewTarget.event_type === "retiro" ? "Retiro"
                    : eventPreviewTarget.event_type === "jovens" ? "Jovens"
                    : eventPreviewTarget.event_type === "infantil" ? "Infantil"
                    : eventPreviewTarget.event_type === "social" ? "Social"
                    : "Evento"}
                </span>
                <h2 className="modal-title-compact">{eventPreviewTarget.title}</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setEventPreviewOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0, overflowY: "auto", maxHeight: "75vh" }}>
              <div style={{ padding: "20px 22px" }}>
              <div
                dangerouslySetInnerHTML={{
                  __html: renderEventCardHtml(
                    eventPreviewTarget,
                    {
                      name: portalTenantInfo?.name ?? "",
                      contact_phone: portalTenantInfo?.contact_phone ?? null,
                    },
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
        </div>
      ) : null}
    </div>
  );
}
