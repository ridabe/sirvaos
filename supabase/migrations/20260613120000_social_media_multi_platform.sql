-- Pendência P7 — Mídias Sociais multi-plataforma (YouTube, Instagram, Spotify).
alter table public.social_media_channels drop constraint if exists social_media_channels_platform_check;
alter table public.social_media_channels
  add constraint social_media_channels_platform_check
  check (platform in ('youtube', 'instagram', 'spotify'));

alter table public.social_media_channels drop constraint if exists social_media_channels_type_check;
alter table public.social_media_channels
  add constraint social_media_channels_type_check
  check (channel_type in ('channel', 'playlist', 'profile', 'post', 'embed'));
