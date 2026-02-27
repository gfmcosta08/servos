"use client";

import { ChevronRight } from "lucide-react";
import { formatDate, formatDateShort } from "@/lib/utils";
import type { Ministry, Service } from "@/types/database";

interface EscalasBreadcrumbProps {
  selectedMinistry: Ministry | null;
  selectedService: Service | null;
  onReset: () => void;
  onBackToMinistry: () => void;
}

export function EscalasBreadcrumb({
  selectedMinistry,
  selectedService,
  onReset,
  onBackToMinistry,
}: EscalasBreadcrumbProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
        <button
          onClick={onReset}
          className={selectedMinistry ? "hover:text-primary-600 transition" : ""}
        >
          Escalas
        </button>
        {selectedMinistry && (
          <>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={onBackToMinistry}
              className={
                selectedService ? "hover:text-primary-600 transition" : "text-gray-700 font-medium"
              }
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
  );
}
