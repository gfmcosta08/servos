"use client";

import { useState } from "react";
import { resetPasswordAction } from "@/lib/actions/auth";
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";

export default function NovaSenhaPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await resetPasswordAction(formData);

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    }
    // Sucesso: redirect acontece dentro da server action
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Nova senha</h2>
          <p className="text-gray-500 text-xs">Escolha uma senha segura</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nova senha
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar nova senha
          </label>
          <input
            name="confirm_password"
            type="password"
            required
            minLength={6}
            placeholder="Repita a senha"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm"
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
