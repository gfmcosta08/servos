"use client";

import { useState } from "react";
import { Menu, X, Cross } from "lucide-react";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  parishName?: string;
  userName?: string;
  userRole?: string;
  children: React.ReactNode;
}

export function AppShell({
  parishName,
  userName,
  userRole,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — slide-in em mobile, estática em desktop */}
      <div
        className={`
          fixed inset-y-0 left-0 z-30
          transform transition-transform duration-300 ease-in-out
          lg:static lg:z-auto lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Botão fechar — apenas mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-primary-300 hover:text-white lg:hidden z-10"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
        <Sidebar
          parishName={parishName}
          userName={userName}
          userRole={userRole}
        />
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-primary-950 text-white shrink-0 border-b border-primary-900">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-primary-300 hover:text-white transition"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Cross className="w-4 h-4 text-primary-400" />
            <span className="font-bold text-sm tracking-tight">Servos</span>
          </div>
          {parishName && (
            <span className="text-xs text-primary-400 truncate ml-auto">
              {parishName}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
