import Link from "next/link";
import { MapPin } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-2xl mb-5">
          <MapPin className="w-7 h-7 text-primary-400" />
        </div>
        <p className="text-5xl font-black text-gray-200 mb-3">404</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Página não encontrada
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          A página que você está procurando não existe ou foi removida.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
