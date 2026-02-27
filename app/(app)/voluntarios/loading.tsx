export default function VoluntariosLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-40 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-56 mb-8" />
      <div className="h-10 bg-gray-100 rounded-lg w-64 mb-6" />
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-100" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 border-b border-gray-50 last:border-0" />
        ))}
      </div>
    </div>
  );
}
