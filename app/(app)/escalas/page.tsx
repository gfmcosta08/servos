"use client";

import { useEscalas } from "@/hooks/use-escalas";
import { EscalasBreadcrumb } from "@/components/escalas/escalas-breadcrumb";
import { MinistryList } from "@/components/escalas/ministry-list";
import { ServiceList } from "@/components/escalas/service-list";
import { TimeSlotsView } from "@/components/escalas/time-slots-view";

export default function EscalasPage() {
  const {
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
    handleSelectMinistry,
    handleSelectService,
    handleAddService,
    handleDeleteService,
    handleReset,
    handleBackToMinistry,
    loadServiceDetail,
  } = useEscalas();

  return (
    <div className="p-8">
      <EscalasBreadcrumb
        selectedMinistry={selectedMinistry}
        selectedService={selectedService}
        onReset={handleReset}
        onBackToMinistry={handleBackToMinistry}
      />

      {!selectedMinistry && (
        <MinistryList
          ministries={ministries}
          loading={loading}
          onSelect={handleSelectMinistry}
        />
      )}

      {selectedMinistry && !selectedService && (
        <ServiceList
          ministry={selectedMinistry}
          services={services}
          loading={loadingServices}
          canManage={canManage}
          showAddForm={showAddService}
          onSelect={handleSelectService}
          onAddService={handleAddService}
          onDeleteService={handleDeleteService}
          onToggleAddForm={() => setShowAddService((v) => !v)}
        />
      )}

      {selectedService && (
        <TimeSlotsView
          service={selectedService}
          serviceDetail={serviceDetail}
          loading={loadingDetail}
          canManage={canManage}
          onRefresh={() => loadServiceDetail(selectedService)}
        />
      )}
    </div>
  );
}
