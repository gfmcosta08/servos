import { Users, BookOpen, CalendarDays, Clock } from "lucide-react";
import {
  getDashboardStatsAction,
  getUpcomingServicesAction,
  getCurrentUserAction,
} from "@/lib/actions/dashboard";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const [statsResult, servicesResult, currentUser] = await Promise.all([
    getDashboardStatsAction(),
    getUpcomingServicesAction(),
    getCurrentUserAction(),
  ]);

  const stats = statsResult.data;
  const upcomingServices = servicesResult.data ?? [];

  const parishName = currentUser?.parishes?.name ?? "sua paróquia";
  const firstName = currentUser?.name?.split(" ")[0] ?? "Bem-vindo";

  const statCards = [
    {
      label: "Voluntários",
      value: stats?.total_volunteers ?? 0,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Ministérios",
      value: stats?.total_ministries ?? 0,
      icon: BookOpen,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Próximos serviços",
      value: stats?.upcoming_services ?? 0,
      icon: CalendarDays,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Horários com vagas",
      value: stats?.open_slots ?? 0,
      icon: Clock,
      color: "bg-orange-50 text-orange-600",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Visão geral da <span className="font-medium text-gray-700">{parishName}</span>
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Próximos serviços */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Próximos Serviços</h2>
        </div>

        {upcomingServices.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              Nenhum serviço agendado. Vá em{" "}
              <strong>Escalas</strong> para criar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcomingServices.map((service) => {
              const percent =
                service.total_slots > 0
                  ? Math.round(
                      (service.filled_slots / service.total_slots) * 100
                    )
                  : 0;

              return (
                <div
                  key={service.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {service.ministry_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(service.date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-600">
                      {service.filled_slots}/{service.total_slots} vagas
                    </p>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
