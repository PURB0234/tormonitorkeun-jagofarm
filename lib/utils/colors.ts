export function getDotColor(name?: string | null): string {
    const n = (name || "").toLowerCase();
    if (n.includes("tim")) return "bg-indigo-600";
    if (n.includes("budi")) return "bg-emerald-600";
    if (n.includes("siti")) return "bg-pink-600";
    if (n.includes("ahmad")) return "bg-amber-600";
    if (n.includes("rina")) return "bg-blue-600";
    return "bg-slate-400";
}

export function getBarColor(item: { status: string; tag?: string | null }): string {
    if (item.status === "selesai") {
        return "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600";
    }
    if (item.tag?.toUpperCase() === "PANEN") {
        return "bg-green-600 hover:bg-green-700 text-white border-green-700";
    }
    if (item.tag?.toLowerCase().includes("tim")) {
        return "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700";
    }
    if (item.status === "perlu_update") {
        return "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";
    }
    return "bg-amber-500 hover:bg-amber-600 text-white border-amber-600";
}
