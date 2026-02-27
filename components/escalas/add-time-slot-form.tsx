"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createTimeSlotAction } from "@/lib/actions/services";
import toast from "react-hot-toast";

interface AddTimeSlotFormProps {
  serviceId: string;
  onCreated: () => void;
}

export function AddTimeSlotForm({ serviceId, onCreated }: AddTimeSlotFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createTimeSlotAction(formData);

    if (result.success) {
      toast.success("Horário criado!");
      setOpen(false);
      onCreated();
    } else {
      toast.error(result.error ?? "Erro ao criar horário.");
    }

    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500 rounded-xl p-4 w-full text-sm font-medium transition"
      >
        <Plus className="w-4 h-4" />
        Adicionar horário
      </button>
    );
  }

  return (
    <div className="bg-white border-2 border-primary-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800 text-sm">Novo horário</h4>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="hidden" name="service_id" value={serviceId} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Início *
            </label>
            <input
              name="start_time"
              type="time"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fim *
            </label>
            <input
              name="end_time"
              type="time"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Máx. de voluntários *
          </label>
          <input
            name="max_volunteers"
            type="number"
            min={1}
            max={100}
            defaultValue={5}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition"
        >
          {loading ? "Criando..." : "Criar horário"}
        </button>
      </form>
    </div>
  );
}
