"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { createMinistryAction, updateMinistryAction } from "@/lib/actions/ministries";
import toast from "react-hot-toast";
import type { Ministry } from "@/types/database";

interface MinistryModalProps {
  ministry?: Ministry;
  onClose: () => void;
  onSuccess: () => void;
}

export function MinistryModal({ ministry, onClose, onSuccess }: MinistryModalProps) {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = ministry
      ? await updateMinistryAction(ministry.id, formData)
      : await createMinistryAction(formData);

    if (result.success) {
      toast.success(ministry ? "Ministério atualizado!" : "Ministério criado!");
      onSuccess();
    } else {
      toast.error(result.error ?? "Erro ao salvar.");
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {ministry ? "Editar ministério" : "Novo ministério"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do ministério *
            </label>
            <input
              name="name"
              type="text"
              required
              defaultValue={ministry?.name}
              placeholder="Ex: Leitores, Coro, Coral..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={ministry?.description ?? ""}
              placeholder="Descreva brevemente o ministério..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              {loading ? "Salvando..." : ministry ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
