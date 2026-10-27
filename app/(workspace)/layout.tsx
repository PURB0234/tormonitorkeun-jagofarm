import { redirect } from "next/navigation";
import AppShell from "@/app/components/layout/AppShell";
import { createClient } from "../lib/supabase/server";

export default async function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Cukup 1 query langsung ke profiles
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile?.role) {
        redirect("/login");
    }

    return <AppShell role={profile.role}>{children}</AppShell>;
}
