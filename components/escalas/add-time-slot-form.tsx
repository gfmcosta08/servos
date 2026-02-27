"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { createTimeSlotAction } from "@/lib/actions/time-slots";
import { getMinistryRolesAction } from "@/lib/actions/ministries";
import toast from "react-hot-toast";
import type { MinistryRole } from "@/types/database";

interface AddTimeSlotFormProps {
  serviceId: string;
  ministryId: string;
  onCreated: () => void;
}

export function AddTimeSlotForm({
  serviceId,
  ministryId,
  onCreated,
}: AddTimeSlotFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<MinistryRole[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    getMinistryRolesAction(ministryId).then((r) => {
      if (r.success) {
        setRoles(r.data ?? []);
        setQuantities(
          Object.fromEntries((r.data ?? []).map((role) => [role.id, 1]))
        );
      }
    });
  }, [ministryId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const startTime = (e.currentTarget.elements.namedItem("start_time") as HTMLInputElement)
      .value;
    const endTime = (e.currentTarget.elements.namedItem("end_time") as HTMLInputElement)
      .value;

    const rolesData = roles
      .filter((r) => (quantities[r.id] ?? 0) > 0)
      .map((r) => ({
        ministry_role_id: r.id,
        quantity: quantities[r.id] ?? 1,
      }));

    const formData = new FormData();
    formData.set("service_id", serviceId);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("roles", JSON.stringify(rolesData));

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

  function setQuantity(roleId: string, delta: number) {
    setQuantities((prev) => {
      const current = prev[roleId] ?? 1;
      const next = Math.max(0, Math.min(100, current + delta));
      return { ...prev, [roleId]: next };
    });
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
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Vagas por função
          </label>
          {roles.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">
              Adicione funções no ministério primeiro (editar ministério).
            </p>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-800">{role.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(role.id, -1)}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {quantities[role.id] ?? 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(role.id, 1)}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || roles.length === 0}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-lg transition"
        >
          {loading ? "Criando..." : "Criar horário"}
        </button>
      </form>
    </div>
  );
}
