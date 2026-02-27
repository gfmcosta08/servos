"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";
import toast from "react-hot-toast";

// Separado em componente próprio pois useSearchParams exige Suspense boundary
function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "token_invalido") {
      toast.error("Link inválido ou expirado. Solicite um novo.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result?.error) {
      toast.error(result.error);
    }

    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Entrar</h2>
      <p className="text-gray-500 text-sm mb-6">
        Acesse sua conta para gerenciar os voluntários.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="seu@email.com"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <input
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/recuperar-senha"
            className="text-xs text-primary-600 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Não tem conta?{" "}
        <Link
          href="/register"
          className="text-primary-600 font-medium hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
