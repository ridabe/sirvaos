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
    title: "Admin Global",
    text: "Gerencie clientes, planos e módulos em um só lugar.",
  },
  {
    icon: Network,
    title: "White-label",
    text: "Cada igreja usa sua logo, cores e módulos contratados.",
  },
  {
    icon: Bell,
    title: "Notificações",
    text: "Escalas, eventos e comunicados chegam às pessoas certas.",
  },
  {
    icon: CalendarDays,
    title: "Calendário único",
    text: "A liderança enxerga a agenda consolidada da igreja.",
  },
  {
    icon: UsersRound,
    title: "Membros",
    text: "Cadastro central para todos os ministérios e módulos.",
  },
];
