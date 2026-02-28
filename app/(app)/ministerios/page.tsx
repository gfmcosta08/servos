"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, BookOpen, Pencil, Trash2, Users2, UserPlus, Clock, ChevronRight } from "lucide-react";
import {
  getMinistriesAction,
  getMinistriesForVolunteerAction,
  deleteMinistryAction,
} from "@/lib/actions/ministries";
import { getCurrentUserAction } from "@/lib/actions/dashboard";
import { MinistryModal } from "@/components/ministerios/ministry-modal";
import toast from "react-hot-toast";
import type { Ministry } from "@/types/database";
import type { MinistryWithStatus } from "@/lib/actions/ministries";

function MinistryCard({
  ministry,
  canCreateMinistry,
  href,
  onEdit,
  onDelete,
}: {
  ministry: Ministry;
  canCreateMinistry: boolean;
  href?: string;
  onEdit: (m: Ministry) => void;
  onDelete: (m: Ministry) => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-primary-600" />
        </div>
        {canCreateMinistry ? (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(ministry); }}
              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(ministry); }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : href ? (
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
        ) : null}
      </div>
      <div className="mt-3">
        <h3 className="font-semibold text-gray-900">{ministry.name}</h3>
        {ministry.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {ministry.description}
          </p>
        )}
      </div>
    </>
  );

  const className = "bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group block text-left";
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

export default function MinistriosPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [volunteerData, setVolunteerData] = useState<{
    my: Ministry[];
    other: MinistryWithStatus[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | undefined>();
  const [canCreateMinistry, setCanCreateMinistry] = useState(false);
  const [isVolunteer, setIsVolunteer] = useState(false);

  const loadMinistries = useCallback(async () => {
    setLoading(true);
    const [result, volunteerResult, currentUser] = await Promise.all([
      getMinistriesAction(),
      getMinistriesForVolunteerAction(),
      getCurrentUserAction(),
    ]);
    if (result.success) {
      setMinistries(result.data ?? []);
    }
    if (volunteerResult.success && volunteerResult.data) {
      setVolunteerData(volunteerResult.data);
      setIsVolunteer(true);
    } else {
      setVolunteerData(null);
      setIsVolunteer(false);
    }
    setCanCreateMinistry(
      currentUser?.role !== undefined && currentUser.role !== "VOLUNTEER"
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMinistries();
  }, [loadMinistries]);

  async function handleDelete(ministry: Ministry) {
    if (
      !confirm(
        `Deseja excluir o ministério "${ministry.name}"? Todas as datas, horários e inscrições serão removidos.`
      )
    )
      return;

    const result = await deleteMinistryAction(ministry.id);
    if (result.success) {
      toast.success("Ministério excluído.");
      loadMinistries();
    } else {
      toast.error(result.error ?? "Erro ao excluir.");
    }
  }

  function handleEdit(ministry: Ministry) {
    setEditingMinistry(ministry);
    setShowModal(true);
  }

  function handleNew() {
    setEditingMinistry(undefined);
    setShowModal(true);
  }

  function handleModalClose() {
    setShowModal(false);
    setEditingMinistry(undefined);
  }

  function handleModalSuccess() {
    setShowModal(false);
    setEditingMinistry(undefined);
    loadMinistries();
  }

  const hasContent = isVolunteer && volunteerData
    ? volunteerData.my.length > 0 || volunteerData.other.length > 0
    : ministries.length > 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ministérios</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gerencie os ministérios da sua paróquia.
          </p>
        </div>
        {canCreateMinistry && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Criar ministério
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-6 h-32 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : !hasContent ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-1">
            Nenhum ministério ainda
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            {canCreateMinistry
              ? "Crie o primeiro ministério da sua paróquia."
              : "Nenhum ministério cadastrado ainda."}
          </p>
          {canCreateMinistry && (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Criar ministério
            </button>
          )}
        </div>
      ) : isVolunteer && volunteerData ? (
        <>
          {volunteerData.my.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Meus ministérios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {volunteerData.my.map((ministry) => (
                  <MinistryCard
                    key={ministry.id}
                    ministry={ministry}
                    canCreateMinistry={false}
                    href={`/ministerios/${ministry.id}`}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
          {volunteerData.other.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Outros ministérios</h2>
              <p className="text-sm text-gray-500 mb-4">
                Clique no ministério para ver detalhes e se candidatar. O coordenador precisará aprovar.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {volunteerData.other.map((m) => (
                  <Link
                    key={m.id}
                    href={`/ministerios/${m.id}`}
                    className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow block text-left group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-primary-600" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
                    </div>
                    <div className="mt-3">
                      <h3 className="font-semibold text-gray-900">{m.name}</h3>
                      {m.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {m.description}
                        </p>
                      )}
                      <div className="mt-4">
                        {m.userStatus === "pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-50 text-amber-700">
                            <Clock className="w-4 h-4" />
                            Aguardando aprovação
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600">
                            <UserPlus className="w-4 h-4" />
                            Candidatar-se
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ministries.map((ministry) => (
            <MinistryCard
              key={ministry.id}
              ministry={ministry}
              canCreateMinistry={canCreateMinistry}
              href={`/ministerios/${ministry.id}`}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <MinistryModal
          ministry={editingMinistry}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
