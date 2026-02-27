"use client";

import { ChevronRight, Calendar, Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Ministry, Service } from "@/types/database";

interface ServiceListProps {
  ministry: Ministry;
  services: Service[];
  loading: boolean;
  canManage: boolean;
  showAddForm: boolean;
  onSelect: (service: Service) => void;
  onAddService: (e: React.FormEvent<HTMLFormElement>) => void;
  onDeleteService: (service: Service) => void;
  onToggleAddForm: () => void;
}

export function ServiceList({
  ministry,
  services,
  loading,
  canManage,
  showAddForm,
  onSelect,
  onAddService,
  onDeleteService,
  onToggleAddForm,
}: ServiceListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const emptyState = (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
      <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Nenhuma data criada para este ministério.</p>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-4">
      {canManage && (
        <div>
          {showAddForm ? (
            <form
              onSubmit={onAddService}
              className="bg-white rounded-xl border-2 border-primary-200 p-5 mb-4"
            >
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Nova data de serviço</h3>
              <input type="hidden" name="ministry_id" value={ministry.id} />
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
                  <input
                    name="date"
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Descrição (opcional)
                  </label>
                  <input
                    name="description"
                    type="text"
                    placeholder="Ex: Missa das 8h, Missa festiva..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onToggleAddForm}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-primary-700 transition"
                  >
                    Criar data
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              onClick={onToggleAddForm}
              className="flex items-center gap-2 border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500 rounded-xl p-4 w-full text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Adicionar data
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {services.length === 0 ? emptyState : services.map((service) => (
          <div key={service.id} className="group flex items-center gap-2">
            <button
              onClick={() => onSelect(service)}
              className="flex-1 bg-white rounded-xl border border-gray-100 px-5 py-4 text-left shadow-sm hover:shadow-md hover:border-primary-200 transition flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900 text-sm">{formatDate(service.date)}</p>
                {service.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{service.description}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
            </button>
            {canManage && (
              <button
                onClick={() => onDeleteService(service)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

