"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  registerWithNewParishAction,
  registerJoinParishAction,
  getParishesAction,
  getMinistriesByParishAction,
} from "@/lib/actions/auth";
import { generateSlug, ESTADOS_BR } from "@/lib/utils";
import toast from "react-hot-toast";

type Option = "create" | "join";

interface ParishOption {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface MinistryOption {
  id: string;
  name: string;
}

export default function RegisterPage() {
  const [option, setOption] = useState<Option>("create");
  const [loading, setLoading] = useState(false);
  const [parishes, setParishes] = useState<ParishOption[]>([]);
  const [ministries, setMinistries] = useState<MinistryOption[]>([]);
  const [loadingMinistries, setLoadingMinistries] = useState(false);
  const [parishName, setParishName] = useState("");
  const [selectedParishId, setSelectedParishId] = useState("");

  useEffect(() => {
    if (option === "join") {
      getParishesAction().then((result) => {
        if (result.success && result.data) setParishes(result.data);
      });
    }
  }, [option]);

  useEffect(() => {
    if (option === "join" && selectedParishId) {
      setLoadingMinistries(true);
      getMinistriesByParishAction(selectedParishId).then((result) => {
        if (result.success && result.data) setMinistries(result.data ?? []);
        else setMinistries([]);
        setLoadingMinistries(false);
      });
    } else {
      setMinistries([]);
      setLoadingMinistries(false);
    }
  }, [option, selectedParishId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    let result;
    if (option === "create") {
      result = await registerWithNewParishAction(formData);
    } else {
      result = await registerJoinParishAction(formData);
    }

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Criar conta</h2>
      <p className="text-gray-500 text-sm mb-6">
        Cadastre-se e comece a gerenciar os voluntários da sua paróquia.
      </p>

      {/* Seletor de opção */}
      <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setOption("create")}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            option === "create"
              ? "bg-white text-primary-700 shadow"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Nova paróquia
        </button>
        <button
          type="button"
          onClick={() => setOption("join")}
          className={`py-2 rounded-lg text-sm font-medium transition ${
            option === "join"
              ? "bg-white text-primary-700 shadow"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Entrar em paróquia
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campos comuns */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seu nome completo
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="João da Silva"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>

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
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>

        {/* Campos de CRIAR paróquia */}
        {option === "create" && (
          <>
            <hr className="border-gray-200" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Dados da Paróquia
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da paróquia
              </label>
              <input
                name="parish_name"
                type="text"
                required
                value={parishName}
                onChange={(e) => setParishName(e.target.value)}
                placeholder="Paróquia Nossa Senhora de Fátima"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
              {parishName && (
                <p className="text-xs text-gray-400 mt-1">
                  Slug: {generateSlug(parishName)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  name="parish_city"
                  type="text"
                  required
                  placeholder="São Paulo"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  name="parish_state"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
                >
                  <option value="">UF</option>
                  {ESTADOS_BR.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Campos de ENTRAR em paróquia */}
        {option === "join" && (
          <>
            <hr className="border-gray-200" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecionar paróquia
              </label>
              {parishes.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">
                  Carregando paróquias...
                </p>
              ) : (
                <select
                  name="parish_id"
                  required
                  value={selectedParishId}
                  onChange={(e) => setSelectedParishId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
                >
                  <option value="">Selecione uma paróquia</option>
                  {parishes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.city}/{p.state}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {selectedParishId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ministérios aos quais deseja se candidatar
                </label>
                {loadingMinistries ? (
                  <p className="text-sm text-gray-400 py-2">Carregando ministérios...</p>
                ) : ministries.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">
                    Nenhum ministério cadastrado. O administrador pode adicionar você depois.
                  </p>
                ) : (
                  <div className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50 max-h-40 overflow-y-auto">
                    {ministries.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100/80 rounded px-2 py-1.5 -mx-2 -my-1.5"
                      >
                        <input
                          type="checkbox"
                          name="ministry_ids"
                          value={m.id}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{m.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition text-sm"
        >
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="text-primary-600 font-medium hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
