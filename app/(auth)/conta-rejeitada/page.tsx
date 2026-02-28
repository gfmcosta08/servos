"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ContaRejeitadaPage() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 text-red-600 rounded-full mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta não aprovada</h2>
        <p className="text-gray-500 text-sm">
          Infelizmente sua solicitação de acesso não foi aprovada pela administração da paróquia.
        </p>
      </div>

      <p className="text-gray-600 text-sm text-center mb-6">
        Em caso de dúvidas, entre em contato com o administrador da paróquia.
      </p>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition text-sm"
        >
          Sair da conta
        </button>
        <Link
          href="/login"
          className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition text-sm"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
