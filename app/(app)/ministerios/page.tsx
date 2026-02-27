"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, BookOpen, Pencil, Trash2, Users2 } from "lucide-react";
import {
  getMinistriesAction,
  deleteMinistryAction,
} from "@/lib/actions/ministries";
import { MinistryModal } from "@/components/ministerios/ministry-modal";
import toast from "react-hot-toast";
import type { Ministry } from "@/types/database";

export default function MinistriosPage() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | undefined>();

  const loadMinistries = useCallback(async () => {
    setLoading(true);
    const result = await getMinistriesAction();
    if (result.success) {
      setMinistries(result.data ?? []);
    }
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
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Criar ministério
        </button>
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
      ) : ministries.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-700 mb-1">
            Nenhum ministério ainda
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Crie o primeiro ministério da sua paróquia.
          </p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Criar ministério
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ministries.map((ministry) => (
            <div
              key={ministry.id}
              className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(ministry)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ministry)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-gray-900">{ministry.name}</h3>
                {ministry.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {ministry.description}
                  </p>
                )}
              </div>
            </div>
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
