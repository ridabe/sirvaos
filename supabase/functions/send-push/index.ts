import { createClient } from 'jsr:@supabase/supabase-js@2';

type PushRequestBody = {
  profile_ids: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  module_code?: string;
};

type TenantRole = 'owner' | 'admin' | 'member';
type ProfileStatus = 'active' | 'invited' | 'suspended';
type GlobalRole = 'super_admin' | 'operations' | 'support';

type ProfileRow = {
  id: string;
  tenant_id: string | null;
  tenant_role: TenantRole | null;
  status: ProfileStatus;
  member_id: string | null;
  global_role: GlobalRole | null;
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function extractPushToken(row: Record<string, unknown>): string | null {
  const candidates = [
    row.token,
    row.push_token,
    row.expo_push_token,
    row.expo_token,
    row.device_token,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

async function ensureCanSendAsUser(params: {
  supabaseUrl: string;
  anonKey: string;
  authHeader: string;
  moduleCode: string;
}): Promise<{ tenantId: string; profile: ProfileRow }> {
  const userClient = createClient(params.supabaseUrl, params.anonKey, {
    global: { headers: { Authorization: params.authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error('NOT_AUTHORIZED');
  }

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('id, tenant_id, tenant_role, status, member_id, global_role')
    .eq('id', authData.user.id)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile) {
    throw new Error('NOT_AUTHORIZED');
  }

  if (profile.status !== 'active' || !profile.tenant_id) {
    throw new Error('NOT_AUTHORIZED');
  }

  if (profile.global_role) {
    return { tenantId: profile.tenant_id, profile };
  }

  if (profile.tenant_role === 'owner' || profile.tenant_role === 'admin') {
    return { tenantId: profile.tenant_id, profile };
  }

  const { data: moduleRow } = await userClient
    .from('platform_modules')
    .select('id')
    .eq('code', params.moduleCode)
    .maybeSingle<{ id: string }>();

  const moduleId = moduleRow?.id ?? null;
  if (!moduleId) {
    throw new Error('NOT_AUTHORIZED');
  }

  const { data: directAdmin } = await userClient
    .from('tenant_module_admins')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('module_id', moduleId)
    .eq('profile_id', profile.id)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (directAdmin?.id) {
    return { tenantId: profile.tenant_id, profile };
  }

  if (profile.member_id) {
    const { data: memberAdmin } = await userClient
      .from('tenant_module_admins')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('module_id', moduleId)
      .eq('member_id', profile.member_id)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (memberAdmin?.id) {
      return { tenantId: profile.tenant_id, profile };
    }
  }

  throw new Error('NOT_AUTHORIZED');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'NOT_AUTHORIZED' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'SUPABASE env not configured' }, 500);
  }

  let body: PushRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const profileIds = Array.isArray(body.profile_ids) ? body.profile_ids.filter((id) => typeof id === 'string' && id) : [];
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const messageBody = typeof body.body === 'string' ? body.body.trim() : '';

  if (profileIds.length === 0) {
    return jsonResponse({ error: 'profile_ids is required' }, 400);
  }
  if (!title) {
    return jsonResponse({ error: 'title is required' }, 400);
  }
  if (!messageBody) {
    return jsonResponse({ error: 'body is required' }, 400);
  }

  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  const isServiceRoleCaller = bearer === serviceRoleKey;

  let tenantId: string | null = null;
  if (!isServiceRoleCaller) {
    const moduleCode = typeof body.module_code === 'string' ? body.module_code.trim() : '';
    if (!moduleCode) {
      return jsonResponse({ error: 'module_code is required for authenticated calls' }, 400);
    }

    try {
      const result = await ensureCanSendAsUser({ supabaseUrl, anonKey, authHeader, moduleCode });
      tenantId = result.tenantId;
    } catch (err) {
      const code = String(err?.message ?? err);
      return jsonResponse({ error: code === 'NOT_AUTHORIZED' ? 'NOT_AUTHORIZED' : 'NOT_AUTHORIZED' }, 403);
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const uniqueProfileIds = Array.from(new Set(profileIds));

  if (tenantId) {
    const { data: allowedProfiles, error: allowedError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', uniqueProfileIds)
      .eq('tenant_id', tenantId)
      .returns<{ id: string }[]>();

    if (allowedError) {
      return jsonResponse({ error: 'FAILED_TO_VALIDATE_RECIPIENTS' }, 500);
    }

    const allowedSet = new Set((allowedProfiles ?? []).map((p) => p.id));
    const filtered = uniqueProfileIds.filter((id) => allowedSet.has(id));
    if (filtered.length === 0) {
      return jsonResponse({ ok: true, sent: 0, failed: 0, token_count: 0, profile_count: 0 }, 200);
    }
    uniqueProfileIds.length = 0;
    uniqueProfileIds.push(...filtered);
  }

  const { data: tokenRows, error: tokenError } = await supabase
    .from('push_tokens')
    .select('*')
    .in('profile_id', uniqueProfileIds)
    .returns<Record<string, unknown>[]>();

  if (tokenError) {
    return jsonResponse({ error: 'FAILED_TO_LOAD_PUSH_TOKENS' }, 500);
  }

  const tokens = (tokenRows ?? [])
    .map((row) => extractPushToken(row))
    .filter((t): t is string => Boolean(t));

  const uniqueTokens = Array.from(new Set(tokens));

  if (uniqueTokens.length === 0) {
    return jsonResponse({ ok: true, sent: 0, failed: 0, token_count: 0, profile_count: uniqueProfileIds.length }, 200);
  }

  const dataPayload = (body.data && typeof body.data === 'object') ? body.data : {};

  let sent = 0;
  let failed = 0;

  for (const batch of chunk(uniqueTokens, 100)) {
    const messages = batch.map((to) => ({
      to,
      title,
      body: messageBody,
      data: dataPayload,
    }));

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const resBody = (await res.json().catch(() => null)) as { data?: Array<{ status?: string }> } | null;
      const results = Array.isArray(resBody?.data) ? resBody!.data! : null;

      if (!res.ok || !results) {
        failed += batch.length;
        continue;
      }

      for (const item of results) {
        if (item?.status === 'ok') sent++;
        else failed++;
      }
    } catch {
      failed += batch.length;
    }
  }

  const notificationRows = uniqueProfileIds.map((profile_id) => ({
    profile_id,
    title,
    body: messageBody,
    data: dataPayload,
  }));

  for (const batch of chunk(notificationRows, 500)) {
    try {
      await supabase.from('notifications').insert(batch);
    } catch {
      break;
    }
  }

  return jsonResponse({
    ok: true,
    sent,
    failed,
    token_count: uniqueTokens.length,
    profile_count: uniqueProfileIds.length,
  });
});

