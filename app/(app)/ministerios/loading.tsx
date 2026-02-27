export default function MinistriosLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 bg-gray-200 rounded-lg w-40 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-56" />
        </div>
        <div className="h-10 bg-gray-200 rounded-lg w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-6 h-32"
          />
        ))}
      </div>
    </div>
  );
}
