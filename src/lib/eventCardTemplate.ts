export type EventCardTenant = {
  name: string;
  contact_phone?: string | null;
};

export type EventCardEvent = {
  title: string;
  event_date: string;
  ends_at?: string | null;
  location?: string | null;
  description?: string | null;
  description_html?: string | null;
  cover_image_url?: string | null;
};

type RenderOptions = {
  bannerUrl?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("mailto:");
}

export function sanitizeRichHtml(input: string | null | undefined): string {
  const html = String(input ?? "").trim();
  if (!html) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html
      .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/\s*>/gi, "")
      .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const allowed = new Set(["P", "BR", "STRONG", "EM", "U", "UL", "OL", "LI", "A"]);

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const nodes: Element[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Element);
  }

  for (const el of nodes) {
    const tag = el.tagName.toUpperCase();
    if (!allowed.has(tag)) {
      const parent = el.parentNode;
      if (!parent) continue;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      continue;
    }

    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "style" || name === "class") {
        el.removeAttribute(attr.name);
      }
    }

    if (tag === "A") {
      const href = el.getAttribute("href") ?? "";
      if (!isSafeHref(href)) {
        el.removeAttribute("href");
      } else {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    } else {
      el.removeAttribute("href");
      el.removeAttribute("target");
      el.removeAttribute("rel");
    }
  }

  return doc.body.innerHTML.trim();
}

export function htmlToPlainText(html: string | null | undefined): string {
  const raw = String(html ?? "").trim();
  if (!raw) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return raw
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+\n/g, "\n").trim();
}

export function renderEventCardHtml(event: EventCardEvent, tenant: EventCardTenant, options: RenderOptions = {}): string {
  const dateText = new Date(event.event_date).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const endsAtText = event.ends_at
    ? new Date(event.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : null;

  const descriptionHtml =
    sanitizeRichHtml(event.description_html) ||
    (event.description ? `<p style="margin:0;">${escapeHtml(event.description)}</p>` : "");

  const bannerUrl = options.bannerUrl ?? null;
  const contactPhone = (tenant.contact_phone ?? "").trim();

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;max-width:640px;">
  ${bannerUrl ? `
  <tr>
    <td style="padding:0;">
      <img src="${escapeHtml(bannerUrl)}" alt="${escapeHtml(event.title)}" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;" />
    </td>
  </tr>` : ""}
  <tr>
    <td style="padding:22px 22px 16px;">
      <div style="font-size:22px;line-height:1.25;font-weight:800;color:#111827;margin:0 0 8px;">
        ${escapeHtml(event.title)}
      </div>
      <div style="font-size:13px;line-height:1.4;color:#6b7280;">
        <div style="margin:0 0 4px;">📅 ${escapeHtml(dateText)}${endsAtText ? ` até ${escapeHtml(endsAtText)}` : ""}</div>
        ${event.location ? `<div style="margin:0;">📍 ${escapeHtml(event.location)}</div>` : ""}
      </div>
    </td>
  </tr>
  ${descriptionHtml ? `
  <tr>
    <td style="padding:0 22px 18px;">
      <div style="font-size:14px;line-height:1.6;color:#374151;">
        ${descriptionHtml}
      </div>
    </td>
  </tr>` : ""}
  <tr>
    <td style="padding:14px 22px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;">
        <div style="font-size:12px;color:#6b7280;">
          <strong style="color:#111827;">${escapeHtml(tenant.name)}</strong>
        </div>
        ${contactPhone ? `<div style="font-size:12px;color:#6b7280;">☎ ${escapeHtml(contactPhone)}</div>` : ""}
      </div>
    </td>
  </tr>
</table>`.trim();
}
