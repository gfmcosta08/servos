"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mb-5">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        Erro ao carregar a página
      </h2>
      <p className="text-gray-500 text-sm mb-6 max-w-sm">
        Não foi possível carregar o conteúdo. Verifique sua conexão e tente
        novamente.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
