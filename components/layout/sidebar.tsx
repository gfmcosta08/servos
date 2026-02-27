"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users2,
  CalendarDays,
  UserCheck,
  Settings,
  LogOut,
  Cross,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ministerios", label: "Ministérios", icon: Users2 },
  { href: "/escalas", label: "Escalas", icon: CalendarDays },
  { href: "/voluntarios", label: "Voluntários", icon: UserCheck },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  parishName?: string;
  userName?: string;
  userRole?: string;
}

export function Sidebar({ parishName, userName, userRole }: SidebarProps) {
  const pathname = usePathname();

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN_PARISH: "Administrador",
    COORDINATOR: "Coordenador",
    VOLUNTEER: "Voluntário",
  };

  return (
    <aside className="w-64 bg-primary-950 text-white flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-primary-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shrink-0">
            <Cross className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight">Servos</p>
            <p className="text-primary-300 text-xs truncate">
              {parishName ?? "Paróquia"}
            </p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary-700 text-white"
                  : "text-primary-300 hover:bg-primary-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Usuário + Logout */}
      <div className="p-4 border-t border-primary-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-primary-700 rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary-200">
              {userName?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userName ?? "Usuário"}
            </p>
            <p className="text-xs text-primary-400">
              {roleLabel[userRole ?? ""] ?? userRole ?? ""}
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-primary-400 hover:text-white transition-colors w-full px-1 py-1"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
