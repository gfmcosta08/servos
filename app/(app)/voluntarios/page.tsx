"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Shield, ChevronDown, Plus, X, Trash2, UserMinus, Mail } from "lucide-react";
import {
  getVolunteersAction,
  getPendingUsersAction,
  getPendingMinistryRequestsAction,
  getMinistriesUserCanManageAction,
  updateUserRoleAction,
  addMinistryCoordinatorAction,
  removeMinistryCoordinatorAction,
  approveUserAction,
  rejectUserAction,
  approveMinistryRequestAction,
  removeUserFromMinistryAction,
  excludeUserAction,
  confirmUserEmailManuallyAction,
  confirmUserEmailByEmailAction,
  approveUserByEmailAction,
  fixUserParishByEmailAction,
} from "@/lib/actions/volunteers";
import { getMinistriesAction } from "@/lib/actions/ministries";
import { getParishesAction, getMinistriesByParishAction } from "@/lib/actions/auth";
import toast from "react-hot-toast";
import type { UserRole } from "@/types/database";
import type { UserWithCoordinators } from "@/lib/actions/volunteers";
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
  const router = useRouter();
  const [volunteers, setVolunteers] = useState<UserWithCoordinators[]>([]);
  const [pending, setPending] = useState<UserWithCoordinators[]>([]);
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addingFor, setAddingFor] = useState<{ userId: string; userName: string } | null>(null);
  const [approvingFor, setApprovingFor] = useState<{ userId: string; userName: string } | null>(null);
  const [pendingMinistryRequests, setPendingMinistryRequests] = useState<
    { user_id: string; user_name: string; user_email: string; ministry_id: string; ministry_name: string }[]
  >([]);
  const   [coordMinistries, setCoordMinistries] = useState<{ id: string; name: string }[]>([]);
  const [confirmingEmailId, setConfirmingEmailId] = useState<string | null>(null);
  const [confirmEmailByAddress, setConfirmEmailByAddress] = useState("");
  const [confirmingEmailByAddress, setConfirmingEmailByAddress] = useState(false);
  const [approveEmailByAddress, setApproveEmailByAddress] = useState("");
  const [approvingEmailByAddress, setApprovingEmailByAddress] = useState(false);
  const [fixEmail, setFixEmail] = useState("");
  const [fixParishId, setFixParishId] = useState("");
  const [fixMinistryId, setFixMinistryId] = useState("");
  const [fixParishes, setFixParishes] = useState<{ id: string; name: string; city: string; state: string }[]>([]);
  const [fixMinistries, setFixMinistries] = useState<{ id: string; name: string }[]>([]);
  const [fixingParish, setFixingParish] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [volResult, minResult, pendResult, pendMinResult, coordResult] = await Promise.all([
      getVolunteersAction(),
      getMinistriesAction(),
      getPendingUsersAction(),
      getPendingMinistryRequestsAction(),
      getMinistriesUserCanManageAction(),
    ]);
    if (volResult.success) setVolunteers(volResult.data ?? []);
    if (minResult.success) setMinistries(minResult.data?.map((m) => ({ id: m.id, name: m.name })) ?? []);
    if (pendResult.success) setPending(pendResult.data ?? []);
    if (pendMinResult.success) setPendingMinistryRequests(pendMinResult.data ?? []);
    if (coordResult.success) setCoordMinistries(coordResult.data ?? []);

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

  useEffect(() => {
    if (currentUserRole === "SUPER_ADMIN") {
      getParishesAction().then((r) => {
        if (r.success && r.data) setFixParishes(r.data);
      });
    }
  }, [currentUserRole]);

  useEffect(() => {
    if (fixParishId) {
      getMinistriesByParishAction(fixParishId).then((r) => {
        if (r.success && r.data) setFixMinistries(r.data);
        else setFixMinistries([]);
      });
      setFixMinistryId("");
    } else {
      setFixMinistries([]);
      setFixMinistryId("");
    }
  }, [fixParishId]);

  useEffect(() => {
    if (currentUserRole === "VOLUNTEER") {
      router.replace("/dashboard");
    }
  }, [currentUserRole, router]);

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

  async function handleAddCoordinator(userId: string, ministryId: string) {
    const result = await addMinistryCoordinatorAction(userId, ministryId);
    if (result.success) {
      toast.success("Coordenador adicionado.");
      setAddingFor(null);
      loadData();
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  async function handleRemoveCoordinator(userId: string, ministryId: string) {
    const result = await removeMinistryCoordinatorAction(userId, ministryId);
    if (result.success) {
      toast.success("Coordenador removido.");
      loadData();
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  async function handleApprove(userId: string, asCoordinator?: boolean, ministryId?: string) {
    const result = await approveUserAction(userId, { asCoordinator: !!asCoordinator, ministryId });
    if (result.success) {
      toast.success(asCoordinator ? "Aprovado como coordenador." : "Usuário aprovado.");
      setApprovingFor(null);
      loadData();
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  async function handleReject(userId: string) {
    const result = await rejectUserAction(userId);
    if (result.success) {
      toast.success("Solicitação rejeitada.");
      loadData();
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  async function handleConfirmEmail(userId: string) {
    setConfirmingEmailId(userId);
    const result = await confirmUserEmailManuallyAction(userId);
    if (result.success) {
      toast.success("Email confirmado. O usuário já pode fazer login.");
      loadData();
    } else {
      toast.error(result.error ?? "Erro ao confirmar email.");
    }
    setConfirmingEmailId(null);
  }

  async function handleConfirmEmailByAddress() {
    if (!confirmEmailByAddress.trim()) return;
    setConfirmingEmailByAddress(true);
    const result = await confirmUserEmailByEmailAction(confirmEmailByAddress.trim());
    if (result.success) {
      toast.success("Email confirmado. A pessoa já pode fazer login.");
      setConfirmEmailByAddress("");
      loadData();
    } else {
      toast.error(result.error ?? "Erro ao confirmar email.");
    }
    setConfirmingEmailByAddress(false);
  }

  async function handleApproveByEmail() {
    if (!approveEmailByAddress.trim()) return;
    setApprovingEmailByAddress(true);
    const result = await approveUserByEmailAction(approveEmailByAddress.trim());
    if (result.success) {
      toast.success("Usuário aprovado. A pessoa já pode acessar o app.");
      setApproveEmailByAddress("");
      loadData();
    } else {
      toast.error(result.error ?? "Erro ao aprovar.");
    }
    setApprovingEmailByAddress(false);
  }

  async function handleFixParish() {
    if (!fixEmail.trim() || !fixParishId || !fixMinistryId) return;
    setFixingParish(true);
    const result = await fixUserParishByEmailAction(fixEmail.trim(), fixParishId, fixMinistryId);
    if (result.success) {
      toast.success("Vínculo corrigido. A pessoa já pode ver ministérios e escalas.");
      setFixEmail("");
      setFixParishId("");
      setFixMinistryId("");
      loadData();
    } else {
      toast.error(result.error ?? "Erro ao corrigir.");
    }
    setFixingParish(false);
  }

  async function handleApproveMinistryRequest(userId: string, ministryId: string) {
    const result = await approveMinistryRequestAction(userId, ministryId);
    if (result.success) {
      toast.success("Candidatura aprovada.");
      loadData();
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  async function handleRemoveAccess(userId: string, ministryId: string) {
    if (!confirm("Remover acesso deste voluntário ao ministério?")) return;
    const result = await removeUserFromMinistryAction(userId, ministryId);
    if (result.success) {
      toast.success("Acesso removido.");
      loadData();
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  async function handleExcludeUser(userId: string, userName: string) {
    if (!confirm(`Excluir "${userName}" do sistema? O usuário não poderá mais acessar o app.`)) return;
    const result = await excludeUserAction(userId);
    if (result.success) {
      toast.success("Usuário excluído.");
      loadData();
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  const canManage = currentUserRole === "ADMIN_PARISH" || currentUserRole === "SUPER_ADMIN";
  const canApprovePending = canManage || currentUserRole === "COORDINATOR";

  if (currentUserRole === "VOLUNTEER") {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Redirecionando...</div>
      </div>
    );
  }

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

      {/* Confirmar email por endereço (SUPER_ADMIN) - quando o usuário não aparece na lista */}
      {currentUserRole === "SUPER_ADMIN" && (
        <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Confirmar email por endereço
          </h3>
          <p className="text-xs text-slate-600 mb-3">
            Use quando alguém se cadastrou mas o email de confirmação não chegou (ex.: usuário excluído que se recadastrou).
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={confirmEmailByAddress}
              onChange={(e) => setConfirmEmailByAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmEmailByAddress()}
              className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={handleConfirmEmailByAddress}
              disabled={!confirmEmailByAddress.trim() || confirmingEmailByAddress}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {confirmingEmailByAddress ? "Confirmando..." : "Confirmar email"}
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Aprovar por email
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Use quando a pessoa vê &quot;Conta não aprovada&quot; (email já confirmado, mas status pendente).
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={approveEmailByAddress}
                onChange={(e) => setApproveEmailByAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApproveByEmail()}
                className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={handleApproveByEmail}
                disabled={!approveEmailByAddress.trim() || approvingEmailByAddress}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
              {approvingEmailByAddress ? "Aprovando..." : "Aprovar"}
            </button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Corrigir vínculo paróquia/ministério
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Use quando o usuário não vê ministérios nem escalas (parish_id null no cadastro).
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={fixEmail}
                  onChange={(e) => setFixEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="min-w-[160px]">
                <label className="block text-xs text-slate-500 mb-1">Paróquia</label>
                <select
                  value={fixParishId}
                  onChange={(e) => setFixParishId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Selecione</option>
                  {fixParishes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[160px]">
                <label className="block text-xs text-slate-500 mb-1">Ministério</label>
                <select
                  value={fixMinistryId}
                  onChange={(e) => setFixMinistryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  disabled={!fixParishId}
                >
                  <option value="">Selecione</option>
                  {fixMinistries.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleFixParish}
                disabled={!fixEmail.trim() || !fixParishId || !fixMinistryId || fixingParish}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {fixingParish ? "Corrigindo..." : "Corrigir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pendentes */}
      {canApprovePending && pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              {pending.length}
            </span>
            Aguardando aprovação
          </h2>
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200 bg-amber-50/80">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wide">Ministério</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-amber-800 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {pending.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-amber-800">{p.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500 hidden md:table-cell">{p.email}</td>
                    <td className="px-5 py-4 text-gray-600">
                      {p.ministry_preference?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {approvingFor?.userId === p.id ? (
                          <select
                            className="text-xs border border-amber-300 rounded px-2 py-1.5 bg-white"
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) {
                                handleApprove(p.id, true, v);
                              }
                            }}
                            onBlur={() => setApprovingFor(null)}
                            autoFocus
                          >
                            <option value="">Aprovar como coordenador de...</option>
                            {ministries
                              .filter((m) => m.id === p.ministry_preference?.id || true)
                              .map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                          </select>
                        ) : (
                          <>
                            {currentUserRole === "SUPER_ADMIN" && (
                              <button
                                type="button"
                                onClick={() => handleConfirmEmail(p.id)}
                                disabled={confirmingEmailId === p.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                                title="Confirmar email (quando o email do Supabase não chegou)"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {confirmingEmailId === p.id ? "Confirmando..." : "Confirmar email"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleApprove(p.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                            >
                              Aprovar
                            </button>
                            {canManage && p.ministry_preference && (
                              <button
                                type="button"
                                onClick={() => setApprovingFor({ userId: p.id, userName: p.name })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                              >
                                Aprovar como coordenador
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReject(p.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidaturas a ministérios (voluntários já aprovados) */}
      {canApprovePending && pendingMinistryRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {pendingMinistryRequests.length}
            </span>
            Candidaturas a ministérios
          </h2>
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-200 bg-blue-50/80">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wide">Voluntário</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wide">Ministério</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-blue-800 uppercase tracking-wide">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {pendingMinistryRequests.map((r, i) => (
                  <tr key={`${r.user_id}-${r.ministry_id}-${i}`} className="hover:bg-blue-50/50 transition">
                    <td className="px-5 py-4 font-medium text-gray-900">{r.user_name}</td>
                    <td className="px-5 py-4 text-gray-500 hidden md:table-cell">{r.user_email}</td>
                    <td className="px-5 py-4 text-gray-600">{r.ministry_name}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleApproveMinistryRequest(r.user_id, r.ministry_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700"
                      >
                        Aprovar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Coordenador de / Ministérios
                </th>
                {currentUserRole === "SUPER_ADMIN" && (
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">
                    Ações
                  </th>
                )}
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
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {vol.coordinator_of?.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700"
                        >
                          {m.name}
                          {canManage && vol.id !== currentUserId && vol.role !== "SUPER_ADMIN" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCoordinator(vol.id, m.id)}
                              className="hover:bg-blue-100 rounded p-0.5"
                              aria-label={`Remover coordenador de ${m.name}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                      {canManage &&
                        vol.id !== currentUserId &&
                        vol.role !== "SUPER_ADMIN" &&
                        vol.role !== "ADMIN_PARISH" && (
                          addingFor?.userId === vol.id ? (
                            <select
                              className="text-xs border rounded px-2 py-1"
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v) {
                                  handleAddCoordinator(vol.id, v);
                                }
                              }}
                              onBlur={() => setAddingFor(null)}
                              autoFocus
                            >
                              <option value="">Selecione o ministério</option>
                              {ministries
                                .filter((m) => !vol.coordinator_of?.some((c) => c.id === m.id))
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAddingFor({ userId: vol.id, userName: vol.name })}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-gray-200"
                              title="Delegar como coordenador"
                            >
                              <Plus className="w-3 h-3" /> Coordenador
                            </button>
                          )
                        )}
                    </div>
                    {vol.ministries && vol.ministries.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {vol.ministries
                          .filter((m) => (m.status === "APPROVED" || !m.status) && !vol.coordinator_of?.some((c) => c.id === m.id))
                          .map((m) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700"
                            >
                              {m.name}
                              {currentUserRole === "COORDINATOR" &&
                                coordMinistries.some((c) => c.id === m.id) &&
                                vol.id !== currentUserId && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAccess(vol.id, m.id)}
                                    className="hover:bg-green-100 rounded p-0.5"
                                    aria-label={`Remover acesso a ${m.name}`}
                                    title="Remover acesso"
                                  >
                                    <UserMinus className="w-3 h-3" />
                                  </button>
                                )}
                            </span>
                          ))}
                      </div>
                    )}
                    {vol.ministry_preference && !vol.coordinator_of?.some((c) => c.id === vol.ministry_preference?.id) && !vol.ministries?.some((m) => m.id === vol.ministry_preference?.id) && (
                      <p className="text-xs text-gray-500 mt-1">
                        Candidatou-se a: {vol.ministry_preference.name}
                      </p>
                    )}
                  </td>
                  {currentUserRole === "SUPER_ADMIN" && (
                    <td className="px-5 py-4">
                      {vol.id !== currentUserId && vol.role !== "SUPER_ADMIN" && (
                        <button
                          type="button"
                          onClick={() => handleExcludeUser(vol.id, vol.name)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100"
                          title="Excluir do sistema"
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
