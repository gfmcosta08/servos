"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, Calendar, Plus, Trash2, CalendarDays } from "lucide-react";
import {
  getMinistriesAction,
} from "@/lib/actions/ministries";
import {
  getServicesByMinistryAction,
  createServiceAction,
  deleteServiceAction,
  getServiceWithTimeSlotsAction,
} from "@/lib/actions/services";
import { TimeSlotCard } from "@/components/escalas/time-slot-card";
import { AddTimeSlotForm } from "@/components/escalas/add-time-slot-form";
import { formatDate, formatDateShort } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Ministry, Service, ServiceWithTimeSlots } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

export default function EscalasPage() {
  // Estado de navegação hierárquica
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceDetail, setServiceDetail] = useState<ServiceWithTimeSlots | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [canManage, setCanManage] = useState(false);

  // Carregar ministérios ao montar
  useEffect(() => {
    async function init() {
      setLoading(true);
      const result = await getMinistriesAction();
      if (result.success) setMinistries(result.data ?? []);

      // Verificar role do usuário
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rawData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = rawData as any;
        if (data?.role && ["ADMIN_PARISH", "COORDINATOR", "SUPER_ADMIN"].includes(data.role)) {
          setCanManage(true);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  // Carregar serviços ao selecionar ministério
  const loadServices = useCallback(async (ministry: Ministry) => {
    setLoadingServices(true);
    setServices([]);
    setSelectedService(null);
    setServiceDetail(null);
    const result = await getServicesByMinistryAction(ministry.id);
    if (result.success) setServices(result.data ?? []);
    setLoadingServices(false);
  }, []);

  // Carregar detalhe do serviço
  const loadServiceDetail = useCallback(async (service: Service) => {
    setLoadingDetail(true);
    setServiceDetail(null);
    const result = await getServiceWithTimeSlotsAction(service.id);
    if (result.success) setServiceDetail(result.data ?? null);
    setLoadingDetail(false);
  }, []);

  function handleSelectMinistry(ministry: Ministry) {
    setSelectedMinistry(ministry);
    loadServices(ministry);
  }

  function handleSelectService(service: Service) {
    setSelectedService(service);
    loadServiceDetail(service);
  }

  async function handleAddService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await createServiceAction(formData);
    if (result.success) {
      toast.success("Data criada!");
      setShowAddService(false);
      if (selectedMinistry) loadServices(selectedMinistry);
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  async function handleDeleteService(service: Service) {
    if (!confirm(`Excluir a data ${formatDateShort(service.date)}?`)) return;
    const result = await deleteServiceAction(service.id);
    if (result.success) {
      toast.success("Data excluída.");
      setSelectedService(null);
      setServiceDetail(null);
      if (selectedMinistry) loadServices(selectedMinistry);
    } else {
      toast.error(result.error ?? "Erro.");
    }
  }

  return (
    <div className="p-8">
      {/* Header com breadcrumb */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <button
            onClick={() => {
              setSelectedMinistry(null);
              setSelectedService(null);
              setServiceDetail(null);
            }}
            className={selectedMinistry ? "hover:text-primary-600 transition" : ""}
          >
            Escalas
          </button>
          {selectedMinistry && (
            <>
              <ChevronRight className="w-4 h-4" />
              <button
                onClick={() => {
                  setSelectedService(null);
                  setServiceDetail(null);
                }}
                className={selectedService ? "hover:text-primary-600 transition" : "text-gray-700 font-medium"}
              >
                {selectedMinistry.name}
              </button>
            </>
          )}
          {selectedService && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-700 font-medium">
                {formatDateShort(selectedService.date)}
              </span>
            </>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {!selectedMinistry && "Escalas"}
          {selectedMinistry && !selectedService && selectedMinistry.name}
          {selectedService && formatDate(selectedService.date)}
        </h1>
      </div>

      {/* NÍVEL 1: Seleção de Ministério */}
      {!selectedMinistry && (
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : ministries.length === 0 ? (
            <div className="text-center py-20">
              <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Crie ministérios primeiro para gerenciar as escalas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ministries.map((ministry) => (
                <button
                  key={ministry.id}
                  onClick={() => handleSelectMinistry(ministry)}
                  className="bg-white rounded-xl border border-gray-100 p-6 text-left shadow-sm hover:shadow-md hover:border-primary-200 transition group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{ministry.name}</h3>
                      {ministry.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                          {ministry.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* NÍVEL 2: Seleção de Data */}
      {selectedMinistry && !selectedService && (
        <div className="max-w-2xl">
          {/* Botão adicionar data */}
          {canManage && (
            <div className="mb-4">
              {showAddService ? (
                <form onSubmit={handleAddService} className="bg-white rounded-xl border-2 border-primary-200 p-5 mb-4">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">Nova data de serviço</h3>
                  <input type="hidden" name="ministry_id" value={selectedMinistry.id} />
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
                      <label className="block text-xs font-medium text-gray-600 mb-1">Descrição (opcional)</label>
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
                        onClick={() => setShowAddService(false)}
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
                  onClick={() => setShowAddService(true)}
                  className="flex items-center gap-2 border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500 rounded-xl p-4 w-full text-sm font-medium transition"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar data
                </button>
              )}
            </div>
          )}

          {loadingServices ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                Nenhuma data criada para este ministério.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {services.map((service) => (
                <div key={service.id} className="group flex items-center gap-2">
                  <button
                    onClick={() => handleSelectService(service)}
                    className="flex-1 bg-white rounded-xl border border-gray-100 px-5 py-4 text-left shadow-sm hover:shadow-md hover:border-primary-200 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {formatDate(service.date)}
                      </p>
                      {service.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{service.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
                  </button>
                  {canManage && (
                    <button
                      onClick={() => handleDeleteService(service)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NÍVEL 3: Horários + Inscrições */}
      {selectedService && (
        <div>
          {loadingDetail ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-white rounded-xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {serviceDetail?.time_slots.map((slot) => (
                <TimeSlotCard
                  key={slot.id}
                  slot={slot}
                  canManage={canManage}
                  onDeleted={() => loadServiceDetail(selectedService)}
                />
              ))}

              {canManage && (
                <AddTimeSlotForm
                  serviceId={selectedService.id}
                  onCreated={() => loadServiceDetail(selectedService)}
                />
              )}

              {!loadingDetail &&
                !serviceDetail?.time_slots.length &&
                !canManage && (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                    <p className="text-gray-500 text-sm">
                      Nenhum horário criado para esta data.
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
