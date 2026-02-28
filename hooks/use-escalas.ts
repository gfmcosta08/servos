"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getMinistriesAction } from "@/lib/actions/ministries";
import {
  getServicesByMinistryAction,
  createServiceAction,
  deleteServiceAction,
  getServiceWithTimeSlotsAction,
  canManageMinistryScalesAction,
} from "@/lib/actions/services";
import { formatDateShort } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Ministry, Service, ServiceWithTimeSlots } from "@/types/database";

// Apenas SUPER_ADMIN ou coordenador do ministério (ministry_coordinators) pode gerenciar escalas

export function useEscalas() {
  const searchParams = useSearchParams()
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

  useEffect(() => {
    async function init() {
      setLoading(true);
      const result = await getMinistriesAction();
      const data = result.success ? result.data ?? [] : []
      setMinistries(data)
      const ministryId = searchParams.get('ministry')
      if (ministryId && data.length > 0) {
        const ministry = data.find((m) => m.id === ministryId)
        if (ministry) {
          setSelectedMinistry(ministry)
          setLoadingServices(true)
          const [servicesResult, canManageResult] = await Promise.all([
            getServicesByMinistryAction(ministry.id),
            canManageMinistryScalesAction(ministry.id),
          ])
          if (servicesResult.success) setServices(servicesResult.data ?? [])
          setCanManage(canManageResult)
          const serviceId = searchParams.get('service')
          if (serviceId && servicesResult.success && servicesResult.data) {
            const service = servicesResult.data.find((s) => s.id === serviceId)
            if (service) {
              setSelectedService(service)
              setLoadingDetail(true)
              const detailResult = await getServiceWithTimeSlotsAction(service.id)
              if (detailResult.success) setServiceDetail(detailResult.data ?? null)
              setLoadingDetail(false)
            }
          }
          setLoadingServices(false)
        }
      }
      setLoading(false);
    }
    init();
  }, [searchParams]);

  const loadServices = useCallback(async (ministry: Ministry) => {
    setLoadingServices(true);
    setServices([]);
    setSelectedService(null);
    setServiceDetail(null);
    const [servicesResult, canManageResult] = await Promise.all([
      getServicesByMinistryAction(ministry.id),
      canManageMinistryScalesAction(ministry.id),
    ]);
    if (servicesResult.success) setServices(servicesResult.data ?? []);
    setCanManage(canManageResult);
    setLoadingServices(false);
  }, []);

  const loadServiceDetail = useCallback(async (service: Service) => {
    setLoadingDetail(true);
    setServiceDetail(null);
    const result = await getServiceWithTimeSlotsAction(service.id);
    if (result.success) setServiceDetail(result.data ?? null);
    setLoadingDetail(false);
  }, []);

  const handleSelectMinistry = useCallback(
    (ministry: Ministry) => {
      setSelectedMinistry(ministry);
      loadServices(ministry);
    },
    [loadServices]
  );

  const handleSelectService = useCallback(
    (service: Service) => {
      setSelectedService(service);
      loadServiceDetail(service);
    },
    [loadServiceDetail]
  );

  const handleAddService = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
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
    },
    [selectedMinistry, loadServices]
  );

  const handleDeleteService = useCallback(
    async (service: Service) => {
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
    },
    [selectedMinistry, loadServices]
  );

  const handleReset = useCallback(() => {
    setSelectedMinistry(null);
    setSelectedService(null);
    setServiceDetail(null);
    setCanManage(false);
  }, []);

  const handleBackToMinistry = useCallback(() => {
    setSelectedService(null);
    setServiceDetail(null);
  }, []);

  return {
    ministries,
    selectedMinistry,
    services,
    selectedService,
    serviceDetail,
    loading,
    loadingServices,
    loadingDetail,
    showAddService,
    setShowAddService,
    canManage,
    loadServices,
    loadServiceDetail,
    handleSelectMinistry,
    handleSelectService,
    handleAddService,
    handleDeleteService,
    handleReset,
    handleBackToMinistry,
  };
}
