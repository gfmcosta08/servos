"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  UserPlus,
  Clock,
  Plus,
  Trash2,
  MessageSquare,
} from "lucide-react";
import {
  getMinistryDetailAction,
  getMinistryAnnouncementsAction,
  requestMinistryAccessAction,
} from "@/lib/actions/ministries";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "@/lib/actions/announcements";
import toast from "react-hot-toast";
import type { MinistryAnnouncement } from "@/types/database";
import { formatDateTime } from "@/lib/utils";

export default function MinistryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ministryId = params.id as string;

  const [ministry, setMinistry] = useState<{ name: string; description: string | null } | null>(null);
  const [userStatus, setUserStatus] = useState<"approved" | "pending" | "none">("none");
  const [canManage, setCanManage] = useState(false);
  const [announcements, setAnnouncements] = useState<MinistryAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const loadData = useCallback(async () => {
    if (!ministryId) return;
    setLoading(true);
    const [detailResult, announcementsResult] = await Promise.all([
      getMinistryDetailAction(ministryId),
      getMinistryAnnouncementsAction(ministryId),
    ]);
    if (detailResult.success && detailResult.data) {
      setMinistry(detailResult.data.ministry);
      setUserStatus(detailResult.data.userStatus);
      setCanManage(detailResult.data.canManage);
    } else {
      toast.error(detailResult.error ?? "Ministério não encontrado.");
      router.push("/ministerios");
      return;
    }
    if (announcementsResult.success) {
      setAnnouncements(announcementsResult.data ?? []);
    }
    setLoading(false);
  }, [ministryId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRequestAccess() {
    setRequesting(true);
    const result = await requestMinistryAccessAction(ministryId);
    if (result.success) {
      toast.success("Solicitação enviada. Aguarde aprovação do coordenador.");
      loadData();
    } else {
      toast.error(result.error ?? "Erro ao enviar solicitação.");
    }
    setRequesting(false);
  }

  async function handleAddAnnouncement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await createAnnouncementAction(ministryId, formData);
    if (result.success) {
      toast.success("Recado criado.");
      setShowAddForm(false);
      loadData();
    } else {
      toast.error(result.error ?? "Erro ao criar recado.");
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!confirm("Excluir este recado?")) return;
    const result = await deleteAnnouncementAction(id);
    if (result.success) {
      toast.success("Recado excluído.");
      loadData();
    } else {
      toast.error(result.error ?? "Erro ao excluir.");
    }
  }

  if (loading || !ministry) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-full max-w-md" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link
        href="/ministerios"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar aos ministérios
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">{ministry.name}</h1>
            {ministry.description && (
              <p className="text-gray-500 mt-1">{ministry.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {userStatus === "approved" && (
                <Link
                  href={`/escalas?ministry=${ministryId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                >
                  <CalendarDays className="w-4 h-4" />
                  Ver escalas
                </Link>
              )}
              {userStatus === "pending" && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700">
                  <Clock className="w-4 h-4" />
                  Aguardando aprovação do coordenador
                </span>
              )}
              {userStatus === "none" && (
                <button
                  type="button"
                  onClick={handleRequestAccess}
                  disabled={requesting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  {requesting ? "Enviando..." : "Candidatar-se"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recados - visível para quem participa ou pode gerenciar */}
      {(userStatus === "approved" || canManage) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              Recados
            </h2>
            {canManage && (
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                {showAddForm ? "Cancelar" : "Novo recado"}
              </button>
            )}
          </div>

          {canManage && showAddForm && (
            <form
              onSubmit={handleAddAnnouncement}
              className="p-6 border-b border-gray-50"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
                  <input
                    name="title"
                    type="text"
                    required
                    placeholder="Ex: Reunião na quinta-feira"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Conteúdo *</label>
                  <textarea
                    name="content"
                    required
                    rows={3}
                    placeholder="Escreva o recado..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition"
                >
                  Publicar recado
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-gray-50">
            {announcements.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500 text-sm">
                Nenhum recado ainda.
              </div>
            ) : (
              announcements.map((a) => (
                <div
                  key={a.id}
                  className="px-6 py-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">{a.title}</h3>
                    <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{a.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDateTime(a.created_at)}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(a.id)}
                      className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                      title="Excluir recado"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
