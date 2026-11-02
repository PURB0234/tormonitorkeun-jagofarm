"use client";

import { useState, useRef, useEffect } from "react";

type UseGanttInteractionParams = {
    initialMetaWidth?: number;
    initialZoom?: number;
    isBusy?: boolean;
};

export function useGanttInteraction({
    initialMetaWidth = 380,
    initialZoom = 1,
    isBusy = false,
}: UseGanttInteractionParams = {}) {
    const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [metaWidth, setMetaWidth] = useState<number>(initialMetaWidth);
    const [isResizingMeta, setIsResizingMeta] = useState<boolean>(false);
    const resizeStartXRef = useRef<number>(0);
    const resizeStartWidthRef = useRef<number>(initialMetaWidth);

    const [isPanning, setIsPanning] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Escape listener & Body scroll-lock saat Layar Penuh
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isFullscreen]);

    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isFullscreen]);

    // Global listener mouseup agar drag pan tidak nyangkut saat kursor keluar container
    useEffect(() => {
        const onGlobalMouseUp = () => {
            if (isPanning) setIsPanning(false);
        };
        window.addEventListener("mouseup", onGlobalMouseUp);
        return () => window.removeEventListener("mouseup", onGlobalMouseUp);
    }, [isPanning]);

    // Resizing Kolom Metadata
    useEffect(() => {
        if (!isResizingMeta) return;

        const onMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - resizeStartXRef.current;
            const newWidth = Math.min(650, Math.max(260, resizeStartWidthRef.current + delta));
            setMetaWidth(newWidth);
        };

        const onMouseUp = () => {
            setIsResizingMeta(false);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [isResizingMeta]);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizingMeta(true);
        resizeStartXRef.current = e.clientX;
        resizeStartWidthRef.current = metaWidth;
    };

    // Pan X & Y
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if (isBusy) return;
        if ((e.target as HTMLElement).closest("button, .task-bar, .cursor-pointer, .resizer-handle, a, input, select")) return;
        setIsPanning(true);
        setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
        setScrollLeft(containerRef.current?.scrollLeft || 0);
        setStartY(e.pageY - (containerRef.current?.offsetTop || 0));
        setScrollTop(containerRef.current?.scrollTop || 0);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning || !containerRef.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const walkX = (x - startX) * 1.5;
        containerRef.current.scrollLeft = scrollLeft - walkX;

        const y = e.pageY - containerRef.current.offsetTop;
        const walkY = (y - startY) * 1.5;
        containerRef.current.scrollTop = scrollTop - walkY;
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Anti-Scroll Trap Wheel Handler
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (isFullscreen) return;
        const el = containerRef.current;
        if (!el) return;

        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            const canScrollVertically = el.scrollHeight > el.clientHeight + 4;

            if (!canScrollVertically) {
                window.scrollBy({ top: e.deltaY, behavior: "auto" });
                return;
            }

            if (el.scrollTop <= 0 && e.deltaY < 0) {
                window.scrollBy({ top: e.deltaY, behavior: "auto" });
                return;
            }

            const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
            if (isAtBottom && e.deltaY > 0) {
                window.scrollBy({ top: e.deltaY, behavior: "auto" });
                return;
            }
        }
    };

    return {
        zoomLevel,
        setZoomLevel,
        isFullscreen,
        setIsFullscreen,
        metaWidth,
        setMetaWidth,
        isResizingMeta,
        handleResizeStart,
        containerRef,
        isPanning,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleWheel,
    };
}
