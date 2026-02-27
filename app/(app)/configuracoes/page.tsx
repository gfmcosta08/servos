import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Building2, MapPin } from "lucide-react";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawUser } = await supabase
    .from("users")
    .select("*, parishes(*)")
    .eq("id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData = rawUser as any;
  const parish = userData?.parishes;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 mt-1 text-sm">Informações da sua paróquia e conta.</p>
      </div>

      {/* Paróquia */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-gray-900">Paróquia</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Nome
            </label>
            <p className="text-gray-900 font-medium">{parish?.name ?? "—"}</p>
          </div>
          <div className="flex gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Cidade
              </label>
              <p className="text-gray-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {parish?.city ?? "—"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Estado
              </label>
              <p className="text-gray-700">{parish?.state ?? "—"}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Slug (identificador único)
            </label>
            <code className="text-sm bg-gray-50 px-2 py-1 rounded text-gray-600">
              {parish?.slug ?? "—"}
            </code>
          </div>
        </div>
      </div>

      {/* Conta */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Minha conta</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Nome
            </label>
            <p className="text-gray-900 font-medium">{userData?.name}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Email
            </label>
            <p className="text-gray-700">{userData?.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Cargo
            </label>
            <p className="text-gray-700">{userData?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
