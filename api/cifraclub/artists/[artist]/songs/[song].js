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

  if (!artist || !song) {
    res.status(400).json({ error: "MISSING_PARAMS" });
    return;
  }

  const urls = [
    `https://www.cifraclub.com.br/${encodeURIComponent(artist)}/${encodeURIComponent(song)}/`,
    `https://www.cifraclub.com.br/${encodeURIComponent(artist)}/${encodeURIComponent(song)}/imprimir.html`,
    `https://m.cifraclub.com.br/${encodeURIComponent(artist)}/${encodeURIComponent(song)}/`,
  ];

  let response = null;
  let lastStatus = 0;
  let lastUrl = urls[0];
  for (const url of urls) {
    lastUrl = url;
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
      response = null;
    }

    if (!response) continue;
    lastStatus = response.status;
    if (response.ok) break;
    if (response.status === 403) continue;
    break;
  }

  if (!response) {
    res.status(502).json({ error: "FETCH_FAILED" });
    return;
  }

  if (!response.ok) {
    res.status(response.status === 404 ? 404 : 502).json({ error: "UPSTREAM_ERROR", status: response.status, upstream_status: response.status, url: lastUrl });
    return;
  }

  const html = await response.text();
  const $ = load(html);

  const name = pickFirstText($, ["h1.t1", "h1"]);
  const artistName = pickFirstText($, ["h2.t3", "h2"]);
  const youtubeUrl = extractYoutubeUrl($);
  const cifraText = pickFirstText($, [".cifra_cnt pre", ".cifra pre", "pre"]);
  const cifra = cifraText ? cifraText.split(/\r?\n/) : [];

  if (!name && cifra.length === 0) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }

  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).json({
    artist: artistName || null,
    name: name || null,
    youtube_url: youtubeUrl,
    cifraclub_url: response.url || urls[0],
    cifra,
  });
}
