export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">✝</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Servos</h1>
          <p className="text-primary-200 mt-1 text-sm">Gestão de Voluntários Paroquiais</p>
        </div>
        {children}
      </div>
    </div>
  );
}
