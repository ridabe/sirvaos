import {
  Bell,
  CalendarDays,
  LayoutDashboard,
  Network,
  UsersRound,
} from "lucide-react";

export const modules = [
  { name: "Membresia", metric: "12.450", label: "membros organizados" },
  { name: "Louvor", metric: "186", label: "escalas publicadas" },
  { name: "Kids", metric: "72", label: "famílias acompanhadas" },
];

export const tenantCards = [
  {
    name: "Primeira Igreja",
    status: "Online",
    modules: "Membresia, Louvor, Financeiro",
  },
  {
    name: "Comunidade Vida",
    status: "Configurando",
    modules: "Kids, Escola Bíblica",
  },
  {
    name: "Igreja Central",
    status: "Online",
    modules: "Todos os módulos",
  },
];

export const features = [
  {
    icon: LayoutDashboard,
    title: "Operação do SaaS",
    text: "Admin Global para gerir tenants, planos, catálogo de módulos e auditoria da plataforma.",
  },
  {
    icon: Network,
    title: "White-label por igreja",
    text: "Marca do cliente aplicada no painel: logo, cores e módulos ativos sem conflitar com a plataforma.",
  },
  {
    icon: Bell,
    title: "Comunicados segmentados",
    text: "Envios por perfil e módulo para reduzir ruído e garantir que cada time veja o que importa.",
  },
  {
    icon: CalendarDays,
    title: "Calendário integrado",
    text: "Agenda central com eventos dos ministérios para evitar conflitos e dar visão à liderança.",
  },
  {
    icon: UsersRound,
    title: "Membresia unificada",
    text: "Cadastro único de pessoas com vínculo a ministérios, histórico e visão consolidada do tenant.",
  },
];
