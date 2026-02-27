export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-48 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-64 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 h-28" />
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 h-64" />
    </div>
  );
}
