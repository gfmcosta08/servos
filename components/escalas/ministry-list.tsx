"use client";

import { ChevronRight, CalendarDays } from "lucide-react";
import type { Ministry } from "@/types/database";

interface MinistryListProps {
  ministries: Ministry[];
  loading: boolean;
  onSelect: (ministry: Ministry) => void;
}

export function MinistryList({ ministries, loading, onSelect }: MinistryListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (ministries.length === 0) {
    return (
      <div className="text-center py-20">
        <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Crie ministérios primeiro para gerenciar as escalas.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ministries.map((ministry) => (
        <button
          key={ministry.id}
          onClick={() => onSelect(ministry)}
          className="bg-white rounded-xl border border-gray-100 p-6 text-left shadow-sm hover:shadow-md hover:border-primary-200 transition group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{ministry.name}</h3>
              {ministry.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-1">{ministry.description}</p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition" />
          </div>
        </button>
      ))}
    </div>
  );
}
