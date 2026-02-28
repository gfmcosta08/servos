"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AguardandoAprovacaoPage() {
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
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 text-amber-600 rounded-full mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Aguardando aprovação</h2>
        <p className="text-gray-500 text-sm">
          Sua conta foi enviada para análise. O administrador da paróquia irá revisar e aprovar em breve.
        </p>
      </div>

      <p className="text-gray-600 text-sm text-center mb-6">
        Você receberá acesso ao sistema assim que sua solicitação for aprovada.
      </p>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition text-sm"
      >
        Sair da conta
      </button>
    </div>
  );
}
