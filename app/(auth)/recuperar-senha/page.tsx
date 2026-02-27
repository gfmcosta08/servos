"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/lib/actions/auth";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function RecuperarSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await forgotPasswordAction(formData);

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          E-mail enviado!
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Se este e-mail estiver cadastrado, você receberá um link para
          redefinir sua senha em breve. Verifique também a pasta de spam.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-primary-600 font-medium hover:underline text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Recuperar senha
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="email"
              type="email"
              required
              placeholder="seu@email.com"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm"
        >
          {loading ? "Enviando..." : "Enviar link de recuperação"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-primary-600 font-medium hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
