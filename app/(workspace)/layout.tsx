export const instant = false;

import { redirect } from "next/navigation";
import AppShell from "@/app/components/layout/AppShell";
import { createClient } from "../lib/supabase/server";

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

    return <AppShell>{children}</AppShell>;
}
