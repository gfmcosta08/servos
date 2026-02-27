"use client";

import { TimeSlotCard } from "@/components/escalas/time-slot-card";
import { AddTimeSlotForm } from "@/components/escalas/add-time-slot-form";
import type { Service, ServiceWithTimeSlots } from "@/types/database";

interface TimeSlotsViewProps {
  service: Service;
  serviceDetail: ServiceWithTimeSlots | null;
  loading: boolean;
  canManage: boolean;
  onRefresh: () => void;
}

export function TimeSlotsView({
  service,
  serviceDetail,
  loading,
  canManage,
  onRefresh,
}: TimeSlotsViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-white rounded-xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!serviceDetail?.time_slots.length && !canManage) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <p className="text-gray-500 text-sm">Nenhum horário criado para esta data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {serviceDetail?.time_slots.map((slot) => (
        <TimeSlotCard
          key={slot.id}
          slot={slot}
          canManage={canManage}
          onDeleted={onRefresh}
          onRegistrationChange={onRefresh}
        />
      ))}

      {canManage && (
        <AddTimeSlotForm
          serviceId={service.id}
          ministryId={service.ministry_id}
          onCreated={onRefresh}
        />
      )}

      {!loading && !serviceDetail?.time_slots.length && canManage && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-500 text-sm">Nenhum horário criado para esta data.</p>
        </div>
      )}
    </div>
  );
}
