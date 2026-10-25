
import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

export type UserRole = "admin" | "member";

export async function getCurrentUserRole(): Promise<UserRole | null> {
    const supabase = await createClient();

    // Pastikan pengguna benar-benar login
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return null;
    }

    // Ambil role dari profil pengguna
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || !profile) {
        return null;
    }

    if (profile.role !== "admin" && profile.role !== "member") {
        return null;
    }

    return profile.role as UserRole;
}

export async function requireAdmin(): Promise<void> {
    const role = await getCurrentUserRole();

    if (!role) {
        redirect("/login");
    }

    if (role !== "admin") {
        redirect("/beranda");
    }
}
