import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPendingCountAction } from "@/lib/actions/dashboard";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: rawUserData }, pendingCount] = await Promise.all([
    supabase.from("users").select("*, parishes(name)").eq("id", user.id).single(),
    getPendingCountAction(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData = rawUserData as any;
  const parishName = userData?.parishes?.name;

  return (
    <AppShell
      parishName={parishName}
      userName={userData?.name}
      userRole={userData?.role}
      pendingCount={pendingCount}
    >
      {children}
    </AppShell>
  );
}
