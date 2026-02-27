import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Buscar dados do usuário com paróquia
  const { data: rawUserData } = await supabase
    .from("users")
    .select("*, parishes(name)")
    .eq("id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData = rawUserData as any;
  const parishName = userData?.parishes?.name;

  return (
    <AppShell
      parishName={parishName}
      userName={userData?.name}
      userRole={userData?.role}
    >
      {children}
    </AppShell>
  );
}
