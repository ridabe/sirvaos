import { load } from "cheerio";

function normalizeQueryValue(value) {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function extractYoutubeUrl($) {
  const imgSrc = $(".player-placeholder img").first().attr("src") || "";
  const match = imgSrc.match(/\/vi\/([^/]+)\//i);
  if (!match?.[1]) return null;
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

function pickFirstText($, selectors) {
  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) return text;
  }
  return "";
}

async function fetchHtml(url) {
  let response;
  try {
    response = await globalThis.fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "SirvaOS/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Referer: "https://www.cifraclub.com.br/",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
  } catch {
    return { ok: false, status: 0, url, html: "" };
  }

  const html = await response.text();
  return { ok: response.ok, status: response.status, url: response.url || url, html };
}

function extractCandidatesFromArtistPage(html, artistSlug, originUrl) {
  const $ = load(html);
  const base = "https://www.cifraclub.com.br";
  const candidates = [];
  const seen = new Set();

  $("a[href]").each((_, el) => {
    const href = String($(el).attr("href") || "").trim();
    if (!href) return;
    const abs = href.startsWith("http") ? href : `${base}${href.startsWith("/") ? "" : "/"}${href}`;
    if (!abs.startsWith(`${base}/`)) return;

    const path = abs.replace(base, "").split("?")[0] || "";
    const parts = path.split("/").filter(Boolean);
    if (parts.length < 2) return;
    const [a, s] = parts;
    if (a !== artistSlug) return;
    if (!s || s === "index.html") return;
    const key = `${a}/${s}`;
    if (seen.has(key)) return;
    seen.add(key);

    const text = String($(el).text() || "").trim();
    candidates.push({
      artist_slug: a,
      song_slug: s,
      artist_name: null,
      song_name: text || null,
      cifraclub_url: `${base}/${a}/${s}`,
    });
  });

  if (candidates.length > 0) return candidates;

  const fallback = load(html);
  const title = pickFirstText(fallback, ["h1", "header h1"]);
  if (title && artistSlug) {
    return [
      {
        artist_slug: artistSlug,
        song_slug: "",
        artist_name: title,
        song_name: null,
        cifraclub_url: originUrl,
      },
    ].filter((c) => c.song_slug);
  }

  return [];
}

async function fetchSong(artist, song) {
  const urls = [
    `https://www.cifraclub.com.br/${encodeURIComponent(artist)}/${encodeURIComponent(song)}/`,
    `https://www.cifraclub.com.br/${encodeURIComponent(artist)}/${encodeURIComponent(song)}/imprimir.html`,
    `https://m.cifraclub.com.br/${encodeURIComponent(artist)}/${encodeURIComponent(song)}/`,
  ];

  let lastStatus = 0;
  let lastUrl = urls[0];
  let html = "";
  let resolvedUrl = "";

  for (const u of urls) {
    const result = await fetchHtml(u);
    lastStatus = result.status;
    lastUrl = u;
    if (!result.ok) {
      if (result.status === 403) continue;
      return { ok: false, status: result.status || 502, url: u, html: "", upstream_status: result.status || null };
    }
    html = result.html;
    resolvedUrl = result.url || u;
    break;
  }

  if (!html) {
    return { ok: false, status: lastStatus || 502, url: lastUrl, html: "", upstream_status: lastStatus || null };
  }

  const $ = load(html);
  const name = pickFirstText($, ["h1.t1", "h1"]);
  const artistName = pickFirstText($, ["h2.t3", "h2"]);
  const youtubeUrl = extractYoutubeUrl($);
  const cifraText = pickFirstText($, [".cifra_cnt pre", ".cifra pre", "pre"]);
  const cifra = cifraText ? cifraText.split(/\r?\n/) : [];

  if (!name && cifra.length === 0) {
    return { ok: false, status: 404, url: fallbackUrl, html: "", upstream_status: 404 };
  }

  return {
    ok: true,
    song: {
      artist: artistName || null,
      name: name || null,
      youtube_url: youtubeUrl,
      cifraclub_url: resolvedUrl || urls[0],
      cifra,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const artist = normalizeQueryValue(req.query.artist);
  const song = normalizeQueryValue(req.query.song);

  if (!artist && !song) {
    res.status(400).json({ error: "MISSING_PARAMS" });
    return;
  }

  if (artist && song) {
    const result = await fetchSong(artist, song);
    if (!result.ok) {
      res.status(result.status === 404 ? 404 : 502).json({
        error: result.status === 404 ? "NOT_FOUND" : "UPSTREAM_ERROR",
        upstream_status: result.upstream_status ?? null,
      });
      return;
    }
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({ mode: "song", song: result.song });
    return;
  }

  if (artist && !song) {
    const artistUrl = `https://www.cifraclub.com.br/${encodeURIComponent(artist)}/`;
    const { ok, status, html } = await fetchHtml(artistUrl);
    if (!ok) {
      res.status(status === 404 ? 404 : 502).json({ error: "UPSTREAM_ERROR", upstream_status: status || null });
      return;
    }

    const candidates = extractCandidatesFromArtistPage(html, artist, artistUrl).slice(0, 30);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ mode: "candidates", candidates });
    return;
  }

  res.status(200).json({ mode: "candidates", candidates: [] });
}
