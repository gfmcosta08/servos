"use client";

import { useState } from "react";
import { Trash2, UserCheck, Users } from "lucide-react";
import { RegistrationToggle } from "./registration-toggle";
import { deleteTimeSlotAction } from "@/lib/actions/time-slots";
import { formatTimeRange } from "@/lib/utils";
import toast from "react-hot-toast";
import type { TimeSlotWithRegistrations, TimeSlotRoleWithDetails } from "@/types/database";

interface TimeSlotCardProps {
  slot: TimeSlotWithRegistrations;
  canManage: boolean;
  onDeleted: () => void;
  onRegistrationChange?: () => void;
}

export function TimeSlotCard({ slot, canManage, onDeleted, onRegistrationChange }: TimeSlotCardProps) {
  const timeSlotRoles = slot.time_slot_roles ?? [];
  const registrations = slot.registrations ?? [];
  const userRegisteredRoleIds = slot.user_registered_role_ids ?? [];

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

  function handleToggle(_roleId: string, _nowRegistered: boolean) {
    onRegistrationChange?.()
  }

  const fillPercent =
    slot.max_volunteers > 0
      ? Math.round((slot.current_volunteers / slot.max_volunteers) * 100)
      : 0;
  const isFull = slot.available_spots <= 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">
              {formatTimeRange(slot.start_time, slot.end_time)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {slot.current_volunteers}/{slot.max_volunteers} vagas
            </p>
          </div>
          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                fillPercent >= 100 ? "bg-red-400" : fillPercent >= 75 ? "bg-orange-400" : "bg-green-400"
              }`}
              style={{ width: `${Math.min(fillPercent, 100)}%` }}
            />
          </div>
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

      <div className="px-5 py-4 space-y-4">
        {timeSlotRoles.map((tsr: TimeSlotRoleWithDetails) => (
          <div
            key={tsr.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
          >
            <div>
              <p className="font-medium text-gray-800 text-sm">{tsr.ministry_role.name}</p>
              <p className="text-xs text-gray-500">
                {tsr.filled}/{tsr.quantity} vagas
              </p>
            </div>
            <RegistrationToggle
              timeSlotRoleId={tsr.id}
              roleName={tsr.ministry_role.name}
              isRegistered={userRegisteredRoleIds.includes(tsr.id)}
              isFull={tsr.available <= 0}
              onToggle={(v) => handleToggle(tsr.id, v)}
            />
          </div>
        ))}

        <div className="pt-2">
          <div className="flex items-center gap-2 mb-2">
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
                <div key={reg.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 bg-primary-50 rounded-full flex items-center justify-center shrink-0">
                      <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">
                        {reg.user?.name ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {reg.user?.email ?? ""}
                        {reg.ministry_role ? ` · ${reg.ministry_role.name}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
