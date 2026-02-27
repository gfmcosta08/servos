"use client";

import { useState } from "react";
import { Trash2, UserCheck, Users } from "lucide-react";
import { RegistrationToggle } from "./registration-toggle";
import { deleteTimeSlotAction } from "@/lib/actions/services";
import { formatTimeRange } from "@/lib/utils";
import toast from "react-hot-toast";
import type { TimeSlotWithRegistrations } from "@/types/database";

interface TimeSlotCardProps {
  slot: TimeSlotWithRegistrations;
  canManage: boolean;
  onDeleted: () => void;
}

export function TimeSlotCard({ slot, canManage, onDeleted }: TimeSlotCardProps) {
  const [registrations, setRegistrations] = useState(slot.registrations);
  // Contador separado para atualização otimista imediata após toggle
  const [registrationCount, setRegistrationCount] = useState(slot.registrations.length);
  const [isRegistered, setIsRegistered] = useState(slot.is_registered ?? false);
  const isFull = registrationCount >= slot.max_volunteers;

  async function handleDelete() {
    if (!confirm("Excluir este horário?")) return;
    const result = await deleteTimeSlotAction(slot.id);
    if (result.success) {
      toast.success("Horário excluído.");
      onDeleted();
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  function handleToggle(nowRegistered: boolean) {
    setIsRegistered(nowRegistered);
    // Atualização otimista: incrementa/decrementa o contador imediatamente
    setRegistrationCount((prev) => (nowRegistered ? prev + 1 : prev - 1));
  }

  const fillPercent = Math.round((registrationCount / slot.max_volunteers) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header do horário */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">
              {formatTimeRange(slot.start_time, slot.end_time)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {registrationCount}/{slot.max_volunteers} vagas
            </p>
          </div>

          {/* Barra de preenchimento */}
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  fillPercent >= 100
                    ? "bg-red-400"
                    : fillPercent >= 75
                    ? "bg-orange-400"
                    : "bg-green-400"
                }`}
                style={{ width: `${Math.min(fillPercent, 100)}%` }}
              />
            </div>
            {isFull && (
              <span className="text-xs font-medium text-red-500">Lotado</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle de inscrição */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:block">
              {isRegistered ? "Inscrito" : isFull ? "Lotado" : "Inscrever"}
            </span>
            <RegistrationToggle
              timeSlotId={slot.id}
              isRegistered={isRegistered}
              isFull={isFull}
              onToggle={handleToggle}
            />
          </div>

          {canManage && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              title="Excluir horário"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lista de inscritos */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Inscritos
          </span>
        </div>

        {registrations.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhum inscrito ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {registrations.map((reg) => (
              <div key={reg.id} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary-50 rounded-full flex items-center justify-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">
                    {reg.user?.name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {reg.user?.email ?? ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
