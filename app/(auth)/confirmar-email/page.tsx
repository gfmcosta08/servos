import Link from "next/link";
import { Mail } from "lucide-react";

export default function ConfirmarEmailPage() {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-2xl mb-5">
        <Mail className="w-8 h-8 text-primary-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Confirme seu e-mail
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-6">
        Enviamos um link de confirmação para o seu e-mail.
        <br />
        Clique no link para ativar sua conta e acessar o Servos.
      </p>

      <div className="bg-primary-50 rounded-xl px-5 py-4 text-sm text-primary-700 mb-6">
        <strong>Não encontrou o e-mail?</strong> Verifique também a pasta de
        spam ou lixo eletrônico.
      </div>

      <p className="text-sm text-gray-500">
        Já confirmou?{" "}
        <Link
          href="/login"
          className="text-primary-600 font-medium hover:underline"
        >
          Entrar na conta
        </Link>
      </p>
    </div>
  );
}
