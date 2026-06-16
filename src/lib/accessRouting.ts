// Roteamento pós-login: define o destino do usuário e bloqueia acessos suspensos.
import { supabase } from "./supabase";

type AccessProfile = {
  global_role: "super_admin" | "operations" | "support" | null;
  tenant_id: string | null;
  tenant_role: "owner" | "admin" | "member" | null;
  status: "active" | "invited" | "suspended";
};

export async function resolvePostLoginPath(userId: string) {
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("global_role, tenant_id, tenant_role, status")
    .eq("id", userId)
    .single<AccessProfile>();

  if (profileError || !profileData) {
    throw new Error("Login efetuado, mas não foi possível carregar o perfil do usuário.");
  }

  if (profileData.status !== "active") {
    await supabase.auth.signOut();
    throw new Error("Usuário inativo ou sem liberação.");
  }

  if (profileData.global_role === "super_admin" || profileData.global_role === "operations") {
    return "/admin-global";
  }

  if (!profileData.tenant_id) {
    await supabase.auth.signOut();
    throw new Error("Usuário autenticado, mas sem Igreja associada.");
  }

  const { data: tenantData } = await supabase
    .from("tenants")
    .select("status")
    .eq("id", profileData.tenant_id)
    .single<{ status: "active" | "suspended" | "configuring" }>();

  if (tenantData?.status === "suspended") {
    await supabase.auth.signOut();
    throw new Error("O acesso da sua igreja está suspenso. Entre em contato com o administrador do SirvaOS.");
  }

  // Registra o acesso (login) do cliente para a métrica do Admin Global.
  // Este é o ponto único pós-login da web (roda em todos os logins).
  // IMPORTANTE: aguardamos a RPC concluir, pois o chamador faz
  // window.location.assign logo em seguida, o que cancelaria a requisição
  // em andamento. Uma falha aqui não deve bloquear o direcionamento.
  // Marca a aba para a restauração de sessão do ClientAdmin não recontar o login.
  try {
    await supabase.rpc("register_tenant_access");
  } catch {
    // Falha ao registrar acesso — ignora para não travar o login.
  }
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("tenant_access_registered", "1");
    }
  } catch {
    // sessionStorage indisponível — ignora.
  }

  if (profileData.tenant_role === "owner" || profileData.tenant_role === "admin") {
    return "/admin-cliente";
  }

  return "/membro";
}
