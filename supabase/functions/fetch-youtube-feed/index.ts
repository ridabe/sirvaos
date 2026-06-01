interface YouTubeVideo {
  videoId: string;
  title: string;
  published: string;
  thumbnail: string;
  description: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channel_id, channel_type } = await req.json() as {
      channel_id: string;
      channel_type: 'channel' | 'playlist';
    };

    if (!channel_id) {
      return new Response(JSON.stringify({ error: 'channel_id is required', videos: [] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let feedUrl: string;
    let resolvedId = channel_id;
    const debug: string[] = [];

    if (channel_type === 'playlist') {
      feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(channel_id)}`;
      debug.push(`playlist feed: ${feedUrl}`);
    } else if (channel_id.startsWith('UC')) {
      feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel_id)}`;
      debug.push(`direct UC feed: ${feedUrl}`);
    } else {
      // @handle ou username — tenta múltiplas estratégias
      const result = await resolveHandle(channel_id, debug);
      resolvedId = result;
      feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(resolvedId)}`;
      debug.push(`resolved to: ${resolvedId}, feed: ${feedUrl}`);
    }

    const response = await fetch(feedUrl, { headers: { 'User-Agent': UA } });
    debug.push(`feed HTTP: ${response.status}`);

    if (!response.ok) {
      return new Response(JSON.stringify({ videos: [], debug }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const xml = await response.text();
    debug.push(`feed XML length: ${xml.length}`);
    const videos = parseYouTubeFeed(xml);
    debug.push(`parsed videos: ${videos.length}`);

    return new Response(JSON.stringify({ videos, debug }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), videos: [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/** Constrói URL do YouTube com encoding correto para handles com caracteres especiais */
function buildChannelUrl(handle: string, suffix = ''): string {
  const encodedHandle = handle.startsWith('@')
    ? '@' + encodeURIComponent(handle.slice(1))
    : `user/${encodeURIComponent(handle)}`;
  return `https://www.youtube.com/${encodedHandle}${suffix}`;
}

async function resolveHandle(handle: string, debug: string[]): Promise<string> {
  // Estratégia 0: RSS direto com @handle (YouTube aceita isso em alguns casos)
  const directRss = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(handle)}`;
  debug.push(`try direct RSS: ${directRss}`);
  try {
    const r = await fetch(directRss, { headers: { 'User-Agent': UA } });
    debug.push(`direct RSS status: ${r.status}`);
    if (r.ok) {
      const xml = await r.text();
      if (xml.includes('<yt:videoId>')) {
        // Extrai o UC real do feed para armazenar
        const ucMatch = xml.match(/<yt:channelId>(UC[a-zA-Z0-9_-]+)<\/yt:channelId>/);
        const resolved = ucMatch?.[1] ?? handle;
        debug.push(`direct RSS worked, UC: ${resolved}`);
        return resolved;
      }
    }
  } catch (e) {
    debug.push(`direct RSS error: ${e}`);
  }

  // Estratégia 1: Scrape da página /videos do canal
  const candidates = [
    buildChannelUrl(handle, '/videos'),
    buildChannelUrl(handle, ''),
  ];

  for (const pageUrl of candidates) {
    debug.push(`scrape: ${pageUrl}`);
    try {
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      debug.push(`scrape HTTP: ${res.status}`);

      if (!res.ok) continue;

      const html = await res.text();
      debug.push(`HTML length: ${html.length}, snippet: ${html.slice(0, 200).replace(/\s+/g, ' ')}`);

      // Padrão mais confiável: link RSS embutido no <head>
      const rssLink = html.match(/feeds\/videos\.xml\?channel_id=(UC[a-zA-Z0-9_-]+)/);
      if (rssLink?.[1]) {
        debug.push(`found via RSS link: ${rssLink[1]}`);
        return rssLink[1];
      }

      // Fallbacks no JSON embutido
      for (const pattern of [
        /"externalId":"(UC[a-zA-Z0-9_-]{22})"/,
        /"channelId":"(UC[a-zA-Z0-9_-]{22})"/,
        /"browseId":"(UC[a-zA-Z0-9_-]{22})"/,
        /\/channel\/(UC[a-zA-Z0-9_-]{22})["\/]/,
      ]) {
        const m = html.match(pattern);
        if (m?.[1]) {
          debug.push(`found via pattern ${pattern}: ${m[1]}`);
          return m[1];
        }
      }

      debug.push('no UC found in HTML');
    } catch (e) {
      debug.push(`scrape error: ${e}`);
    }
  }

  debug.push(`could not resolve, returning original: ${handle}`);
  return handle;
}

function parseYouTubeFeed(xml: string): YouTubeVideo[] {
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];

  return entries.slice(0, 15).map((entry) => {
    const videoId = (entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/) ?? [])[1] ?? '';
    const rawTitle = (entry.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? '';
    const published = (entry.match(/<published>(.*?)<\/published>/) ?? [])[1] ?? '';
    const thumbnail = (entry.match(/<media:thumbnail url="(.*?)"/) ?? [])[1]
      ?? (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');
    const rawDesc = (entry.match(/<media:description>([\s\S]*?)<\/media:description>/) ?? [])[1] ?? '';

    return {
      videoId,
      title: decodeXmlEntities(rawTitle),
      published,
      thumbnail,
      description: decodeXmlEntities(rawDesc).slice(0, 200),
    };
  }).filter((v) => Boolean(v.videoId));
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
