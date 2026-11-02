export function getDurationInfo(
    startDateStr?: string | null,
    endDateStr?: string | null
) {
    const startStr = String(startDateStr || "").slice(0, 10);
    const endStr = endDateStr ? String(endDateStr).slice(0, 10) : startStr;
    const isMultiDay = Boolean(startStr && endStr && endStr > startStr);

    let daysCount = 1;
    if (isMultiDay) {
        const startMs = new Date(startStr + "T00:00:00").getTime();
        const endMs = new Date(endStr + "T00:00:00").getTime();
        daysCount = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
    }

    return {
        startStr,
        endStr,
        isMultiDay,
        daysCount,
    };
}
