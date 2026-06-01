import { createClient } from 'jsr:@supabase/supabase-js@2';

interface RequestBody {
  email: string;
  password: string;
  full_name: string;
  global_role: 'super_admin' | 'operations' | 'support';
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
    return json({ error: 'NOT_AUTHORIZED' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Verificar que o chamador é um admin global ativo
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: callerUser }, error: authError } = await callerClient.auth.getUser();
  if (authError || !callerUser) {
    return json({ error: 'NOT_AUTHORIZED' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('global_role, status')
    .eq('id', callerUser.id)
    .single<{ global_role: string | null; status: string }>();

  if (
    !callerProfile ||
    callerProfile.status !== 'active' ||
    !['super_admin', 'operations'].includes(callerProfile.global_role ?? '')
  ) {
    return json({ error: 'FORBIDDEN' }, 403);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_BODY' }, 400);
  }

  const { email, password, full_name, global_role } = body;

  if (!email || !password || !full_name || !global_role) {
    return json({ error: 'MISSING_FIELDS' }, 400);
  }

  if (!['super_admin', 'operations', 'support'].includes(global_role)) {
    return json({ error: 'INVALID_ROLE' }, 400);
  }

  if (password.length < 8) {
    return json({ error: 'PASSWORD_TOO_SHORT' }, 400);
  }

  // Criar usuário no Auth
  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError || !createdUser.user) {
    const msg = createError?.message ?? 'Falha ao criar usuário.';
    if (msg.toLowerCase().includes('already')) {
      return json({ error: 'EMAIL_ALREADY_EXISTS' }, 409);
    }
    return json({ error: msg }, 500);
  }

  const newUser = createdUser.user;

  // Promover perfil como admin global
  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: newUser.id,
    email,
    full_name,
    global_role,
    status: 'active',
  });

  if (profileError) {
    // Rollback: remover o usuário criado para não deixar órfão
    await adminClient.auth.admin.deleteUser(newUser.id);
    return json({ error: `Usuário criado mas perfil falhou: ${profileError.message}` }, 500);
  }

  return json({ id: newUser.id, email, full_name, global_role }, 200);
});

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
