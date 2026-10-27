"use client";

import { useState } from "react";
import CatatanList, { Catatan } from "./CatatanList";
import CatatanDetail from "./CatatanDetail";

export default function CatatanWorkspace({
    catatans,
    initialId,
    currentUser,
}: {
    catatans: Catatan[];
    initialId?: string;
    currentUser: { id: string, role: string; name: string };
}) {
    const [selectedId, setSelectedId] = useState(initialId || catatans[0]?.id);
    const activeCatatan = catatans.find((c) => c.id === selectedId) || catatans[0] || null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
                <CatatanList
                    catatans={catatans}
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
    );
}
