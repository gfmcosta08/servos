"use client";

import { useState, useEffect, useCallback } from "react";
import { UserCheck, Shield, ChevronDown } from "lucide-react";
import { getVolunteersAction, updateUserRoleAction } from "@/lib/actions/volunteers";
import toast from "react-hot-toast";
import type { User, UserRole } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN_PARISH: "Administrador",
  COORDINATOR: "Coordenador",
  VOLUNTEER: "Voluntário",
};

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-50 text-red-700",
  ADMIN_PARISH: "bg-purple-50 text-purple-700",
  COORDINATOR: "bg-blue-50 text-blue-700",
  VOLUNTEER: "bg-green-50 text-green-700",
};

export default function VoluntariosPage() {
  const [volunteers, setVolunteers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getVolunteersAction();
    if (result.success) setVolunteers(result.data ?? []);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: rawData } = await supabase.from("users").select("role").eq("id", user.id).single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = rawData as any;
      if (data) setCurrentUserRole(data.role as UserRole);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRoleChange(userId: string, newRole: string) {
    const result = await updateUserRoleAction(
      userId,
      newRole as "ADMIN_PARISH" | "COORDINATOR" | "VOLUNTEER"
    );
    if (result.success) {
      toast.success("Cargo atualizado.");
      loadData();
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  const canManage = currentUserRole === "ADMIN_PARISH" || currentUserRole === "SUPER_ADMIN";

  const filtered = volunteers.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voluntários</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {volunteers.length} pessoa{volunteers.length !== 1 ? "s" : ""} cadastrada
            {volunteers.length !== 1 ? "s" : ""} na paróquia.
          </p>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <UserCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {search ? "Nenhum voluntário encontrado." : "Nenhum voluntário cadastrado."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Nome
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Cargo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((vol) => (
                <tr key={vol.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-600">
                          {vol.name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{vol.name}</span>
                      {vol.id === currentUserId && (
                        <span className="text-xs text-gray-400">(você)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500 hidden md:table-cell">
                    {vol.email}
                  </td>
                  <td className="px-5 py-4">
                    {canManage &&
                    vol.id !== currentUserId &&
                    vol.role !== "SUPER_ADMIN" ? (
                      <div className="relative inline-block">
                        <select
                          value={vol.role}
                          onChange={(e) => handleRoleChange(vol.id, e.target.value)}
                          className={`appearance-none pl-2.5 pr-6 py-1 rounded-full text-xs font-medium cursor-pointer ${ROLE_COLORS[vol.role as UserRole]} border-0 outline-none`}
                        >
                          <option value="VOLUNTEER">Voluntário</option>
                          <option value="COORDINATOR">Coordenador</option>
                          <option value="ADMIN_PARISH">Administrador</option>
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-60" />
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          ROLE_COLORS[vol.role as UserRole] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {vol.role === "ADMIN_PARISH" || vol.role === "SUPER_ADMIN" ? (
                          <Shield className="w-3 h-3" />
                        ) : null}
                        {ROLE_LABELS[vol.role as UserRole] ?? vol.role}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
