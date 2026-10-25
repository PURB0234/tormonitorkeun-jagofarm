export const instant = false;

import { redirect } from "next/navigation";
import AppShell from "@/app/components/layout/AppShell";
import { createClient } from "../lib/supabase/server";
import { getCurrentUserRole } from "../lib/auth/permissions";

export default async function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        redirect("/login");
    }

    const role = await getCurrentUserRole();

    if (!role) {
        redirect("/login");
    }

    return <AppShell role={role}>{children}</AppShell>;
}
