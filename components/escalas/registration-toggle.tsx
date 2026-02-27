"use client";

import { useState } from "react";
import {
  registerVolunteerAction,
  unregisterVolunteerAction,
} from "@/lib/actions/registrations";
import toast from "react-hot-toast";

interface RegistrationToggleProps {
  timeSlotRoleId: string;
  roleName: string;
  isRegistered: boolean;
  isFull: boolean;
  onToggle: (registered: boolean) => void;
}

export function RegistrationToggle({
  timeSlotRoleId,
  roleName,
  isRegistered,
  isFull,
  onToggle,
}: RegistrationToggleProps) {
  const [loading, setLoading] = useState(false);
  const disabled = loading || (isFull && !isRegistered);

  async function handleToggle() {
    if (disabled) return;
    setLoading(true);

    const result = isRegistered
      ? await unregisterVolunteerAction(timeSlotRoleId)
      : await registerVolunteerAction(timeSlotRoleId);

    if (result.success) {
      onToggle(!isRegistered);
      toast.success(
        isRegistered ? "Inscrição cancelada." : `Inscrito como ${roleName}!`
      );
    } else {
      toast.error(result.error ?? "Erro na operação.");
    }

    setLoading(false);
  }

  return (
    <label
      className={`toggle-switch ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      title={
        isFull && !isRegistered
          ? "Horário lotado"
          : isRegistered
          ? "Cancelar inscrição"
          : "Inscrever-se"
      }
    >
      <input
        type="checkbox"
        checked={isRegistered}
        onChange={handleToggle}
        disabled={disabled}
        className="sr-only"
      />
      <div
        className={`w-11 h-6 rounded-full transition-colors duration-200 ${
          isRegistered ? "bg-primary-600" : "bg-gray-200"
        } ${loading ? "animate-pulse" : ""}`}
      />
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          isRegistered ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </label>
  );
}
