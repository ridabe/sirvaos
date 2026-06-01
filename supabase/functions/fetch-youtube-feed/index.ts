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

    const feedUrl = channel_type === 'playlist'
      ? `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(channel_id)}`
      : `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel_id)}`;

    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SirvaOS/1.0)' },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ videos: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const xml = await response.text();
    const videos = parseYouTubeFeed(xml);

    return new Response(JSON.stringify({ videos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), videos: [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
