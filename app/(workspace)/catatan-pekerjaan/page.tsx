import CatatanHeader from "./components/CatatanHeader";
import CatatanList from "./components/CatatanList";
import CatatanDetail from "./components/CatatanDetail";
import { createClient } from "@/app/lib/supabase/server";
import CatatanWorkspace from "./components/CatatanWorkspace";

export default async function CatatanPekerjaanPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const { id } = await searchParams;
    const supabase = await createClient();

    // Sesi & role user saat ini
    const { data: { user } } = await supabase.auth.getUser();
    const [profileRes, catatansRes] = await Promise.all([
        supabase
            .from("profiles")
            .select("role, full_name, email")
            .eq("id", user?.id ?? "")
            .maybeSingle(),
        supabase.from("catatan_pekerjaan")
            .select("id, created_at, judul, penanggung_jawab,penanggung_jawab_id, status, lokasi, deskripsi, tautan_eksternal, lampiran_url, lampiran_nama")
            .order("created_at", { ascending: false })
            .limit(100),
    ]);

    const profile = profileRes.data;
    const catatans = catatansRes.data ?? [];

    const currentUser = {
        id: user?.id ?? "",
        role: profile?.role ?? "member",
        name: profile?.full_name || profile?.email?.split("@")[0] || user?.email?.split("@")[0] || "Saya",
    };

    // const { data: catatans } = await supabase
    //     .from("catatan_pekerjaan")
    //     .select("*")
    //     .order("created_at", { ascending: false });

    const activeCatatan = id
        ? catatans?.find((c) => c.id === id) ?? catatans?.[0]
        : catatans?.[0];

    return (
        <main className="max-w-7xl mx-auto space-y-6">
            <CatatanHeader />
            <CatatanWorkspace
                catatans={catatans}
                initialId={id}
                currentUser={currentUser}
            />
            {/* <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7">
                    <CatatanList
                        catatans={catatans ?? []}
                        activeId={activeCatatan?.id}
                        currentUser={currentUser}
                    />
                </div>
                <div className="lg:col-span-5">
                    <CatatanDetail
                        catatan={activeCatatan ?? null}
                        currentUser={currentUser}
                    />
                </div>
            </div> */}
        </main>
    );
}
