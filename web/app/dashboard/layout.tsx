import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();

  if (profile?.role !== "owner") {
    redirect("/login?error=owner-only");
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <DashboardNav fullName={profile.full_name} />
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
