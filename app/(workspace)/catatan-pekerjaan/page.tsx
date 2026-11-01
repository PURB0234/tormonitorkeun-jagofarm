export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/app/lib/supabase/server";
import CatatanWorkspace from "./components/CatatanWorkspace";

export default async function CatatanPekerjaanPage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string; view?: string }>;
}) {
    const { id, view } = await searchParams;
    const supabase = await createClient();

    // Sesi & role user saat ini
    const { data: { user } } = await supabase.auth.getUser();
    const [profileRes, jadwalsRes] = await Promise.all([
        supabase
            .from("profiles")
            .select("role, full_name, email")
            .eq("id", user?.id ?? "")
            .maybeSingle(),
        supabase.from("jadwal_kegiatan")
            .select("*")
            .order("created_at", { ascending: false }),
    ]);

    const profile = profileRes.data;
    
    // Normalisasi: Catatan Pekerjaan menggunakan Single Source of Truth dari jadwal_kegiatan
    const catatans = (jadwalsRes.data ?? []).map((row) => ({
        id: row.id,
        created_at: row.created_at,
        judul: row.nama_kegiatan,
        penanggung_jawab: row.penanggung_jawab_nama,
        penanggung_jawab_id: row.penanggung_jawab_id,
        status: (row.status === "selesai" ? "selesai" : "dikerjakan") as "dikerjakan" | "selesai",
        lokasi: row.lokasi || "Ko+Lab",
        deskripsi: row.catatan || "",
        tautan_eksternal: row.tautan_eksternal || null,
        lampiran_url: row.lampiran_url || null,
        lampiran_nama: row.lampiran_nama || null,
        tag: row.tag || null,
        tanggal: row.tanggal,
        tanggal_selesai: row.tanggal_selesai || row.tanggal,
        waktu_mulai: row.waktu_mulai,
        waktu_selesai: row.waktu_selesai,
    }));

    const currentUser = {
        id: user?.id ?? "",
        role: profile?.role ?? "member",
        name: profile?.full_name || profile?.email?.split("@")[0] || user?.email?.split("@")[0] || "Saya",
    };

    // const { data: catatans } = await supabase
    //     .from("catatan_pekerjaan")
    //     .select("*")
    //     .order("created_at", { ascending: false });

    // const activeCatatan = id
    //     ? catatans?.find((c) => c.id === id) ?? catatans?.[0]
    //     : catatans?.[0];

    return (
        <main className="max-w-7xl mx-auto space-y-6">
            {/* <CatatanHeader /> */}
            <CatatanWorkspace
                catatans={catatans}
                initialId={id}
                initialView={(view as any) || "catatan"}
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
