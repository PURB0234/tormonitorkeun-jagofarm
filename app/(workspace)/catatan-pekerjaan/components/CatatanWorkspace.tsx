"use client";

import { useState, useMemo } from "react";
import CatatanList, { Catatan } from "./CatatanList";
import CatatanDetail from "./CatatanDetail";
import CatatanHeader, { SortOption } from "./CatatanHeader";

export default function CatatanWorkspace({
    catatans,
    initialId,
    currentUser,
    // activeCount = 0,
}: {
    catatans: Catatan[];
    initialId?: string;
    currentUser: { id: string; role: string; name: string };
    // activeCount?: number;
}) {
    const [selectedId, setSelectedId] = useState(initialId || catatans[0]?.id);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("semua");

    const filteredCatatans = useMemo(() => {
        let result = [...catatans];

        if (sortBy === "status-dikerjakan") {
            result = result.filter((c) => c.status === "dikerjakan");
        } else if (sortBy === "status-selesai") {
            result = result.filter((c) => c.status === "selesai");
        }

        // 1. Filter Pencarian (judul, deskripsi, lokasi, penanggung jawab)
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (c) =>
                    c.judul.toLowerCase().includes(q) ||
                    c.deskripsi?.toLowerCase().includes(q) ||
                    c.lokasi?.toLowerCase().includes(q) ||
                    c.penanggung_jawab?.toLowerCase().includes(q)
            );
        }

        // 2. Sort By
        result.sort((a, b) => {
            if (sortBy === "semua") {
                return 0;
            }
            if (sortBy === "terbaru") {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (sortBy === "terlama") {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            if (sortBy === "status-dikerjakan") {
                if (a.status === b.status) return 0;
                return a.status === "dikerjakan" ? -1 : 1;
            }
            if (sortBy === "status-selesai") {
                if (a.status === b.status) return 0;
                return a.status === "selesai" ? -1 : 1;
            }
            if (sortBy === "petugas") {
                return (a.penanggung_jawab || "").localeCompare(b.penanggung_jawab || "");
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return result;
    }, [catatans, search, sortBy]);

    const activeCatatan =
        filteredCatatans.find((c) => c.id === selectedId) || filteredCatatans[0] || null;

    return (
        <div className="space-y-6">
            <CatatanHeader
                search={search}
                onSearchChange={setSearch}
                sortBy={sortBy}
                onSortChange={setSortBy}
            // activeCount={activeCount}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7">
                    <CatatanList
                        catatans={filteredCatatans}
                        activeId={activeCatatan?.id}
                        currentUser={currentUser}
                        onSelect={(id) => setSelectedId(id)}
                    />
                </div>
                <div className="lg:col-span-5">
                    <CatatanDetail
                        catatan={activeCatatan}
                        currentUser={currentUser}
                    />
                </div>
            </div>
        </div>
    );
}